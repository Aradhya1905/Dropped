/**
 * walkEngine — the composition root for "the app noticed you walking past
 * something while it was in your pocket".
 *
 * Everything else in this feature is deliberately inert: `backgroundWatch` only
 * knows about GPS, `producer.decide` is a pure function, the notifee adapter
 * only knows how to display. This module is the one place where a real fix
 * turns into a real notification, and it lives outside the React tree because
 * the whole point is to keep working after the tree unmounts.
 *
 * It is also the only scheduler of notifications in the app. If a second thing
 * ever calls `notifications.notifyNearbySecret`, the user's settings stop being
 * a reliable description of what the app does.
 */
import { fetchNearbyDrops } from '../api';
import { apiSecretToSecret } from '../api/mappers';
import {
  disableBackground,
  enableBackground,
  getLastFix,
  hasBackgroundPermission,
  isBackgroundEnabled,
  requestBackgroundPermission,
  setCadence,
  subscribe,
} from '../location/backgroundWatch';
import { notifications } from '../notifications';
import {
  decide,
  shouldPoll,
  type NotificationGate,
  type ProducerState,
} from '../notifications/producer';
import {
  getBackgroundWalkEnabled,
  getMoodFilter,
  getNotificationMode,
  getProducerState,
  getSeenIds,
  setBackgroundWalkEnabled,
  setProducerState,
} from '../storage';
import type { Coordinate, Secret } from '../../types';
import type { PermissionStatus } from '../location';

/**
 * How far around the walker we ask the server about. Comfortably wider than the
 * producer's notify radius so a fix arriving mid-stride still has the drop it's
 * about to reach in the list.
 */
const FETCH_RADIUS_M = 600;

/** Inside this distance the GPS is driven hard — meters start to matter. */
const CLOSE_M = 250;

/**
 * The gate this engine consults. Defaults to the notification-mode switch that
 * exists today; FUN_TODOs/13 replaces it with the full one (quiet hours,
 * movement, radius, mood subscriptions, privacy zones) via
 * {@link setNotificationGate}.
 *
 * Kept as a single mutable slot rather than a list on purpose: two gates means
 * "why didn't it fire?" has two answers.
 */
let gate: NotificationGate = () =>
  getNotificationMode() === 'hum'
    ? { allowed: true }
    : { allowed: false, reason: 'notifications-off' };

/**
 * Install the real gate. Call once, at start-up, before the engine runs.
 * Everything that decides whether a hum is allowed belongs behind this
 * function — nothing in this file re-checks a setting the gate already owns.
 */
export function setNotificationGate(next: NotificationGate): void {
  gate = next;
}

/**
 * Is this coordinate inside one of the user's privacy zones?
 *
 * Checked at the **capture** layer — before the fix is sent anywhere — because
 * a zone has to suppress the network call, not just the notification. Filtering
 * on display while still telling the server "I am at home, what's near me?" is
 * the one failure this feature cannot have.
 *
 * Late-bound through {@link setPrivacyZoneCheck} rather than imported so this
 * module doesn't depend on the zone store landing first; the default answers
 * "no zones", which is correct for a device that has never set one.
 */
let insideZone: (c: Coordinate) => boolean = () => false;

/** Wire in `location/privacyZones.isInsideAnyZone`. Call once at start-up. */
export function setPrivacyZoneCheck(check: (c: Coordinate) => boolean): void {
  insideZone = check;
}

let unsubscribeWatch: (() => void) | null = null;
let unsubscribePress: (() => void) | null = null;
let polling = false;

/** Last decision, exported for the walk screen's debug readout and for tests. */
let lastReason: string | null = null;
export function getLastDecisionReason(): string | null {
  return lastReason;
}

async function nearbyFor(fix: Coordinate): Promise<Secret[]> {
  const { secrets } = await fetchNearbyDrops(
    fix.lat,
    fix.lng,
    FETCH_RADIUS_M,
    getMoodFilter(),
  );
  return secrets.map(apiSecretToSecret);
}

function persist(state: ProducerState): void {
  try {
    setProducerState(state);
  } catch {
    // A failed MMKV write must not take the background thread down with it.
    // Worst case the cooldown is re-read from an older value next time.
  }
}

/**
 * One pass: fetch what's around this fix, ask the producer, hum if it says so.
 *
 * Guarded against overlapping runs — GPS can deliver a burst of fixes faster
 * than a round trip completes, and two in-flight passes would race on the
 * dedupe state and hum twice about the same drop.
 */
