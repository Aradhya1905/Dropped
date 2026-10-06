/**
 * Human-facing formatting shared across screens. Kept here so the same drop
 * never reads "just now" on one screen and "3mo ago" on another.
 */

import type { Weather } from '../types';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long ago something happened, in the app's clipped voice:
 * "just now", "12m ago", "5h ago", "yesterday", "9d ago", "3mo ago", "2y ago".
 */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  if (diff < 0) return 'just now';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;

  const days = Math.floor(diff / DAY);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/** "dropped 3mo ago" — the byline form. */
export function droppedAgo(ms: number, now: number = Date.now()): string {
  return `dropped ${relativeTime(ms, now)}`;
}

/** Distance to a drop: metres up close, one decimal of a km beyond 1000 m. */
export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** Average walking pace, metres per minute (~5 km/h). */
const WALK_M_PER_MIN = 84;

/** Minutes on foot for a straight-line distance — never less than one. */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_M_PER_MIN));
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Adjective for each stored weather word ("left on a rainy …"). */
const WEATHER_ADJ: Record<Weather, string> = {
  clear: 'clear',
  cloudy: 'cloudy',
  overcast: 'grey',
  foggy: 'foggy',
  drizzly: 'drizzly',
  rainy: 'rainy',
  snowy: 'snowy',
  stormy: 'stormy',
};

/** night 21–4 · morning 5–11 · afternoon 12–16 · evening 17–20 (local hours). */
function partOfDay(hour: number): string {
  if (hour >= 21 || hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * The weather postmark under a revealed note: "left on a rainy Tuesday night".
 * Formatted in the reader's local time — the reader is standing within 50 m of
 * the drop, so their timezone is the drop's. Without weather (lookup failed or
 * older drop) it's just "left on a Tuesday night".
 */
export function postmarkLine(createdAt: number, weather?: Weather): string {
  const d = new Date(createdAt);
  const day = `${WEEKDAYS[d.getDay()]} ${partOfDay(d.getHours())}`;
  const adj = weather ? WEATHER_ADJ[weather] : undefined;
  return adj ? `left on a ${adj} ${day}` : `left on a ${day}`;
}

/** Below this, the walk wasn't really a walk — no line. */
export const MIN_WALK_STEPS = 10;

/** "1,240 steps to read this", or null when there's nothing worth printing. */
export function stepsLine(steps?: number): string | null {
  if (steps == null || steps < MIN_WALK_STEPS) return null;
  // Manual grouping — no reliance on Intl being compiled into Hermes.
  const n = String(Math.round(steps)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n} steps to read this`;
}
