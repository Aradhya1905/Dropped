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
 * It is the app's only *producer* of walk-by hums, and it is not the thing that
 * decides whether one is allowed: every hum leaves through
 * `notifications.humNearbySecret`, which owns the gate and the cooldown. This
 * module never calls `notifications.notifyNearbySecret` and never re-checks a
 * setting the gate already reads.
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
import { isSustainedMovement, type TimedFix } from '../location/movement';
import { isInsideAnyZone } from '../location/privacyZones';
// `notifications` is used only for the foreground service and notification
// taps. The hum itself goes through `humNearbySecret` — see the header.
import { humNearbySecret, notifications } from '../notifications';
import {
  decide,
  markChecked,
  openGate,
  shouldPoll,
  type NotificationGate,
  type ProducerState,
} from '../notifications/producer';
import {
  getBackgroundWalkEnabled,
  getMoodFilter,
  getPrivacyZones,
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
 * How far back movement is judged over.
 *
 * Wider than `movement.DEFAULT_WINDOW_MS` (one minute) because the background
 * cadence deliberately emits a fix roughly once a minute — a one-minute window
 * would never hold the three fixes `isSustainedMovement` needs, so every hum
 * would be suppressed as `not-moving` and the feature would look broken rather
 * than strict.
 */
const MOVEMENT_WINDOW_MS = 5 * 60_000;

/**
 * The gate slot.
 *
 * **The real gate is `notifications/gate.shouldNotify`, reached through
 * `humNearbySecret`** — quiet hours, only-when-moving, notify radius, mood
 * subscriptions, privacy zones and the cooldown all live there, and this module
 * re-checks none of them. What is left here is an override seam for tests and
 * for a future caller that needs to suppress a candidate *before* the hum path
 * is entered; it defaults to permissive precisely so it cannot become a second
 * opinion about the user's settings.
 */
let gate: NotificationGate = openGate;

/** Override the pre-hum filter. Tests only — the user's settings live in the gate. */
export function setNotificationGate(next: NotificationGate): void {
  gate = next;
}

/**
 * Is this coordinate inside one of the user's privacy zones?
 *
 * Asked at the **capture** layer — before the fix is sent anywhere — because a
 * zone has to suppress the network call, not just the notification. Telling the
 * server "I am at home, what's near me?" and then declining to notify is the one
 * failure this feature cannot have. `humNearbySecret` asks the same question
 * again later; that duplication is deliberate, since the two checks defend
 * different things (the request, and the notification).
 */
let insideZone: (c: Coordinate) => boolean = c => {
  const zones = getPrivacyZones();
  return zones.length > 0 && isInsideAnyZone(c, zones);
};

/** Override the zone check. Tests only. */
export function setPrivacyZoneCheck(check: (c: Coordinate) => boolean): void {
  insideZone = check;
}

/**
 * Recent fixes, for the "are they actually walking?" question the gate asks.
 * Kept here rather than in `backgroundWatch` because it is the only consumer,
 * and trimmed on every write so a long walk can't grow it without bound.
 */
let recentFixes: TimedFix[] = [];

export function rememberFix(coordinate: Coordinate, at: number): void {
  recentFixes = [...recentFixes, { at, coordinate }].filter(
    f => at - f.at <= MOVEMENT_WINDOW_MS,
  );
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

    const now = Date.now();
    const decision = decide({
      fix,
      nearby,
      state,
      now,
      gate,
      revealedIds: getSeenIds(),
      // The cooldown belongs to the gate, which persists its own clock
      // (`humLastFiredAt`). A second one here would silently double the
      // interval the user thinks they set.
      cooldownMs: 0,
    });

    if (!decision.fire) {
      lastReason = decision.reason;
      persist(decision.state);
      return;
    }

    // The single exit to the OS. Every lever the user set is read inside this
    // call; nothing above it re-implements one.
    const verdict = await humNearbySecret({
      secretId: decision.fire.id,
      distanceM: decision.distanceM,
      near: fix,
      at: fix,
      mood: decision.fire.mood,
      isMoving: isSustainedMovement(recentFixes, { windowMs: MOVEMENT_WINDOW_MS }),
      now,
    });
    lastReason = verdict;

    // Only a hum that actually fired burns the drop. A candidate the gate
    // refused — quiet hours, too far, wrong mood — has to stay eligible, or
    // one silent night would cost the user every drop they walked past in it.
    persist(verdict === 'fire' ? decision.state : markChecked(state, fix));
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
    // Remembered before the early returns below, so the movement window keeps
    // filling even while nothing is worth polling for.
    rememberFix(fix.coordinate, Date.now());
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
