/**
 * revealCondition — display helpers for drops that also wait for an hour.
 *
 * A drop may carry one condition on top of the 50 m rule: `night` or `day`.
 * The server is the only judge of whether it currently holds — it computes
 * sunrise and sunset from the drop's own coordinate — so nothing here decides
 * anything. These helpers only answer "what words go on the screen?", which is
 * why a device with a skewed clock can render a slightly wrong countdown but
 * can never talk the server into unsealing anything.
 *
 * Same shape as `utils/expiry`, deliberately: absent means no condition, and
 * `null` back from a label means "show nothing at all" rather than a sentinel
 * string the UI has to special-case.
 */
import type { RevealCondition } from '../types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Terse tag for a pin or a seal. `null` for an ungated drop. */
export function conditionTag(
  condition: RevealCondition | undefined,
): string | null {
  if (condition === undefined) return null;
  return condition === 'night' ? 'waits for dark' : 'daylight only';
}

/**
 * The sentence for the refusal, when you stood in the right place at the wrong
 * hour. Warm on purpose: this is not an error, it is an appointment.
 */
export function conditionInvitation(
  condition: RevealCondition | undefined,
): string | null {
  if (condition === undefined) return null;
  return condition === 'night'
    ? 'You found it. It just won’t speak until dark.'
    : 'You found it. It only speaks in daylight.';
}

/**
 * "in about 4 hours" — how long until a gated drop opens.
 *
 * `null` when the server sent no `opensAt` (the polar case, where the next
 * sunset can be months away) or when the instant has already passed, so the
 * caller renders the invitation on its own rather than "in about 0 minutes".
 *
 * Deliberately vague — "about 4 hours", never "at 18:47". Sunset is a thing you
 * look up at, not a train you catch, and rounding down would send someone out
 * early.
 */
export function opensInLabel(
  opensAt: number | undefined,
  now = Date.now(),
): string | null {
  if (opensAt === undefined) return null;
  const remaining = opensAt - now;
  if (remaining <= 0) return null;

  if (remaining < HOUR_MS) {
    const minutes = Math.max(1, Math.round(remaining / MINUTE_MS));
    return `in about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  if (remaining < DAY_MS) {
    const hours = Math.max(1, Math.round(remaining / HOUR_MS));
    return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.round(remaining / DAY_MS);
  return `in about ${days} day${days === 1 ? '' : 's'}`;
}
