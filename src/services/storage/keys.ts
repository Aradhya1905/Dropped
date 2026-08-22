/** MMKV key names. Kept in one place so persisted keys never drift. */
export const StorageKeys = {
  deviceId: 'device.id',
  onboardingComplete: 'onboarding.complete',
  savedSecretIds: 'secrets.saved',
  seenSecretIds: 'secrets.seen',
  mapStyle: 'settings.mapStyle',
  notificationMode: 'settings.notificationMode',
  stepState: 'steps.state',
  lastCoord: 'location.last',
  composerDraft: 'drop.draft',
  hapticsEnabled: 'settings.haptics',
} as const;

/** The composer's unsent confession, restored if the app dies mid-write. */
export interface ComposerDraft {
  body: string;
  mood: string;
  /** ms epoch of the last keystroke — lets us expire very stale drafts. */
  updatedAt: number;
}

/** Drafts older than this are dropped rather than resurrected. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

/** Hard cap on a confession's length (enforced in the composer). */
export const DROP_MAX_CHARS = 500;

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
