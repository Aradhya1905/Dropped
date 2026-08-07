/**
 * storage — the only module that touches MMKV. Persists the app's anonymous
 * identity (device id), onboarding flag, saved/seen-secret caches, and
 * settings. Features import these functions, never the MMKV instance.
 */
import { createMMKV } from 'react-native-mmkv';

import { getNativeUniqueId, nativeIdToUuidV4 } from '../device';
import { MOODS, type Mood } from '../../types';
import {
  DEFAULT_ACCURATE_COMPASS,
  DEFAULT_ECHOES_ENABLED,
  DEFAULT_HAPTICS_ENABLED,
  DEFAULT_MAP_STYLE,
  DEFAULT_MOOD_FILTER,
  DEFAULT_NOTIFICATION_MODE,
  EMPTY_STEP_STATE,
  FOG_CELL_CAP,
  SEAL_CAP,
  StorageKeys,
  type EchoCache,
  type MapStyle,
  type NotificationMode,
  type StepState,
  type StoredSeal,
} from './keys';

export type {
  EchoCache,
  EchoMemo,
  MapStyle,
  NotificationMode,
  StepState,
  StoredSeal,
} from './keys';
export { FOG_CELL_CAP, SEAL_CAP } from './keys';

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
 * The anonymous device id, in uuid-v4 form (what the backend's `X-Device-Id`
 * header expects).
 *
 * Source of truth is the native unique id (Android `ANDROID_ID`), mapped into a
 * stable uuid via `nativeIdToUuidV4`, so it survives an app-data-clear that wipes
 * MMKV. MMKV is only a cache/fallback: if the platform can't supply a native id
 * we fall back to the cached value, then to a freshly generated uuid.
 */
