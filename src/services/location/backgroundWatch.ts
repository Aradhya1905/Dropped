/**
 * backgroundWatch — the app's **one** GPS watch, owned outside the React tree.
 *
 * `LocationProvider` unmounts when the app is backgrounded, so anything that
 * has to keep noticing the walk with the screen off cannot live in a component.
 * This module is that owner: a module-level singleton every consumer subscribes
 * to, foreground and background alike.
 *
 * Two rules it exists to enforce:
 *
 * 1. **Exactly one underlying watch, ever.** Fog of war, warmth haptics, the
 *    compass and the walk-by producer all want the stream; four
 *    `Geolocation.watchPosition` calls would be four GPS duty cycles and one
 *    one-star review about battery. `subscribe()` is refcounted — the hardware
 *    watch starts on the first subscriber and stops after the last one leaves.
 * 2. **Backgrounding is a hold, not a subscriber.** `enableBackground()` keeps
 *    the watch alive with zero subscribers, which is precisely the state the
 *    app is in while it sits in someone's pocket.
 *
 * Permission-wise this module only *asks*. Whether the app should be watching
 * at all — quiet hours, notification mode, privacy zones — is decided by the
 * notification gate, never here.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

import { watch, type Fix, type PermissionStatus, type WatchTuning } from './index';

/**
 * How hard the GPS is driven. `low` is the battery-mode cadence from
 * FUN_TODOs/15 and the default while backgrounded with nothing near; `high` is
 * raised deliberately and briefly, while a drop is close enough that meters
 * matter.
 */
export type WalkCadence = 'low' | 'normal' | 'high';

const CADENCE: Record<WalkCadence, WatchTuning> = {
  // Roughly a fix per city block. Enough to notice you entered a
  // neighbourhood, far too coarse to draw fog with.
  low: { distanceFilter: 60, interval: 60_000, fastestInterval: 30_000 },
  normal: { distanceFilter: 15, interval: 15_000, fastestInterval: 5_000 },
  // The reveal radius is 50 m; inside it, 5 m is the difference between "warm"
  // and "open".
  high: { distanceFilter: 5, interval: 2_000, fastestInterval: 1_000 },
};

type Listener = (fix: Fix) => void;

const listeners = new Set<Listener>();
let stopWatch: (() => void) | null = null;
let backgroundHold = false;
let cadence: WalkCadence = 'normal';
let lastFix: Fix | null = null;

function tuningFor(c: WalkCadence): WatchTuning {
  return {
    ...CADENCE[c],
    // iOS only, and deliberately on: the blue location bar is the honest
    // signal that this app is watching while you can't see it.
    showsBackgroundLocationIndicator: true,
  };
}

function startIfNeeded(): void {
  // The battery guard. Already running means already running — never a second
  // watchPosition.
  if (stopWatch) return;
  stopWatch = watch(
    fix => {
      lastFix = fix;
      // Copy first: a listener may unsubscribe from inside its own callback.
      for (const l of [...listeners]) l(fix);
    },
    () => {
      // A GPS error is not a reason to tear the watch down — the OS retries,
      // and consumers keep their last known fix. Errors while backgrounded
      // have nowhere to be shown anyway.
    },
    tuningFor(cadence),
  );
}

function stopIfIdle(): void {
  if (listeners.size > 0 || backgroundHold) return;
  stopWatch?.();
  stopWatch = null;
}

/**
 * Listen to the walk. Returns an unsubscribe.
 *
 * The underlying watch starts on the first subscriber; a subscriber leaving
 * only stops it if nothing else — including a background hold — still wants it.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  startIfNeeded();
  return () => {
    listeners.delete(listener);
    stopIfIdle();
  };
}

/** The most recent fix, or `null` before the first one. */
export function getLastFix(): Fix | null {
  return lastFix;
}

/**
 * Keep watching with the app closed. Idempotent.
 *
 * Callers must have `always` permission first — this does not ask, because the
 * ask has to happen in context with an explanation, not as a side effect of
 * some screen mounting. See {@link requestBackgroundPermission}.
 */
export function enableBackground(): void {
  backgroundHold = true;
  startIfNeeded();
}

/** Release the background hold. The watch survives if screens still want it. */
export function disableBackground(): void {
  backgroundHold = false;
  stopIfIdle();
}

export function isBackgroundEnabled(): boolean {
  return backgroundHold;
}

/** Whether a hardware watch is currently running. */
export function isRunning(): boolean {
  return stopWatch !== null;
}

export function getCadence(): WalkCadence {
  return cadence;
}

/**
 * Change how hard the GPS is driven. Restarts the watch in place when it is
 * already running — the SDK bakes its options in at `watchPosition` time — and
 * no-ops when the cadence hasn't actually changed, so calling this on every fix
 * (which the producer does) is free.
 */
export function setCadence(next: WalkCadence): void {
  if (next === cadence) return;
  cadence = next;
  if (!stopWatch) return;
  stopWatch();
  stopWatch = null;
  startIfNeeded();
}

/** Tear everything down. For tests and the panic wipe. */
export function resetBackgroundWatch(): void {
  listeners.clear();
  backgroundHold = false;
  cadence = 'normal';
  lastFix = null;
  stopWatch?.();
  stopWatch = null;
}

// --- "allow all the time" ----------------------------------------------------

/**
 * Whether background location is already granted. Never prompts.
 *
 * Below API 29 Android has no separate background grant — the foreground one
 * already covers it — so the fine-location check is the honest answer there.
 */
export async function hasBackgroundPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS has no silent authorization probe through this SDK. Assume not
    // granted and let the caller's in-context prompt ask; a redundant ask on
    // iOS resolves instantly when the user has already said yes.
    return false;
  }
  if (Number(Platform.Version) < 29) {
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  }
  return PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  );
}

/**
 * Ask for "allow all the time".
 *
 * **Android forces this into its own dialog, after the fine-location grant.**
 * It cannot be bundled with the first prompt, and on API 30+ the OS doesn't
 * even show a dialog — it sends the user to app settings. So this must only be
 * called from an in-context prompt that has already explained *why*: a cold ask
 * gets denied, and a denial here is effectively permanent (`blocked`).
 */
export async function requestBackgroundPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    const result = await Geolocation.requestAuthorization('always');
    switch (result) {
      case 'granted':
        return 'granted';
      case 'restricted':
      case 'disabled':
        return 'blocked';
      default:
        return 'denied';
    }
  }

  if (Number(Platform.Version) < 29) return 'granted';

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  );
  switch (result) {
    case PermissionsAndroid.RESULTS.GRANTED:
      return 'granted';
    case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
      return 'blocked';
    default:
      return 'denied';
  }
}
