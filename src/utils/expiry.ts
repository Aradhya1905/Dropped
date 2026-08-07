/**
 * expiry — display helpers for drops that fade.
 *
 * A drop lives 7 days, 30 days, or forever; `expiresAt` is absent for forever.
 * The server decides whether an expired drop is still served (it filters in
 * SQL against its own clock). These helpers only answer "what should this look
 * like right now?", so a device with a skewed clock can render a countdown a
 * little wrong but can never talk the server into unsealing anything.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** True once the drop has faded. A drop with no expiry never has. */
export function isExpired(expiresAt: number | undefined, now = Date.now()): boolean {
  if (expiresAt === undefined) return false;
  return now >= expiresAt;
}

/** Whole days left, rounded up, floored at 0. `null` when it never fades. */
export function daysUntilExpiry(
  expiresAt: number | undefined,
  now = Date.now(),
): number | null {
  if (expiresAt === undefined) return null;
  return Math.max(0, Math.ceil((expiresAt - now) / DAY_MS));
}

/**
 * The countdown line: "fades in 3 days", "fades today", "faded".
 *
 * Returns null for a drop that lives forever, so callers can render nothing
 * rather than a reassuring-but-noisy "fades in ∞". Rounds **up**, so a drop
 * with 6.7 days left reads "fades in 7 days" — a countdown that promises less
 * time than it has is the wrong kind of lie for a feature about urgency.
 */
export function fadesInLabel(
  expiresAt: number | undefined,
  now = Date.now(),
): string | null {
  if (expiresAt === undefined) return null;
  if (isExpired(expiresAt, now)) return 'faded';
  const days = daysUntilExpiry(expiresAt, now)!;
  if (days <= 1) return 'fades today';
  return `fades in ${days} days`;
}

/**
 * Opacity for the fading treatment, 1 → `MIN_FADE_OPACITY` as expiry nears.
 *
 * The ramp only starts inside the last `FADE_RAMP_DAYS`, so a fresh 30-day drop
 * looks exactly like a forever one and only starts visibly thinning out when
 * the countdown is worth acting on. Never returns 0 — an invisible pin is a bug
 * report, not a design.
 */
const FADE_RAMP_DAYS = 7;
const MIN_FADE_OPACITY = 0.45;

export function fadeOpacity(
  expiresAt: number | undefined,
  now = Date.now(),
): number {
  if (expiresAt === undefined) return 1;
  if (isExpired(expiresAt, now)) return MIN_FADE_OPACITY;
  const daysLeft = (expiresAt - now) / DAY_MS;
  if (daysLeft >= FADE_RAMP_DAYS) return 1;
  const progress = daysLeft / FADE_RAMP_DAYS; // 1 → 0 as it fades
  return MIN_FADE_OPACITY + (1 - MIN_FADE_OPACITY) * progress;
}
