/** MMKV key names. Kept in one place so persisted keys never drift. */
export const StorageKeys = {
  deviceId: 'device.id',
  onboardingComplete: 'onboarding.complete',
  savedSecretIds: 'secrets.saved',
  seenSecretIds: 'secrets.seen',
  mapStyle: 'settings.mapStyle',
  notificationMode: 'settings.notificationMode',
} as const;

/** Map visual style (the "layers" toggle on the Map screen). */
export type MapStyle = 'paper' | 'satellite' | 'dark';

/** Quiet-hum notification setting from the You screen. */
export type NotificationMode = 'off' | 'hum';

export const DEFAULT_MAP_STYLE: MapStyle = 'paper';
export const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'off';
