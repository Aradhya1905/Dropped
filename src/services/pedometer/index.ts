/**
 * pedometer — the only module that touches the device step-counter sensor
 * (Android `TYPE_STEP_COUNTER`, iOS Core Motion `CMPedometer`), via
 * `@dongminyu/react-native-step-counter`. Exposes a tiny, provider-agnostic
 * surface so features never import the sensor SDK directly.
 *
 * This is a deliberately light, "fun stat" counter — not a health integration.
 * It counts steps *live, while the app is in the foreground* and buffers them
 * locally, keyed by the device's calendar day (MMKV, via services/storage),
 * then syncs the day-tagged deltas to the backend. The server owns the displayed
 * total and its scope (day / month / lifetime). No background service and no
 * historical backfill: steps taken while the app is closed are not counted,
 * which is fine for the Trail's "look how far you've wandered" receipt.
 *
 * Everything degrades to a no-op when the sensor is missing, the native module
 * isn't linked, or the user denies motion access. The app must never crash
 * because steps are unavailable.
 */
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import type { EventSubscription } from 'react-native';

import { postDeviceSteps } from '../api';
import { getStepState, setStepState } from '../storage';

/** Max day-entries to sync per request (matches the backend's cap). */
const MAX_SYNC_DAYS = 60;

/** 'YYYY-MM-DD' local-day key for a date (defaults to now). */
function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ── live counting ────────────────────────────────────────────────────────────

let subscription: EventSubscription | null = null;
// Steps reported at the previous sensor event this session. `null` until the
// first event establishes a baseline — so we never mistake a cumulative
// since-boot reading for a giant delta.
let sessionBase: number | null = null;
// Set by requestPermission(): whether the sensor is usable. Gates counting and
// syncing so we never spin on an unsupported device.
let available = false;

/** Whether step counting is permitted and supported on this device. */
export function isAvailable(): boolean {
  return available;
}

/** Add a step delta to today's local unsynced buffer. */
function bufferSteps(delta: number): void {
  if (delta <= 0) return;
  const state = getStepState();
  const key = dayKey();
  setStepState({
    pending: { ...state.pending, [key]: (state.pending[key] ?? 0) + delta },
  });
}

/**
 * Ask the OS for motion access. On Android this is the runtime
 * ACTIVITY_RECOGNITION permission; on iOS Core Motion prompts on first use
 * (governed by NSMotionUsageDescription), so we only confirm the sensor exists.
 * Returns false on any failure so callers degrade gracefully.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      );
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        available = false;
        return false;
      }
    }
    const { isStepCountingSupported } = require('@dongminyu/react-native-step-counter');
    const { supported } = await isStepCountingSupported();
    available = Boolean(supported);
    return available;
  } catch (e) {
    console.log('[Pedometer] permission/support check failed', e);
    available = false;
    return false;
  }
}

/**
 * Confirm motion access *without prompting* — for app-start, where surfacing a
 * permission dialog would be jarring. On Android this is a silent
 * ACTIVITY_RECOGNITION check; the actual request lives in the onboarding
 * Location screen (see requestPermission). Sets `available` and returns it.
 */
export async function ensureAvailableSilently(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      );
      if (!granted) {
        available = false;
        return false;
      }
    }
    const { isStepCountingSupported } = require('@dongminyu/react-native-step-counter');
    const { supported } = await isStepCountingSupported();
    available = Boolean(supported);
    return available;
  } catch (e) {
    console.log('[Pedometer] silent availability check failed', e);
    available = false;
    return false;
  }
}

/**
 * Begin counting steps from now, buffering live deltas into today's local
 * bucket. Idempotent — a second call is a no-op until stop.
 */
export function startCounting(): void {
  if (subscription) return;
  sessionBase = null;
  try {
    const { startStepCounterUpdate } = require('@dongminyu/react-native-step-counter');
    subscription = startStepCounterUpdate(new Date(), (data: { steps: number }) => {
      const total = data?.steps ?? 0;
      // First event of the session just sets the baseline.
      if (sessionBase === null) {
        sessionBase = total;
        return;
      }
      const delta = total - sessionBase;
      sessionBase = total;
      bufferSteps(delta); // ignores <= 0 (counter reset / no movement)
    });
  } catch (e) {
    console.log('[Pedometer] startCounting failed', e);
  }
}

/** Stop the live counter. Safe to call when not counting. */
export function stopCounting(): void {
  try {
    subscription?.remove?.();
    const { stopStepCounterUpdate } = require('@dongminyu/react-native-step-counter');
    stopStepCounterUpdate();
  } catch (e) {
    console.log('[Pedometer] stopCounting failed', e);
  }
  subscription = null;
  sessionBase = null;
}

/**
 * Sync the buffered, day-tagged step deltas to the backend. No-op when nothing
 * is pending or the sensor is unavailable. On success, subtracts exactly what
 * was sent (re-reading first, so steps counted mid-request aren't lost); on
 * failure the buffer is left intact to retry on the next flush.
 */
export async function flushSteps(): Promise<void> {
  if (!available) return;
  const { pending } = getStepState();
  const entries = Object.entries(pending)
    .filter(([, n]) => n > 0)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest day first
    .slice(0, MAX_SYNC_DAYS)
    .map(([day, delta]) => ({ day, delta }));
  if (entries.length === 0) return;
  try {
    await postDeviceSteps(entries);
    const current = getStepState().pending;
    const next: Record<string, number> = { ...current };
    for (const { day, delta } of entries) {
      const remaining = (next[day] ?? 0) - delta;
      if (remaining > 0) next[day] = remaining;
      else delete next[day];
    }
    setStepState({ pending: next });
  } catch (e) {
    console.log('[Pedometer] flushSteps failed', e);
  }
}

/**
 * Wire step counting to the app lifecycle: count and sync whenever the app is
 * in the foreground, stopping (and flushing) when it backgrounds. Call once
 * from the app shell; returns a teardown function. Steps accrue during the
 * whole drop→walk→reveal loop, not just on the Trail.
 *
 * Does NOT prompt for permission — that happens once in onboarding (the Location
 * screen). At app start we only check the grant silently; if motion access was
 * never granted, counting stays a no-op until it is.
 */
export function initStepCounting(): () => void {
  const begin = async () => {
    if (!available) await ensureAvailableSilently();
    if (available) {
      startCounting();
      flushSteps().catch(() => {});
    }
  };
  begin();
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') {
      begin();
    } else {
      stopCounting();
      flushSteps().catch(() => {});
    }
  });
  return () => {
    sub.remove();
    stopCounting();
  };
}
