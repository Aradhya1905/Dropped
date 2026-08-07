/** MMKV key names. Kept in one place so persisted keys never drift. */
export const StorageKeys = {
  deviceId: 'device.id',
  onboardingComplete: 'onboarding.complete',
  savedSecretIds: 'secrets.saved',
  seenSecretIds: 'secrets.seen',
  mapStyle: 'settings.mapStyle',
  notificationMode: 'settings.notificationMode',
  hapticsEnabled: 'settings.haptics',
  stepState: 'steps.state',
  walkedCells: 'trail.walkedCells',
} as const;

/**
 * Cap on remembered fog cells. ~20k cells ≈ a few hundred km of walking, and
 * the whole set lives in one MMKV string — past this we drop the oldest so the
 * value can't grow without bound. See `getWalkedCells` for the encoding.
 */
export const FOG_CELL_CAP = 20_000;

/**
 * Locally-counted steps not yet synced to the backend. The pedometer service
 * accumulates live sensor deltas into `pending`, keyed by the device's local
 * calendar day ('YYYY-MM-DD'), and clears each day's entry once the backend has
 * accepted it. The server owns the displayed total (and its day/month/lifetime
 * scope) — this is only the unsynced buffer.
 */
export interface StepState {
  pending: Record<string, number>;
}

export const EMPTY_STEP_STATE: StepState = { pending: {} };

/**
 * Map visual style (the "layers" toggle on the Map screen). Mirrors the
 * adapter's `MapStyleKey` so the You screen and the map share one persisted
 * value. Keep in sync with `STYLE_OPTIONS` in `services/maps/maplibreAdapter`.
 */
export type MapStyle = 'dropped' | 'quiet' | 'dark' | 'grayscale';

/** Quiet-hum notification setting from the You screen. */
export type NotificationMode = 'off' | 'hum';

export const DEFAULT_MAP_STYLE: MapStyle = 'dropped';
export const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'off';

/**
 * Warmth haptics on the walk are on by default — they're the point of the
 * feature, and the OS haptics setting still outranks this one.
 */
export const DEFAULT_HAPTICS_ENABLED = true;