async function onFix(fix: Coordinate): Promise<void> {
  if (polling) return;

  // Before anything else, and before the fix leaves the device.
  if (insideZone(fix)) {
    lastReason = 'privacy-zone';
    return;
  }

  const state = getProducerState();
  if (!shouldPoll(fix, state)) return;

  polling = true;
  try {
    const nearby = await nearbyFor(fix);

    // Drive the GPS harder only while something is actually close, then let it
    // fall back. This is the difference between a background feature people
    // keep and a battery complaint.
    const nearest = nearby.reduce(
      (min, s) => Math.min(min, s.distanceMeters ?? Number.POSITIVE_INFINITY),
      Number.POSITIVE_INFINITY,
    );
    setCadence(nearest <= CLOSE_M ? 'high' : isBackgroundEnabled() ? 'low' : 'normal');

    const decision = decide({
      fix,
      nearby,
      state,
      now: Date.now(),
      gate,
      revealedIds: getSeenIds(),
    });
    lastReason = decision.reason;
    persist(decision.state);

    if (decision.fire) {
      await notifications.notifyNearbySecret({
        secretId: decision.fire.id,
        distanceM: decision.distanceM,
        near: fix,
      });
    }
  } catch {
    // Offline, a 500, a denied fix — none of them are worth surfacing from a
    // background pass. The next fix tries again.
    lastReason = 'error';
  } finally {
    polling = false;
  }
}

/**
 * Start the engine. Idempotent; safe to call on every app start.
 *
 * Two things must both be true before the app watches with the screen off: the
 * user asked for it, and the OS still agrees. The OS grant is re-checked here
 * rather than trusted from storage because it can be revoked in Settings while
 * the app isn't looking, and an app that keeps *believing* it has background
 * location is exactly the kind of thing this product must never be.
 */
/**
 * Start consuming fixes. Only ever called once background walking is actually
 * on: subscribing unconditionally would hold the GPS watch open — and poll
 * `/drops/nearby` every 40 m — for a feature the user hasn't asked for. With
 * the app open the map already shows what's around; the hum is for the pocket.
 */
function attach(): void {
  if (unsubscribeWatch) return;
  unsubscribeWatch = subscribe(fix => {
    // `onFix` swallows its own failures; the catch is belt and braces so a
    // rejection can never surface as an unhandled promise on a walk.
    onFix(fix.coordinate).catch(() => {});
  });
}

function detach(): void {
  unsubscribeWatch?.();
  unsubscribeWatch = null;
}

export async function startWalkEngine(): Promise<void> {
  if (!unsubscribePress) {
    unsubscribePress = notifications.onNotificationPress(openSecret);
  }

  // A hum that launched the app from cold: notifee reports it once, here.
  const initial = await notifications.getInitialSecretId();
  if (initial) openSecret(initial);

  const wanted = getBackgroundWalkEnabled();
  const allowed = wanted && (await hasBackgroundPermission());

  if (allowed) {
    enableBackground();
    attach();
    await notifications.startWalkService();
  } else {
    if (wanted) {
      // Permission was revoked behind our back. Forget the intent too, so the
      // You screen shows the truth instead of a switch that does nothing.
      setBackgroundWalkEnabled(false);
    }
    detach();
    disableBackground();
    await notifications.stopWalkService();
  }
}

/** Stop watching and drop every subscription. */
export async function stopWalkEngine(): Promise<void> {
  detach();
  unsubscribePress?.();
  unsubscribePress = null;
  disableBackground();
  await notifications.stopWalkService();
}

/**
 * Turn background walking on or off — the action behind the settings switch.
 *
 * Returns what actually happened, which is not always what was asked: the OS
 * dialog can be denied, and on Android a second denial is permanent
 * (`blocked`), so the caller has to be able to say "open Settings" instead of
 * silently leaving a switch on.
 */
export async function setBackgroundWalk(
  on: boolean,
): Promise<{ enabled: boolean; permission: PermissionStatus }> {
  if (!on) {
    setBackgroundWalkEnabled(false);
    disableBackground();
    await notifications.stopWalkService();
    return { enabled: false, permission: 'denied' };
  }

  const already = await hasBackgroundPermission();
  const permission = already ? 'granted' : await requestBackgroundPermission();
  if (permission !== 'granted') {
    setBackgroundWalkEnabled(false);
    return { enabled: false, permission };
  }

  setBackgroundWalkEnabled(true);
  enableBackground();
  await notifications.startWalkService();

  // Don't make the first hum wait for the next fix; if we already have one,
  // check this spot now.
  const fix = getLastFix();
  if (fix) onFix(fix.coordinate).catch(() => {});

  return { enabled: true, permission };
}

// --- taps --------------------------------------------------------------------

/**
 * Where a tapped hum goes. Late-bound through a setter rather than imported so
 * this service never reaches into `app/navigation` — the wiring is done once in
 * the app shell.
 */
let openSecretHandler: ((secretId: string) => void) | null = null;

export function setSecretOpener(open: (secretId: string) => void): void {
  openSecretHandler = open;
}

function openSecret(secretId: string): void {
  openSecretHandler?.(secretId);
}
