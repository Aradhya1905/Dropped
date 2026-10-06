/**
 * Chain drops ("leads to…") — pure helpers over the drops the app knows about.
 *
 * A trail is a line of drops by one author; a reader sees stop N+1 only after
 * revealing stop N. On the map that means: revealed stops (`read`), the one
 * stop just unlocked (`next`), and — for anyone who hasn't started — stop 1
 * with a small "1/3" tag.
 */
import type { Coordinate, Secret } from '../types';
import { haversineMeters } from './geo';

/** The stops of one trail that are on the map right now, in order. */
export interface TrailOnMap {
  id: string;
  /** Visible stops, sorted by position. */
  stops: Secret[];
  /** The trail's full length (stops beyond `stops` are still hidden). */
  length: number;
}

/** How a chained drop's pin should read. */
export type ChainPinKind = 'read' | 'next' | 'tagged';

/** Group chained drops into trails, each sorted by stop position. */
export function trailsOnMap(drops: Secret[]): TrailOnMap[] {
  const byId = new Map<string, TrailOnMap>();
  for (const d of drops) {
    if (!d.chain) continue;
    const t = byId.get(d.chain.id) ?? { id: d.chain.id, stops: [], length: d.chain.length };
    t.stops.push(d);
    t.length = Math.max(t.length, d.chain.length);
    byId.set(d.chain.id, t);
  }
  const trails = Array.from(byId.values());
  for (const t of trails) t.stops.sort((a, b) => a.chain!.pos - b.chain!.pos);
  return trails;
}

/** True once the reader has opened at least one stop of this trail. */
const isFollowing = (t: TrailOnMap) => t.stops.some(s => !s.sealed);

/**
 * Pin treatment for a chained drop: `read` once opened, `next` for a sealed
 * stop on a trail you're following, otherwise a plain pin `tagged` "1/3".
 */
export function chainPinKind(drop: Secret, trails: TrailOnMap[]): ChainPinKind | null {
  if (!drop.chain) return null;
  if (!drop.sealed) return 'read';
  const trail = trails.find(t => t.id === drop.chain!.id);
  return trail && isFollowing(trail) && drop.chain.pos > 1 ? 'next' : 'tagged';
}

/** The trail you're walking right now, and the stop you're walking to. */
export interface ActiveTrail {
  trail: TrailOnMap;
  next: Secret;
}

/**
 * The trail being followed: a sealed later stop on a trail you've started.
 * With several, the one whose next stop is nearest wins.
 */
export function activeTrail(drops: Secret[], here: Coordinate | null): ActiveTrail | null {
  let best: ActiveTrail | null = null;
  let bestDist = Infinity;
  for (const trail of trailsOnMap(drops)) {
    if (!isFollowing(trail)) continue;
    const next = trail.stops.find(s => s.sealed && s.chain!.pos > 1);
    if (!next) continue;
    const dist = here ? haversineMeters(here, next.drop.coordinate) : 0;
    if (dist < bestDist) {
      best = { trail, next };
      bestDist = dist;
    }
  }
  return best;
}

/** Per-stop state for the trail pill's dots. */
export type TrailDot = 'read' | 'next' | 'hidden';

export function trailDots({ trail, next }: ActiveTrail): TrailDot[] {
  return Array.from({ length: trail.length }, (_, i) => {
    const pos = i + 1;
    if (pos === next.chain!.pos) return 'next';
    const stop = trail.stops.find(s => s.chain!.pos === pos);
    return stop && !stop.sealed ? 'read' : 'hidden';
  });
}

/** "one more stop is hidden after this one." — or that this is the last. */
export function hiddenAfterLine(pos: number, length: number): string {
  const left = length - pos;
  if (left <= 0) return 'the last stop on this trail.';
  if (left === 1) return 'one more stop is hidden after this one.';
  return `${left} more stops are hidden after this one.`;
}

/**
 * A sealed placeholder for the next stop, built from the revealed stop's
 * ticket, so Walk can open before the nearby list catches up. The store's
 * merge lets the real copy replace it field by field.
 */
export function nextStopStub(from: Secret): Secret | null {
  const next = from.chain?.next;
  if (!from.chain || !next) return null;
  return {
    id: next.id,
    drop: {
      id: next.id,
      coordinate: next.coordinate,
      placeLabel: next.placeLabel,
      createdAt: next.createdAt,
    },
    createdAt: next.createdAt,
    mood: next.mood,
    hearts: 0,
    stoodHere: 0,
    sealed: true,
    saved: false,
    hearted: false,
    chain: { id: from.chain.id, pos: from.chain.pos + 1, length: from.chain.length },
  };
}
