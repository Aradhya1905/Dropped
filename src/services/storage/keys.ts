/** MMKV key names. Kept in one place so persisted keys never drift. */
export const StorageKeys = {
  deviceId: 'device.id',
  onboardingComplete: 'onboarding.complete',
  savedSecretIds: 'secrets.saved',
  seenSecretIds: 'secrets.seen',
  mapStyle: 'settings.mapStyle',
  notificationMode: 'settings.notificationMode',
  stepState: 'steps.state',
} as const;

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

/** Map visual style (the "layers" toggle on the Map screen). */
export type MapStyle = 'paper' | 'satellite' | 'dark';

/** Quiet-hum notification setting from the You screen. */
export type NotificationMode = 'off' | 'hum';

export const DEFAULT_MAP_STYLE: MapStyle = 'paper';
export const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'off';
