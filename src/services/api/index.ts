/**
 * api — the only module that touches axios. One configured client with the
 * anonymous device id attached to every request, normalized errors, and
 * retry/backoff on idempotent GETs.
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getDeviceId } from '../storage';
import {
  MOODS,
  type Coordinate,
  type EchoInterval,
  type EchoKind,
  type ExpiresInDays,
  type Mood,
  type RevealCondition,
  type Whisper,
} from '../../types';

// Dev server — update to prod URL before release
export const DROPPED_API_URL = 'https://droppeddev.duckdns.org';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

/** Normalized error surfaced to features (never a raw AxiosError). */
export interface ApiError {
  /** HTTP status, or 0 for network/timeout failures. */
  status: number;
  /** Machine code: 'network' | 'timeout' | 'http' | 'unknown'. */
  code: 'network' | 'timeout' | 'http' | 'unknown';
  message: string;
  /** Present on 403 reveal failures — metres from the drop. */
  distanceMeters?: number;
  /**
   * Present on a 403 when you were close enough but the drop's condition did
   * not hold. Mutually exclusive with `distanceMeters`: the server checks
   * distance first, so being too far is never reported as being too early.
   */
  revealCondition?: RevealCondition;
  /**
   * ms epoch when that condition next holds. Absent inside the polar circles,
   * where the next sunset can be months away — render the refusal without a
   * countdown rather than inventing one.
   */
  opensAt?: number;
}

const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(() => resolve(), ms));

function toApiError(err: AxiosError): ApiError {
  if (err.response) {
    const data = err.response.data as
      | {
          message?: string;
          distanceMeters?: number;
          revealCondition?: RevealCondition;
          opensAt?: number;
        }
      | undefined;
    return {
      status: err.response.status,
      code: 'http',
      message: data?.message ?? err.message,
      distanceMeters: data?.distanceMeters,
      revealCondition: data?.revealCondition,
      opensAt: data?.opensAt,
    };
  }
  if (err.code === 'ECONNABORTED') {
    return { status: 0, code: 'timeout', message: 'Request timed out' };
  }
  if (err.request) {
    return { status: 0, code: 'network', message: 'Network unavailable' };
  }
  return { status: 0, code: 'unknown', message: err.message };
}

export const api: AxiosInstance = axios.create({
  baseURL: DROPPED_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the anonymous identity to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set('X-Device-Id', getDeviceId());
  return config;
});

// Retry idempotent GETs with exponential backoff, then normalize the error.
api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const config = err.config as
      | (AxiosRequestConfig & { __retryCount?: number })
      | undefined;

    const isRetriable =
      config?.method?.toLowerCase() === 'get' &&
      // network/timeout or 5xx — not 4xx (client errors won't fix on retry)
      (!err.response || err.response.status >= 500);

    if (config && isRetriable) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** (config.__retryCount - 1));
        return api(config);
      }
    }

    return Promise.reject(toApiError(err));
  },
);

// ── API-boundary types ────────────────────────────────────────────────────────

export interface ApiDrop {
  id: string;
  coordinate: Coordinate;
  placeLabel?: string;
  /** City the drop was left in. Absent from servers predating the constellation. */
  city?: string;
  createdAt: number;
}

export interface ApiSecret {
  id: string;
  body?: string;
  drop: ApiDrop;
  createdAt: number;
  revealCount?: number;
  mood: Mood;
  hearts: number;
  stoodHere: number;
  replyCount: number;
  sealed: boolean;
  saved: boolean;
  hearted: boolean;
  distanceMeters?: number;
  /** ms epoch when the drop fades. Absent = forever. */
  expiresAt?: number;
  /**
   * Mood + a short teaser, sent only for a sealed drop inside the whisper band.
   * Never arrives alongside `body` — by then there is nothing left to whisper.
   */
  whisper?: Whisper;
  /** Whether a share link may point here. Optional: servers predating 07 omit it. */
  shareable?: boolean;
  /**
   * The extra condition guarding this drop. Absent = none, which is also what a
   * server predating 09 sends for every drop.
   */
  revealCondition?: RevealCondition;
}

