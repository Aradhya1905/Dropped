/**
 * pedometer — the only module that touches the device step-counter sensor
 * (Android `TYPE_STEP_COUNTER`, iOS Core Motion `CMPedometer`), via
 * `@dongminyu/react-native-step-counter`. Exposes a tiny, provider-agnostic
 * surface so features never import the sensor SDK directly.
 *
 * This is a deliberately light, "fun stat" counter — not a health integration.
 * It counts steps *live, while the app is in the foreground* and accumulates
 * them into the current month's local bucket (MMKV, via services/storage). No
 * Health Connect / HealthKit, no background service, no historical backfill:
 * steps taken while the app is closed are simply not counted, which is fine for
 * the Trail's "look how far you've wandered" receipt.
 *
 * Everything degrades to `null`/no-op when the sensor is missing, the native
 * module isn't linked yet, or the user denies motion access. The app must never
 * crash because steps are unavailable.
 */
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import type { EventSubscription } from 'react-native';

import { getStepState, setStepState } from '../storage';

/** 'YYYY-MM' bucket key for a date (defaults to now). */
function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Current step state, with the month bucket reset if we've rolled over. */
function currentMonthState(): { month: string; steps: number } {
  const state = getStepState();
  const mk = monthKey();
  return state.month === mk ? state : { month: mk, steps: 0 };
}

// ── live counting ────────────────────────────────────────────────────────────

let subscription: EventSubscription | null = null;
// Steps reported at the previous sensor event this session. `null` until the
// first event establishes a baseline — so we never mistake a cumulative
// since-boot reading for a giant delta.
let sessionBase: number | null = null;
// Set by requestPermission(): whether the sensor is usable. Lets the Trail show
// "—" instead of a misleading "0" when motion is denied/unsupported.
let available = false;

/** Whether step counting is permitted and supported on this device. */
export function isAvailable(): boolean {
  return available;
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
 * Begin counting steps from now, accumulating live deltas into this month's
 * bucket. `onUpdate` (optional) receives the running month total after each
 * sensor event, for live UI. Idempotent — a second call is a no-op until stop.
 */
export function startCounting(onUpdate?: (monthSteps: number) => void): void {
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
      if (delta <= 0) return; // counter reset or no movement
      const state = currentMonthState();
      const next = { month: state.month, steps: state.steps + delta };
      setStepState(next);
      onUpdate?.(next.steps);
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
 * Wire step counting to the app lifecycle: request permission once, then count
 * whenever the app is in the foreground and stop when it backgrounds. Call once
 * from the app shell; returns a teardown function. Steps accrue during the
 * whole drop→walk→reveal loop, not just while the Trail is open.
 */
export function initStepCounting(): () => void {
  const begin = async () => {
    if (!available) await requestPermission();
    if (available) startCounting();
  };
  begin();
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') begin();
    else stopCounting();
  });
  return () => {
    sub.remove();
    stopCounting();
  };
}

// ── read ─────────────────────────────────────────────────────────────────────

/** Steps accumulated this calendar month (0 if none / new month). */
export function getStepsThisMonth(): number {
  return currentMonthState().steps;
}
