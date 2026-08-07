/**
 * haptics — the only module that touches the vibration motor, via
 * `react-native-haptic-feedback`. Features never import that SDK directly; they
 * ask for one of three semantic kinds and this adapter decides what that feels
 * like on the current platform.
 *
 * Everything degrades to silence: if the native module isn't linked yet (a JS
 * install without a rebuild), we fall back to RN's `Vibration` on Android — iOS
 * ignores the duration argument there and would fire a 400 ms buzz for a
 * 12 ms tick, so on iOS a missing native module simply means no haptics.
 *
 * The whole surface is gated by one in-memory flag mirrored from MMKV, so the
 * user's haptics-off setting is total — see `initHaptics` / `setHapticsEnabled`.
 */
import { Platform, Vibration } from 'react-native';

import { getHapticsEnabled, setHapticsEnabled as persistEnabled } from '../storage';

/**
 * What a haptic means, not what it is:
 * - `tick`  — faint, "something is out there" (the cold end of the warmth bands)
 * - `thump` — a felt pulse, "you're closing in"
 * - `snap`  — one hard hit, reserved for a server-confirmed reveal
 */
export type HapticKind = 'tick' | 'thump' | 'snap';

/** Kind → the vendor's feedback type. */
const NATIVE_TYPE: Record<HapticKind, string> = {
  tick: 'clockTick',
  thump: 'impactMedium',
  snap: 'impactHeavy',
};

/** Kind → `Vibration` fallback duration in ms (Android only). */
const FALLBACK_MS: Record<HapticKind, number> = {
  tick: 12,
  thump: 28,
  snap: 60,
};

// `enableVibrateFallback` covers iOS devices with no Taptic Engine.
// `ignoreAndroidSystemSettings: false` means a phone with system haptics off
// stays silent — the OS setting outranks ours.
const OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

let enabled = true;

// `undefined` = not looked up yet, `null` = looked up and unavailable.
type NativeHaptics = { trigger: (type: string, options?: object) => void };
let native: NativeHaptics | null | undefined;

function nativeHaptics(): NativeHaptics | null {
  if (native !== undefined) {
    return native;
  }
  try {
    const mod = require('react-native-haptic-feedback');
    const candidate = (mod?.default ?? mod) as NativeHaptics | undefined;
    native = typeof candidate?.trigger === 'function' ? candidate : null;
  } catch (e) {
    console.log('[Haptics] native module unavailable', e);
    native = null;
  }
  return native;
}

/** Whether haptics are currently allowed to fire. */
export function isEnabled(): boolean {
  return enabled;
}

/**
 * Turn haptics on/off for this session only. Prefer `setHapticsEnabled`, which
 * also persists; this exists for tests and for callers that already own the
 * persisted value.
 */
export function setEnabled(on: boolean): void {
  enabled = on;
}

/** Persist the user's haptics preference and apply it immediately. */
export function setHapticsEnabled(on: boolean): void {
  persistEnabled(on);
  enabled = on;
}

/** Apply the persisted haptics preference. Call once from the app shell. */
export function initHaptics(): void {
  enabled = getHapticsEnabled();
}

/**
 * Fire one haptic. Silent when disabled, when the kind is unknown, or when the
 * device has nothing to fire it with — never throws, so no caller has to guard.
 */
export function trigger(kind: HapticKind): void {
  if (!enabled) {
    return;
  }
  const type = NATIVE_TYPE[kind];
  if (!type) {
    return;
  }
  const mod = nativeHaptics();
  try {
    if (mod) {
      mod.trigger(type, OPTIONS);
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(FALLBACK_MS[kind]);
    }
  } catch (e) {
    console.log('[Haptics] trigger failed', e);
  }
}