/**
 * A secret on a trail list: an `ApiSecret` plus when *this* device came to
 * stand there — its reveal, its save, or, for its own drops, the drop itself.
 *
 * Only the trail sends it, because only there is every row this device's own
 * history. The city constellation draws its line in this order; drawing it by
 * the drops' creation dates would draw the order the secrets were written,
 * which is somebody else's story.
 */
export interface ApiTrailSecret extends ApiSecret {
  /** ms epoch. Absent from servers predating the constellation. */
  stoodAt?: number;
}

/**
 * Public metadata for a shared spot (`GET /drops/:id/preview`).
 *
 * The one response shape with **no `body` field at all** — the server's Zod
 * schema cannot emit one. `coordinate` is coarsened server-side to ~3 dp
 * (≈100 m); it is not the point the drop is stored at, and the client must
 * never present it as exact.
 */
export interface ApiDropPreview {
  id: string;
  coordinate: Coordinate;
  placeLabel?: string;
  city?: string;
  mood: Mood;
  createdAt: number;
  revealCount: number;
  expiresAt?: number;
}

/**
 * One anniversary from `GET /drops/echoes` — a place this device stood a round
 * interval ago. The nested secret is sealed unless the device revealed it (or
 * wrote it), exactly like every other response that carries one.
 */
export interface ApiEcho {
  secret: ApiSecret;
  interval: EchoInterval;
  kind: EchoKind;
  stoodAt: number;
}

/**
 * A reply pinned under a drop. The server never serializes authorship — this
 * shape has no `deviceId`, hashed or otherwise. `mine` is the server's answer
 * to "did the requesting device write this?", which is all the UI needs to
 * offer a delete.
 */
export interface ApiReply {
  id: string;
  body: string;
  createdAt: number;
  mine: boolean;
}

/** A walking route from the /route/foot proxy. `available` is false (and the
 * rest null) when no provider could serve it — the client then draws no path. */
