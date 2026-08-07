/**
 * The constellation is a pure function.
 *
 * Everything that decides what the drawing looks like — the projection, the fit,
 * the node sizes, the order the line walks — happens here, with no React, no
 * SVG, and no data beyond points. That is what makes the one rule that matters
 * testable: **nothing but places and dates ever reaches the picture.** A
 * `ConstellationPoint` has no body field to leak, and `layout()` copies fields
 * across explicitly rather than spreading, so a future caller that hands in a
 * whole `Secret` still gets nodes carrying only geometry and a label.
 */
import type { Coordinate } from '../../../types';

/** One reveal (or drop) that earned a place in the drawing. */
export interface ConstellationPoint {
  id: string;
  coordinate: Coordinate;
  /** How many people have stood here. Drives the node's size. */
  revealCount: number;
  /** `placeLabel`, when there is one. Never the secret. */
  label?: string;
  /** ms epoch of the thing being remembered — the order the line walks. */
  at: number;
}

/** A point placed in the viewBox. Geometry and a label; nothing else. */
export interface ConstellationNode {
  id: string;
  x: number;
  y: number;
  r: number;
  label?: string;
  at: number;
}

export interface ConstellationLayout {
  nodes: ConstellationNode[];
  /** SVG path connecting the nodes in walk order. Empty for fewer than two. */
  path: string;
}

export interface ViewBox {
  w: number;
  h: number;
}

/** Node radii, in viewBox units. A busy place is bigger, but not by much. */
const MIN_RADIUS = 2.6;
const MAX_RADIUS = 7;
/** Growth per √reveal — sublinear, so one famous drop can't dwarf the city. */
const RADIUS_STEP = 1.15;

/** Coordinates are rounded to this many decimals so output is byte-stable. */
const PRECISION = 2;

const round = (n: number): number => {
  const r = Math.round(n * 10 ** PRECISION) / 10 ** PRECISION;
  // `-0` serializes as `-0` and would make two identical layouts unequal.
  return r === 0 ? 0 : r;
};

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/**
 * Node radius for a reveal count. Monotonic and clamped at both ends: an
 * unvisited drop is still a visible dot, and a wildly popular one is still a
 * dot rather than a blob.
 */
export function radiusFor(revealCount: number): number {
  const n = Number.isFinite(revealCount) ? Math.max(0, revealCount) : 0;
  return clamp(MIN_RADIUS + RADIUS_STEP * Math.sqrt(n), MIN_RADIUS, MAX_RADIUS);
}

/**
 * Lay a city's points out inside `viewBox`.
 *
 * - **Equirectangular, scaled by cos(lat).** At Bengaluru's latitude a degree of
 *   longitude is ~0.9 of a degree of latitude; without the cosine a city comes
 *   out visibly stretched sideways, which reads as a bug in a keepsake.
 * - **One scale for both axes.** Fitting each axis independently would stretch
 *   a walk along one street into a square. The shape of the city survives; the
 *   empty margin is the price.
 * - **Inset by the largest radius** as well as `padding`, so no circle is ever
 *   clipped by the edge of an exported image.
 *
 * Degenerate inputs are handled rather than guarded against: no points gives an
 * empty drawing, one point (or several at the same coordinate) lands centred,
 * and a zero-width bounding box never divides.
 */
export function layout(
  points: ConstellationPoint[],
  viewBox: ViewBox,
  padding: number,
): ConstellationLayout {
  if (points.length === 0) return { nodes: [], path: '' };

  // Walk order is the whole point of the line, and it must not depend on the
  // order the server happened to page the trail in.
  const ordered = [...points].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

  const radii = ordered.map(p => radiusFor(p.revealCount));
  const maxRadius = Math.max(...radii);

  const midLat =
    ordered.reduce((sum, p) => sum + p.coordinate.lat, 0) / ordered.length;
  const lngScale = Math.cos((midLat * Math.PI) / 180);

  const xs = ordered.map(p => p.coordinate.lng * lngScale);
  // Screen y grows downward; north should be up.
  const ys = ordered.map(p => -p.coordinate.lat);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const inset = padding + maxRadius;
  const innerW = Math.max(0, viewBox.w - inset * 2);
  const innerH = Math.max(0, viewBox.h - inset * 2);

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  // A single point, or a city walked entirely on one spot: no span to fit, so
  // scale is zero and everything collapses to the centre. Deliberately not a
  // special case — it is the same arithmetic with nothing to divide by.
  const fits = [
    spanX > 0 ? innerW / spanX : Infinity,
    spanY > 0 ? innerH / spanY : Infinity,
  ];
  const scale = fits.every(f => f === Infinity) ? 0 : Math.min(...fits);

  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;

  const nodes: ConstellationNode[] = ordered.map((p, i) => ({
    id: p.id,
    x: round(viewBox.w / 2 + (xs[i]! - centreX) * scale),
    y: round(viewBox.h / 2 + (ys[i]! - centreY) * scale),
    r: round(radii[i]!),
    // Only assigned when there is one, so a labelless node has no `label` key
    // rather than an `undefined` that JSON.stringify would drop inconsistently.
    ...(p.label ? { label: p.label } : {}),
    at: p.at,
  }));

  const path =
    nodes.length < 2
      ? ''
      : nodes
          .map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.x} ${n.y}`)
          .join(' ');

  return { nodes, path };
}

/**
 * Which nodes may show their label, so a dense street doesn't become a stack of
 * overlapping words.
 *
 * Greedy and in walk order: the earliest node in a cluster keeps its name and
 * the rest go quiet. Deliberately not "keep the biggest" — the point of the
 * drawing is the walk, and dropping the first place you went in favour of the
 * busiest reads as arbitrary when you look at your own city.
 *
 * Returns a Set of node ids rather than mutating anything, so the caller can
 * still draw every node and only skip the text.
 */
export function labelledNodes(
  nodes: ConstellationNode[],
  minDistance: number,
): Set<string> {
  const kept: ConstellationNode[] = [];
  const ids = new Set<string>();

  for (const n of nodes) {
    if (!n.label) continue;
    const crowded = kept.some(
      k => Math.hypot(k.x - n.x, k.y - n.y) < minDistance,
    );
    if (crowded) continue;
    kept.push(n);
    ids.add(n.id);
  }

  return ids;
}
