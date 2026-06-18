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
 * Locally-counted steps for the Trail "steps this month" stat. The pedometer
 * service accumulates live sensor deltas into the current month's bucket; the
 * `month` key ('YYYY-MM') lets it reset automatically when the month rolls over.
 */
export interface StepState {
  month: string;
  steps: number;
}

export const EMPTY_STEP_STATE: StepState = { month: '', steps: 0 };

/** Map visual style (the "layers" toggle on the Map screen). */
export type MapStyle = 'paper' | 'satellite' | 'dark';

/** Quiet-hum notification setting from the You screen. */
export type NotificationMode = 'off' | 'hum';

export const DEFAULT_MAP_STYLE: MapStyle = 'paper';
export const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'off';
