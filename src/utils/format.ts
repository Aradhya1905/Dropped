/**
 * format — how the app says "when".
 *
 * Two registers, on purpose:
 *
 * - {@link relTime} is the compact stamp under a Trail card (`3d ago`), where
 *   the line is already crowded and the reader is scanning.
 * - {@link agoLabel} is the sentence a card speaks (`a year ago`), where the
 *   app is talking to you rather than labelling something.
 *
 * Neither ever prints a bare date. "12/03/2025" is a receipt; this app is
 * meant to sound like a person remembering.
 */
import type { EchoInterval } from '../types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/**
 * Compact elapsed time: `today`, `3d ago`, `4mo ago`, `2y ago`.
 *
 * A future timestamp (a device with a skewed clock, or a drop written by one)
 * reads as `today` rather than a negative age.
 */
export function relTime(ms: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const days = Math.floor(diff / DAY_MS);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Elapsed time in words: `just now`, `yesterday`, `three weeks ago`,
 * `a year ago`, `2 years ago`.
 *
 * Deliberately never says "1 year ago" or "1 month ago" — the article reads as
 * speech, the numeral reads as a database row, and this string appears under
 * things people wrote about their lives.
 */
export function agoLabel(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) {
    const minutes = Math.floor(diff / MINUTE_MS);
    return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`;
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  }
  if (diff < 2 * DAY_MS) return 'yesterday';
  if (diff < MONTH_MS) return `${Math.floor(diff / DAY_MS)} days ago`;
  if (diff < YEAR_MS) {
    // Months are 30 days here and a year is 365, so the last fortnight of the
    // year would otherwise round to "12 months ago" — a phrase that means "a
    // year" while pointedly refusing to say it. Cap at 11.
    const months = Math.min(11, Math.round(diff / MONTH_MS));
    return months <= 1 ? 'a month ago' : `${months} months ago`;
  }
  const years = Math.floor(diff / YEAR_MS);
  return years === 1 ? 'a year ago' : `${years} years ago`;
}

/**
 * The anniversary an echo is having, in the words the card speaks.
 *
 * Spelled out rather than computed from the timestamp: the server already
 * decided which window this landed in (±3 days), so re-deriving it on device
 * could disagree with the server by a day and turn "a year ago" into
 * "11 months ago" — which is the one thing an anniversary card must not say.
 */
export function echoAgo(interval: EchoInterval): string {
  switch (interval) {
    case '6mo':
      return 'six months ago';
    case '1yr':
      return 'a year ago';
    case '2yr':
      return 'two years ago';
  }
}
