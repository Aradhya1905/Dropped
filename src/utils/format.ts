/**
 * Human-facing formatting shared across screens. Kept here so the same drop
 * never reads "just now" on one screen and "3mo ago" on another.
 */

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