export function getDeviceId(): string {
  const native = getNativeUniqueId();
  if (native && native !== 'unknown') {
    const id = nativeIdToUuidV4(native);
    if (mmkv.getString(StorageKeys.deviceId) !== id) {
      mmkv.set(StorageKeys.deviceId, id);
    }
    return id;
  }

  const cached = mmkv.getString(StorageKeys.deviceId);
  if (cached) {
    return cached;
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

/**
 * Warmth-haptics preference. Read this through `services/haptics`
 * (`initHaptics` / `setHapticsEnabled`) rather than calling it directly, so the
 * adapter's in-memory gate never drifts from what's persisted.
 */
export function getHapticsEnabled(): boolean {
  return mmkv.getBoolean(StorageKeys.hapticsEnabled) ?? DEFAULT_HAPTICS_ENABLED;
}

export function setHapticsEnabled(on: boolean): void {
  mmkv.set(StorageKeys.hapticsEnabled, on);
}

/**
 * The map's mood filter. `[]` = show everything.
 *
 * Unknown values are dropped on read rather than trusted: a downgrade (or a
 * mood retired server-side) would otherwise persist a filter the app can't
 * satisfy, and the user would be left staring at an empty map with no way to
 * tell why.
 */
export function getMoodFilter(): Mood[] {
  const stored = getJSON<unknown>(StorageKeys.moodFilter, DEFAULT_MOOD_FILTER);
  if (!Array.isArray(stored)) {
    return [];
  }
  return stored.filter((m): m is Mood => (MOODS as readonly string[]).includes(m));
}

export function setMoodFilter(moods: Mood[]): void {
  setJSON(StorageKeys.moodFilter, moods);
}

/**
 * Accessibility escape hatch for the lying compass: on, the needle points at
 * the true bearing at every distance. Off (the default) it drifts until you're
 * inside the whisper band. See `features/nearby/hooks/useNeedleWobble`.
 */
export function getAccurateCompass(): boolean {
  return mmkv.getBoolean(StorageKeys.accurateCompass) ?? DEFAULT_ACCURATE_COMPASS;
}

export function setAccurateCompass(on: boolean): void {
  mmkv.set(StorageKeys.accurateCompass, on);
}

/**
 * Notify when the accurate-compass flag flips, so a needle already on screen
 * steadies (or starts drifting) without waiting for the screen to remount.
 */
export function onAccurateCompassChange(listener: () => void): { remove: () => void } {
  return mmkv.addOnValueChangedListener(key => {
    if (key === StorageKeys.accurateCompass) listener();
  });
}

// --- anniversary echoes ------------------------------------------------------

/**
 * Whether "a year ago you stood here" may appear at all. **Off by default** —
 * see `DEFAULT_ECHOES_ENABLED` for why that isn't negotiable.
 */
export function getEchoesEnabled(): boolean {
  return mmkv.getBoolean(StorageKeys.echoesEnabled) ?? DEFAULT_ECHOES_ENABLED;
}

/** Turning echoes off forgets the cached ones too — off should mean gone. */
export function setEchoesEnabled(on: boolean): void {
  mmkv.set(StorageKeys.echoesEnabled, on);
  if (!on) {
    mmkv.remove(StorageKeys.echoCache);
  }
}

/**
 * Drops the user has asked never to be reminded about again.
 *
 * Kept **on the device**, not on the server: a mute is a personal feeling about
 * one memory, and the fewer per-device facts this app stores about who felt
 * what, the smaller the thing anyone could ever be compelled to hand over. The
 * cost is that muting doesn't follow you to a new phone, which is the right
 * trade for a feature whose whole risk is emotional.
 */
export function getMutedEchoIds(): string[] {
  return getJSON<string[]>(StorageKeys.mutedEchoIds, []);
}

export function setEchoMuted(secretId: string, muted: boolean): void {
  const current = getMutedEchoIds();
  const next = muted
    ? current.includes(secretId)
      ? current
      : [...current, secretId]
    : current.filter(id => id !== secretId);
  setJSON(StorageKeys.mutedEchoIds, next);
}

export function isEchoMuted(secretId: string): boolean {
  return getMutedEchoIds().includes(secretId);
}

/**
 * The last echo check — the polling guard and the cold-start cache in one.
 * `null` means the app has never asked (or the user just turned echoes off).
 */
export function getEchoCache(): EchoCache | null {
  const cached = getJSON<EchoCache | null>(StorageKeys.echoCache, null);
  if (!cached || typeof cached.day !== 'string' || !Array.isArray(cached.memos)) {
    return null;
  }
  return cached;
}

export function setEchoCache(cache: EchoCache): void {
  setJSON(StorageKeys.echoCache, cache);
}

/** Forget where and when we last asked (settings wipe / rollback). */
export function clearEchoCache(): void {
  mmkv.remove(StorageKeys.echoCache);
}

// --- steps (locally counted, see pedometer service) --------------------------

export function getStepState(): StepState {
  return getJSON<StepState>(StorageKeys.stepState, EMPTY_STEP_STATE);
}

export function setStepState(state: StepState): void {
  setJSON(StorageKeys.stepState, state);
}

// --- fog of war: cells the user has physically walked through ----------------

/**
 * The walked-cell set is stored as newline-joined ids rather than JSON: cell
 * ids are `${int}:${int}` so they can never contain a newline, and splitting a
 * string beats `JSON.parse`-ing a 20k-element array on every read. Insertion
 * order is preserved in the serialized form so the cap can evict oldest-first.
 *
 * This never leaves the device — the walked path is the one piece of location
 * history the app promises to keep local. See FUN_TODOs/01-fog-of-war.md.
 */
export function getWalkedCells(): Set<string> {
  const raw = mmkv.getString(StorageKeys.walkedCells);
  if (!raw) return new Set();
  return new Set(raw.split('\n'));
}

/**
 * Add cells to the walked set, keeping insertion order and evicting the
 * oldest once past {@link FOG_CELL_CAP}. No-ops when nothing is actually new,
 * so the common case (standing still) costs zero writes.
 */
export function addWalkedCells(ids: string[]): void {
  if (ids.length === 0) return;
  const existing = getWalkedCells();
  const added = ids.filter(id => id.length > 0 && !existing.has(id));
  if (added.length === 0) return;

  // Set preserves insertion order, so this stays oldest-first.
  for (const id of added) existing.add(id);

  let ordered = [...existing];
  if (ordered.length > FOG_CELL_CAP) {
    ordered = ordered.slice(ordered.length - FOG_CELL_CAP);
  }
  mmkv.set(StorageKeys.walkedCells, ordered.join('\n'));
}

/** Forget the walked path entirely (settings wipe / rollback). */
export function clearWalkedCells(): void {
  mmkv.remove(StorageKeys.walkedCells);
}

/**
 * Notify when the walked set changes, so the fog layer repaints as the user
 * walks instead of only when the map region moves.
 */
export function onWalkedCellsChange(listener: () => void): { remove: () => void } {
  return mmkv.addOnValueChangedListener(key => {
    if (key === StorageKeys.walkedCells) listener();
  });
}

// --- collected wax seals -----------------------------------------------------

/**
 * Every seal this device has pressed, keyed by secret id.
 *
 * Dumb storage on purpose: nothing here derives a seal. The derive-once rule
 * lives one layer up in `features/trail/seals`, which is the only caller that
 * should ever reach {@link putSeal} — see that module for why a seal must never
 * be recomputed.
 */
export function getSeals(): Record<string, StoredSeal> {
  const stored = getJSON<unknown>(StorageKeys.seals, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {};
  }
  return stored as Record<string, StoredSeal>;
}

export function getSeal(secretId: string): StoredSeal | null {
  return getSeals()[secretId] ?? null;
}

/**
 * Write a seal. **Never overwrites an existing one** — the immutability of a
 * pressed seal is enforced here as well as by its single caller, because a
 * silent overwrite is exactly the bug that would be impossible to notice.
 */
export function putSeal(secretId: string, seal: StoredSeal): void {
  const seals = getSeals();
  if (seals[secretId]) {
    return;
  }
  seals[secretId] = seal;

  const ids = Object.keys(seals);
  if (ids.length > SEAL_CAP) {
    // Oldest reveal first; a missing `at` sorts as oldest and gets evicted.
    const doomed = ids
      .sort((a, b) => (seals[a].at ?? 0) - (seals[b].at ?? 0))
      .slice(0, ids.length - SEAL_CAP);
    for (const id of doomed) {
      delete seals[id];
    }
  }
  setJSON(StorageKeys.seals, seals);
}

/**
 * Cities this device has already stamped a seal in. Backs the "new city" motif,
 * which is why it reads `city` (recorded on every seal) rather than `cityLabel`
 * (only set when the city motif actually won).
 */
export function getSealCities(): string[] {
  const cities = new Set<string>();
  for (const seal of Object.values(getSeals())) {
    if (seal.city) {
      cities.add(seal.city);
    }
  }
  return [...cities];
}

/** Forget the collection (settings wipe / rollback). */
export function clearSeals(): void {
  mmkv.remove(StorageKeys.seals);
}

/** Test/escape hatch: wipe everything. */
export function clearAll(): void {
  mmkv.clearAll();
}

/** Dev tooling: subscribe to any MMKV write. Returns a remove handle. */
export function onMmkvChange(
  listener: (key: string) => void,
): { remove: () => void } {
  return mmkv.addOnValueChangedListener(listener);
}

/** Dev tooling: read a raw MMKV value as a string (returns undefined if not set or boolean). */
export function getMmkvRaw(key: string): string | boolean | number | undefined {
  return mmkv.getString(key) ?? mmkv.getBoolean(key) ?? mmkv.getNumber(key);
}
