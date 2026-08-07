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
}

export type Mood = 'joy' | 'ache' | 'trouble' | 'wonder';

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
  /** Replies pinned here. Reading them still requires standing here. */
  replyCount: number;
  sealed: boolean;
  saved: boolean;
  hearted: boolean;
  distanceMeters?: number;
  /**
   * ms epoch when this drop fades — it leaves the map and can no longer be
   * revealed. Absent = forever, which is the default and what every drop made
   * before expiring drops shipped carries.
   */
  expiresAt?: number;
  /**
   * Whether a share link may point at this drop — the author's opt-out.
   *
   * Surfaced to every reader, not just the author: a link to an opted-out drop
   * 404s, so offering a share sheet for one would hand someone a dead link.
   * The opt-out covers the *link* only; the drop is still found by walking to
   * it, which is the premise of the app.
   */
  shareable: boolean;
}

/**
 * What a shared link tells you about a place before you have walked to it.
 *
 * This is what `GET /drops/:id/preview` returns to someone holding a
 * `dropped://d/<id>` link. Note what a `Secret` has that this does not: no
 * `body` (that still costs a walk), and no `saved`/`hearted`/`sealed` — a
 * preview has no relationship to your device yet.
 *
 * **`coordinate` is coarsened to ~100 m by the server.** Distances computed
 * against it are approximate by design, and the UI must not present them as
 * exact — an exact coordinate attached to a confession, forwarded into a group
 * chat, is the worst privacy failure this app has.
 */
export interface DropPreview {
  id: string;
  coordinate: Coordinate;
  placeLabel?: string;
  city?: string;
  mood: Mood;
  /** ms epoch. */
  createdAt: number;
  revealCount: number;
  /** ms epoch when the drop fades. Absent = forever. */
  expiresAt?: number;
}

/** The lifespans an author may pick in the composer. `undefined` = forever. */
export type ExpiresInDays = 7 | 30;

/**
 * A reply left under a secret by someone who physically stood at the drop.
 * Authorship is never on the wire — `mine` is derived server-side against the
 * requesting device, so it says which reply you may delete and nothing about
 * who wrote any other.
 */
export interface Reply {
  id: string;
  body: string;
  /** ms epoch. */
  createdAt: number;
  mine: boolean;
}

/** Max length of a reply. One line, not a comment thread. */
export const MAX_REPLY_LENGTH = 140;

/**
 * Per-viewer reveal state for a secret:
 * - `locked`  — too far, contents hidden
 * - `near`    — inside the "getting warmer" radius, still hidden
 * - `revealed`— within the 50 m unlock radius, contents shown
 */
export type RevealState = 'locked' | 'near' | 'revealed';

/** Default unlock radius in meters. */
export const REVEAL_RADIUS_M = 50;
