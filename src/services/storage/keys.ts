import { MOODS, type Mood } from '../../types';

/** MMKV key names. Kept in one place so persisted keys never drift. */
export const StorageKeys = {
  deviceId: 'device.id',
  deviceIdOverride: 'device.idOverride',
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
  mutedEchoIds: 'echo.muted',
  echoCache: 'echo.cache',
  seals: 'trail.seals',
  privacyZones: 'privacy.zones',
  reports: 'reports.mine',
  onlyWhenMoving: 'settings.onlyWhenMoving',
  quietHours: 'settings.quietHours',
  notifyRadius: 'settings.notifyRadius',
  subscribedMoods: 'settings.subscribedMoods',
  humLastFiredAt: 'notify.lastFiredAt',
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

/**
 * Quiet-hum notification setting from the You screen.
 *
 * - `off`    — never hum.
 * - `rare`   — at most one hum every {@link RARE_COOLDOWN_MS}.
 * - `always` — hum whenever the other gates pass, still throttled by
 *   {@link ALWAYS_COOLDOWN_MS} so a street full of drops is one ping, not ten.
 *
 * The pre-13 value `'hum'` maps onto `'always'` on read — see
 * `getNotificationMode`.
 */
export type NotificationMode = 'off' | 'rare' | 'always';

export const NOTIFICATION_MODES: readonly NotificationMode[] = [
  'off',
  'rare',
  'always',
];

export const DEFAULT_MAP_STYLE: MapStyle = 'dropped';

/**
 * `rare`, not `off` and not `always`.
 *
 * A walking app whose notifications are off is a dead app, so the default can't
 * be silence — but the way people end up turning notifications off is a stream
 * of them, so it can't be `always` either. One hum every few hours is the only
 * default that survives both failure modes.
 */
export const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'rare';

/**
 * A nightly silence window as minutes past local midnight, e.g.
 * `{ startMin: 1320, endMin: 480 }` = 22:00–08:00. Wraps midnight whenever
 * `startMin > endMin`; `null` means the user turned quiet hours off.
 *
 * Local-clock only. Sending this to the server would mean storing a timezone —
 * i.e. teaching the backend when each device sleeps — which is exactly the kind
 * of per-device fact this app declines to hold.
 */
export interface QuietHours {
  startMin: number;
  endMin: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = {
  startMin: 22 * 60,
  endMin: 8 * 60,
};

/**
 * The quiet-hours windows offered on the You screen. Presets rather than a time
 * picker: the app has no date-picker dependency, and every extra tap between a
 * user and "stop waking me up" is a reason to uninstall instead.
 */
export const QUIET_HOURS_PRESETS: readonly (QuietHours | null)[] = [
  DEFAULT_QUIET_HOURS,
  { startMin: 21 * 60, endMin: 9 * 60 },
  { startMin: 23 * 60, endMin: 7 * 60 },
  null,
];

/**
 * "Only hum while I'm actually walking." **On by default** — a notification
 * that fires while you're sitting at your desk is the single reason people turn
 * a walking app's notifications off, and most users will never find this row.
 */
export const DEFAULT_ONLY_WHEN_MOVING = true;

/**
 * How far away a drop may be and still earn a hum. **Not** the reveal radius,
 * which stays {@link REVEAL_RADIUS_M} (50 m) product-wide; this is "how far off
 * do you want to be told". Every option sits inside the backend's
 * `NEARBY_MAX_RADIUS_M` of 2000.
 */
export type NotifyRadiusM = 200 | 500 | 1000;

export const NOTIFY_RADIUS_OPTIONS: readonly NotifyRadiusM[] = [200, 500, 1000];

export const DEFAULT_NOTIFY_RADIUS_M: NotifyRadiusM = 500;

/**
 * Moods worth being interrupted for. Defaults to all four: the point of this
 * lever is that someone who can't take `ache` today can drop that one mood
 * instead of muting the app, so it starts wide and narrows by choice.
 *
 * Stored as the *subscribed* moods, so a fifth mood added later arrives
 * subscribed rather than silently muted for everyone who ever opened the sheet.
 */
export const DEFAULT_SUBSCRIBED_MOODS: readonly Mood[] = MOODS;

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

/**
 * One report this device filed, kept locally so the app can say "you reported
 * this" and show a list of what you've flagged.
 *
 * **Note what isn't here: the secret's body, or the reason text.** A local
 * dossier of the worst things someone has read is not a keepsake — the row
 * exists to stop the button being offered twice and to prove the report went
 * somewhere. The verdict lives on the server; this is only a receipt.
 */
export interface ReportedSecret {
  id: string;
  /** ms epoch of the report. */
  at: number;
  /** Where it was, if the app knew — never the words. */
  placeLabel?: string;
}

/**
 * Cap on remembered reports. Anyone past 200 is not going to scroll them, and
 * the list is a receipt, not an archive.
 */
export const REPORT_CAP = 200;
