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
  moodFilter: 'map.moodFilter',
  echoesEnabled: 'settings.echoes',
  mutedEchoIds: 'echo.muted',
  echoCache: 'echo.cache',
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

/**
 * The map's mood filter. An empty array means "no filter" — every mood shows.
 *
 * Stored as the *selected* moods rather than the hidden ones so that adding a
 * fifth mood later reveals it by default instead of silently hiding it from
 * everyone who ever touched the filter.
 */
export const DEFAULT_MOOD_FILTER: readonly [] = [];

/**
 * Anniversary echoes are **off until asked for**.
 *
 * This is a confessions app. An unrequested "a year ago you stood here" about
 * something painful is not a delightful surprise, and the person it lands on
 * had no chance to decline it. Every other setting here may default to the
 * pleasant option; this one may not.
 */
export const DEFAULT_ECHOES_ENABLED = false;

/**
 * One remembered anniversary, as it survives an app restart.
 *
 * **Note what isn't here: the secret's body.** The app caches only enough to
 * draw a card — which place, which anniversary, which drop — so the confession
 * itself never gets written to disk on a device that merely walked past it. The
 * text is re-fetched (and re-gated) when the card is opened.
 */
export interface EchoMemo {
  secretId: string;
  interval: '6mo' | '1yr' | '2yr';
  kind: 'dropped' | 'found';
  /** ms epoch of the remembered drop / reveal. */
  stoodAt: number;
  placeLabel?: string;
  mood: string;
}

/**
 * The last echo check: where, when, and what came back.
 *
 * Doubles as the polling guard (`utils/echo.echoCheckDue` reads `day`/`lat`/
 * `lng`) and as the cache that lets a cold start show yesterday's card without
 * a request.
 */
export interface EchoCache {
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  lat: number;
  lng: number;
  memos: EchoMemo[];
}
