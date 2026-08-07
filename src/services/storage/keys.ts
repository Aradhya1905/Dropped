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
  accurateCompass: 'settings.accurateCompass',
  reducedMotion: 'settings.reducedMotion',
  highContrast: 'settings.highContrast',
  textScale: 'settings.textScale',
  batteryMode: 'settings.batteryMode',
  mutedEchoIds: 'echo.muted',
  echoCache: 'echo.cache',
  seals: 'trail.seals',
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
 *
 * `auto` is a **mode, not a style**: it resolves to `dropped` or `droppedNight`
 * against the sun at the device's coordinate, which is why it lives in the same
 * union — persisting the mode is what lets a manual pick override it later.
 */
export type MapStyle =
  | 'dropped'
  | 'quiet'
  | 'droppedNight'
  | 'dark'
  | 'grayscale'
  | 'auto';

export const MAP_STYLES: readonly MapStyle[] = [
  'dropped',
  'quiet',
  'droppedNight',
  'dark',
  'grayscale',
  'auto',
];

/** Quiet-hum notification setting from the You screen. */
export type NotificationMode = 'off' | 'hum';

export const DEFAULT_MAP_STYLE: MapStyle = 'dropped';
export const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'off';

/**
 * Reduced motion, as an **app-level addition to the OS setting** rather than a
 * replacement for it. `useReducedMotion` ORs the two, so this flag can only ever
 * turn motion off — someone whose phone already asks for reduced motion never
 * has to ask twice, and nobody can accidentally re-enable ambient loops the OS
 * was told to suppress.
 */
export const DEFAULT_REDUCED_MOTION = false;

/**
 * The paper/ink/sage palette is low-contrast *by design* — that softness is the
 * app. High contrast is therefore a whole alternate token set (see
 * `design-system/tokens/colors`), off unless asked for.
 */
export const DEFAULT_HIGH_CONTRAST = false;

/**
 * In-app type boost, applied **on top of** the OS Dynamic Type scale rather
 * than instead of it: someone who has already enlarged system text keeps that
 * and can go further here without touching OS settings.
 */
export type TextScale = 'system' | 'large' | 'largest';

export const DEFAULT_TEXT_SCALE: TextScale = 'system';

export const TEXT_SCALE_MULTIPLIER: Record<TextScale, number> = {
  system: 1,
  large: 1.15,
  largest: 1.3,
};

/**
 * Ceiling on OS × app text scaling. The paper layouts are tight — notes, seals
 * and the passport are drawn to a fixed geometry — and past this multiplier they
 * clip rather than reflow. Capping is the honest failure mode: text that stops
 * growing is still readable; text that grows out of its card is not.
 */
export const MAX_FONT_MULTIPLIER = 1.6;

/**
 * Battery mode: a slower, coarser GPS watch. Off by default because fog of war
 * and warmth haptics both ride the watch, and both feel broken when it lags.
 */
export const DEFAULT_BATTERY_MODE = false;

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
 * The compass lies by default — a needle that only firms up as you close is the
 * feature, not a bug (see FUN_TODOs/12-lying-compass.md).
 *
 * The toggle exists because "search for it visually" is not a game everyone can
 * play. Turning it on returns the exact bearing at every distance, which costs
 * that person nothing except the fiction.
 */
export const DEFAULT_ACCURATE_COMPASS = false;

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
 * A collected wax seal, exactly as it was pressed.
 *
 * Written **once**, at reveal time, and never rewritten — that is the whole
 * contract of the collection (see `features/trail/seals/derive.ts`). Note what
 * isn't here: no body, no coordinate. A seal remembers that you stood
 * somewhere, not what was said there or precisely where.
 */
export interface StoredSeal {
  motif: 'plain' | 'first' | 'worn' | 'city';
  /** The mood the wax is tinted with. */
  tint: string;
  night: boolean;
  /** Stamped on the seal. Only set for a `city` motif. */
  cityLabel?: string;
  /**
   * The drop's city, kept whichever motif won, so "is this a new city?" stays
   * answerable after a first-finder seal has already been pressed there.
   */
  city?: string;
  /** ms epoch of the reveal — the grid's sort order. */
  at: number;
}

/**
 * Cap on remembered seals. A reveal is a walk, so 5k of them is a lifetime of
 * this app; past that the oldest are dropped rather than letting one MMKV
 * string grow forever. Same discipline as {@link FOG_CELL_CAP}.
 */
export const SEAL_CAP = 5_000;

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
