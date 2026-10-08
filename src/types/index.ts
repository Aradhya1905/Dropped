/**
 * Shared domain types for Dropped.
 * The whole app is: a `Secret` is `Drop`ped at a `Coordinate`; another user
 * walks toward it; once within range its `RevealState` flips to `revealed`.
 */

/** A WGS-84 lat/lng point. */
export interface Coordinate {
  lat: number;
  lng: number;
}

/** Where a secret was pinned. */
export interface Drop {
  id: string;
  coordinate: Coordinate;
  /** Optional human label, e.g. "Blue Tokai, Indiranagar". */
  placeLabel?: string;
  /** ms epoch. */
  createdAt: number;
  /** Weather at the drop moment, stamped server-side after the drop saves.
   * Absent when the lookup failed or hasn't landed yet. */
  weather?: Weather;
}

/** The postmark's weather word (server maps WMO codes onto these). */
export type Weather =
  | 'clear'
  | 'cloudy'
  | 'overcast'
  | 'foggy'
  | 'drizzly'
  | 'rainy'
  | 'snowy'
  | 'stormy';

export type Mood = 'joy' | 'ache' | 'trouble' | 'wonder';

/** Every mood, in the order the composer and the You-tab filter show them. */
export const MOODS: readonly Mood[] = ['joy', 'ache', 'trouble', 'wonder'];

/** The anonymous confession itself, tied to one drop. */
export interface Secret {
  id: string;
  /** The text the author left. Absent when sealed === true. */
  body?: string;
  drop: Drop;
  createdAt: number;
  /** How many people have revealed it (server-owned). */
  revealCount?: number;
  mood: Mood;
  hearts: number;
  stoodHere: number;
  sealed: boolean;
  saved: boolean;
  hearted: boolean;
  distanceMeters?: number;
  /** Seeded by the server into an empty area, not left by a person. */
  starter?: boolean;
  /** Steps this device took to reach it (only on its own reveals). */
  walkSteps?: number;
  /** Set when this drop is a stop on a trail of 2+ visible stops. */
  chain?: ChainInfo;
}

/** Where a drop sits on a trail ("stop 2 of 3"), and — once earned — what's next. */
export interface ChainInfo {
  /** The trail's id (its first stop's id). Groups stops on the map. */
  id: string;
  /** 1-based position among the trail's visible stops. */
  pos: number;
  /** How many visible stops the trail has. */
  length: number;
  /** The next stop. Only for a device that revealed (or authored) this one. */
  next?: ChainNextStop;
}

export interface ChainNextStop {
  id: string;
  coordinate: Coordinate;
  /** Straight-line metres from this stop to the next. */
  distanceMeters: number;
  placeLabel?: string;
  mood: Mood;
  /** ms epoch. */
  createdAt: number;
}

/** One of the author's own recent drops, offered as the previous stop. */
export interface ChainCandidate {
  id: string;
  placeLabel?: string;
  mood: Mood;
  /** ms epoch. */
  createdAt: number;
  /** Metres from where the author is standing now. */
  distanceMeters: number;
  /** The stop number the new drop would become (this one's + 1). */
  nextStopNumber: number;
  /** Why it can't be picked: already has a next stop, or the trail is full. */
  blocked?: 'leads-on' | 'full';
}

/** Longest trail allowed, in stops (server-enforced; mirrored for copy). */
export const CHAIN_MAX_STOPS = 8;

/**
 * Per-viewer reveal state for a secret:
 * - `locked`  — too far, contents hidden
 * - `near`    — inside the "getting warmer" radius, still hidden
 * - `revealed`— within the 50 m unlock radius, contents shown
 */
export type RevealState = 'locked' | 'near' | 'revealed';

/** Default unlock radius in meters. */
export const REVEAL_RADIUS_M = 50;