export interface ApiFootRoute {
  available: boolean;
  provider: 'ors' | 'mapbox' | null;
  geometry: { type: 'LineString'; coordinates: [number, number][] } | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

/**
 * What `DELETE /devices/me` actually did — the panic wipe's receipt.
 *
 * It is a receipt rather than a 204 because the confirmation has to name real
 * numbers: `deleted` rows are gone, `anonymised` ones survive re-pointed at a
 * shared `'__deleted__'` sentinel device. Drops and replies are deliberately in
 * the second group — a confession somebody else already walked to and read
 * shouldn't vanish out from under them — and the wipe's copy must say so rather
 * than implying everything died.
 */
export interface ApiEraseReceipt {
  deleted: {
    reveals: number;
    saves: number;
    hearts: number;
    reports: number;
    /** Days of step history, not steps. */
    stepDays: number;
  };
  anonymised: {
    drops: number;
    replies: number;
  };
}

export interface ApiDeviceInfo {
  deviceId: string;
  createdAt: number;
  dropsQuotaRemaining: number;
}

/**
 * One city in this device's history (`GET /devices/me/cities`) — the per-city
 * breakdown behind `ApiDeviceStats.citiesVisited`, which is only a number.
 *
 * Counts and dates only. The constellation's *points* come from the trail,
 * which is already gated on this device having stood there.
 */
export interface ApiDeviceCity {
  city: string;
  foundCount: number;
  droppedCount: number;
  /** ms epoch of the first / most recent thing this device did in that city. */
  firstAt: number;
  lastAt: number;
}

/** Aggregate Trail stats for this device (steps come from the device, not here). */
export interface ApiDeviceStats {
  droppedTotal: number;
  droppedThisMonth: number;
  foundTotal: number;
  foundThisMonth: number;
  citiesVisited: number;
  streakDays: number;
}

// ── Endpoint functions ────────────────────────────────────────────────────────

export const fetchHealth = () =>
  api.get<{ ok: boolean }>('/health').then(r => r.data);

export const fetchDeviceInfo = () =>
  api.get<ApiDeviceInfo>('/devices/me').then(r => r.data);

export const fetchDeviceStats = () =>
  api.get<ApiDeviceStats>('/devices/me/stats').then(r => r.data);

/**
 * Erase this device: the panic wipe's server half.
 *
 * Sends no body — the two-step confirm lives on the handset, where the user can
 * read what survives. **Idempotent**: a retry after a timeout answers zeroes
 * rather than an error, so the retry path is safe to offer.
 *
 * The caller must not touch local storage until this resolves. A local wipe
 * after a failed call leaves someone believing their confessions are gone while
 * they are still on the map, which is worse than not wiping at all.
 */
export const eraseDevice = () =>
  api.delete<ApiEraseReceipt>('/devices/me').then(r => r.data);

/** The single steps number for the Trail receipt (scope decided server-side). */
export const fetchDeviceSteps = () =>
  api.get<{ steps: number }>('/devices/me/steps').then(r => r.data.steps);

/** Sync locally-counted, day-tagged step deltas; returns the new steps total. */
export const postDeviceSteps = (entries: { day: string; delta: number }[]) =>
  api.post<{ steps: number }>('/devices/me/steps', { entries }).then(r => r.data.steps);

/**
 * Nearby drops, optionally narrowed to a set of moods.
 *
 * Sending all four moods is the same as sending none, so the param is omitted
 * in that case — it keeps the URL clean and, more importantly, keeps one cache
 * entry for "everything" instead of two that hold identical data.
 *
 * `hiddenByFilter` is what the filter removed, counted server-side over the
 * same result set. The map shows it so a filter always reads as a view rather
 * than as an emptier world.
 */
export const fetchNearbyDrops = (
  lat: number,
  lng: number,
  radiusMeters = 2000,
  moods: Mood[] = [],
) => {
  const filtering = moods.length > 0 && moods.length < MOODS.length;
  return api
    .get<{ secrets: ApiSecret[]; hiddenByFilter: number }>('/drops/nearby', {
      params: {
        lat,
        lng,
        radiusMeters,
        ...(filtering ? { mood: [...moods].sort().join(',') } : {}),
      },
    })
    .then(r => r.data);
};

/**
 * Public metadata for one drop, for a shared link. The only read that works
 * without having walked anywhere — and correspondingly the only one that
 * returns no secret text. 404s for hidden, pending, and expired drops alike.
 */
export const fetchDropPreview = (id: string) =>
  api.get<ApiDropPreview>(`/drops/${id}/preview`).then(r => r.data);

/**
 * Anniversaries near a point, for this device only — "a year ago you stood
 * here".
 *
 * Called from a location watch, so the *caller* owns the discipline that keeps
 * it cheap: once per day per ~250 m (see `utils/echo.echoCheckDue`). The server
 * caps and rate-limits it, but a client that polls it per GPS fix is a battery
 * bug either way. `radiusMeters` is omitted by default so the server's own
 * "near enough to be a memory" radius applies.
 */
export const fetchEchoes = (lat: number, lng: number, radiusMeters?: number) =>
  api
    .get<{ echoes: ApiEcho[] }>('/drops/echoes', {
      params: { lat, lng, ...(radiusMeters ? { radiusMeters } : {}) },
    })
    .then(r => r.data.echoes);

/** Server-proxied walking route from `from` → `to` (for the Walk screen path). */
export const fetchFootRoute = (from: Coordinate, to: Coordinate) =>
  api
    .get<ApiFootRoute>('/route/foot', {
      params: { fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng },
    })
    .then(r => r.data);

/**
 * `expiresInDays` is a duration, not a timestamp — the server owns the clock,
 * so a drop's expiry can't be moved by a device with a wrong one. Omit it for
 * a drop that lives forever.
 *
 * `shareable` is the author's opt-out from share links; omit it for the
 * permissive default.
 *
 * `revealCondition` is a **single** value, never an array — one condition per
 * drop. 50 m is already a hard ask; stacking gates means nobody ever reads it.
 */
export const createDrop = (
  body: string,
  mood: Mood,
  coordinate: Coordinate,
  placeLabel?: string,
  city?: string,
  expiresInDays?: ExpiresInDays,
  shareable?: boolean,
  revealCondition?: RevealCondition,
) =>
  api
    .post<ApiSecret>('/drops', {
      body,
      mood,
      coordinate,
      placeLabel,
      city,
      expiresInDays,
      shareable,
      revealCondition,
    })
    .then(r => r.data);

export const revealDrop = (id: string, coordinate: Coordinate) =>
  api.post<ApiSecret>(`/drops/${id}/reveal`, { coordinate }).then(r => r.data);

export const saveDrop = (id: string) =>
  api.post<{ saved: boolean }>(`/drops/${id}/save`).then(r => r.data);

export const unsaveDrop = (id: string) =>
  api.delete<{ saved: boolean }>(`/drops/${id}/save`).then(r => r.data);

export const heartDrop = (id: string) =>
  api.post<{ hearted: boolean; hearts: number }>(`/drops/${id}/heart`).then(r => r.data);

export const unheartDrop = (id: string) =>
  api.delete<{ hearted: boolean; hearts: number }>(`/drops/${id}/heart`).then(r => r.data);

export const reportDrop = (id: string, reason: string) =>
  api.post<{ reported: true }>(`/drops/${id}/report`, { reason }).then(r => r.data);

// Replies in place. Both reads and writes 403 unless the server has a reveal on
// record for this device — a device that hasn't stood there gets an error, not
// an empty list. Callers must render that 403 as "walk here first", not as
// "no replies yet".
export const fetchReplies = (id: string, limit = 50, offset = 0) =>
  api
    .get<{ replies: ApiReply[]; total: number }>(`/drops/${id}/replies`, {
      params: { limit, offset },
    })
    .then(r => r.data);

export const postReply = (id: string, body: string) =>
  api.post<ApiReply>(`/drops/${id}/replies`, { body }).then(r => r.data);

export const deleteReply = (id: string, replyId: string) =>
  api.delete<{ deleted: true }>(`/drops/${id}/replies/${replyId}`).then(r => r.data);

export const reportReply = (id: string, replyId: string, reason: string) =>
  api
    .post<{ reported: true }>(`/drops/${id}/replies/${replyId}/report`, { reason })
    .then(r => r.data);

/**
 * Every city this device has found or left something in, newest activity
 * first. The index the constellation picker is built from — one drawing per
 * city, and this is the list of cities.
 */
export const fetchDeviceCities = () =>
  api.get<{ cities: ApiDeviceCity[] }>('/devices/me/cities').then(r => r.data.cities);

/**
 * The trail lists. `city` narrows to one city (case-insensitive, server-side),
 * which is how the constellation pages through a single city's points instead
 * of pulling the whole trail and filtering here.
 */
const trail = (kind: 'found' | 'saved' | 'dropped', limit: number, offset: number, city?: string) =>
  api
    .get<{ secrets: ApiTrailSecret[]; total: number }>(`/drops/trail/${kind}`, {
      params: { limit, offset, ...(city ? { city } : {}) },
    })
    .then(r => r.data);

export const fetchTrailFound = (limit = 20, offset = 0, city?: string) =>
  trail('found', limit, offset, city);

export const fetchTrailSaved = (limit = 20, offset = 0, city?: string) =>
  trail('saved', limit, offset, city);

export const fetchTrailDropped = (limit = 20, offset = 0, city?: string) =>
  trail('dropped', limit, offset, city);
