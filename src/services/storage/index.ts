/**
 * storage — the only module that touches MMKV. Persists the app's anonymous
 * identity (device id), onboarding flag, saved/seen-secret caches, and
 * settings. Features import these functions, never the MMKV instance.
 */
import { createMMKV } from 'react-native-mmkv';

import {
  DEFAULT_MAP_STYLE,
  DEFAULT_NOTIFICATION_MODE,
  StorageKeys,
  type MapStyle,
  type NotificationMode,
} from './keys';

export type { MapStyle, NotificationMode } from './keys';

const mmkv = createMMKV({ id: 'dropped' });

// --- generic JSON helpers (kept private; don't leak the MMKV instance) -------

function getJSON<T>(key: string, fallback: T): T {
  const raw = mmkv.getString(key);
  if (raw == null) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setJSON(key: string, value: unknown): void {
  mmkv.set(key, JSON.stringify(value));
}

// --- device id (the app's only identity) -------------------------------------

/** RFC4122-ish v4 id without pulling in a uuid dependency. */
function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    /* eslint-disable no-bitwise -- standard uuid-v4 bit twiddling */
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    /* eslint-enable no-bitwise */
    return v.toString(16);
  });
}

/**
 * The anonymous device id. Lazily generated and persisted on first call, then
 * stable for the install's lifetime.
 */
export function getDeviceId(): string {
  const existing = mmkv.getString(StorageKeys.deviceId);
  if (existing) {
    return existing;
  }
  const id = generateDeviceId();
  mmkv.set(StorageKeys.deviceId, id);
  return id;
}

// --- onboarding --------------------------------------------------------------

export function getOnboardingComplete(): boolean {
  return mmkv.getBoolean(StorageKeys.onboardingComplete) ?? false;
}

export function setOnboardingComplete(done: boolean): void {
  mmkv.set(StorageKeys.onboardingComplete, done);
}

// --- saved secrets -----------------------------------------------------------

export function getSavedIds(): string[] {
  return getJSON<string[]>(StorageKeys.savedSecretIds, []);
}

export function addSavedId(id: string): void {
  const next = getSavedIds();
  if (!next.includes(id)) {
    next.push(id);
    setJSON(StorageKeys.savedSecretIds, next);
  }
}

export function removeSavedId(id: string): void {
  const next = getSavedIds().filter(x => x !== id);
  setJSON(StorageKeys.savedSecretIds, next);
}

export function isSaved(id: string): boolean {
  return getSavedIds().includes(id);
}

// --- seen / revealed secrets -------------------------------------------------

export function getSeenIds(): string[] {
  return getJSON<string[]>(StorageKeys.seenSecretIds, []);
}

export function addSeenId(id: string): void {
  const next = getSeenIds();
  if (!next.includes(id)) {
    next.push(id);
    setJSON(StorageKeys.seenSecretIds, next);
  }
}

export function hasSeen(id: string): boolean {
  return getSeenIds().includes(id);
}

// --- settings ----------------------------------------------------------------

export function getMapStyle(): MapStyle {
  return (mmkv.getString(StorageKeys.mapStyle) as MapStyle) ?? DEFAULT_MAP_STYLE;
}

export function setMapStyle(style: MapStyle): void {
  mmkv.set(StorageKeys.mapStyle, style);
}

export function getNotificationMode(): NotificationMode {
  return (
    (mmkv.getString(StorageKeys.notificationMode) as NotificationMode) ??
    DEFAULT_NOTIFICATION_MODE
  );
}

export function setNotificationMode(mode: NotificationMode): void {
  mmkv.set(StorageKeys.notificationMode, mode);
}

/** Test/escape hatch: wipe everything. */
export function clearAll(): void {
  mmkv.clearAll();
}
