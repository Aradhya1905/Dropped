/**
 * gate — the single decision point for whether a walk-by hum may fire.
 *
 * Every notification this app ever sends must come through {@link shouldNotify}.
 * Not "should mostly": one place, checked once. The failure mode of the
 * alternative — a second call site that forgets quiet hours — is a notification
 * at 3 a.m. about a confession, which is the kind of thing people uninstall over
 * and never report.
 *
 * It returns a **reason**, not a boolean. "Why didn't I get a notification" is
 * otherwise unanswerable on a device, and the reason is what the tests pin.
 */
import type { Mood } from '../../types';
import type { NotificationMode, QuietHours } from '../storage';

/**
 * `rare` — at most one hum every three hours. Long enough that a commute is one
 * ping, short enough that a whole evening's walk isn't silent.
 */
export const RARE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

/**
 * Even `always` gets a floor. A dense street can hold a dozen drops inside the
 * notification radius; ten pings in a minute is how a user learns to swipe the
 * app's notifications away forever.
 */
export const ALWAYS_COOLDOWN_MS = 10 * 60 * 1000;

/** Everything the decision depends on, passed in — nothing is read from here. */
export interface GateInput {
  /**
   * Whether the walker is standing inside one of their privacy zones
   * (FUN_TODOs/14). Passed in like everything else here, but unlike everything
   * else it is not a preference — see {@link shouldNotify}.
   */
  inPrivacyZone: boolean;
  mode: NotificationMode;
  onlyWhenMoving: boolean;
  /** From `services/location/movement.isSustainedMovement`. */
  isMoving: boolean;
  /** Minutes past local midnight; `null` = quiet hours switched off. */
  quietHours: QuietHours | null;
  /** Local wall-clock minutes past midnight, on the handset. */
  nowMin: number;
  distanceM: number;
  notifyRadiusM: number;
  subscribedMoods: readonly Mood[];
  dropMood: Mood;
  /** ms epoch of the last hum that actually fired, or `null`. */
  lastFiredAt: number | null;
  /** ms epoch now. */
  now: number;
}

/**
 * `'fire'` or the first gate that said no. The order the gates are checked in
 * is part of the contract (see {@link shouldNotify}) — a test asserts it.
 */
export type GateVerdict =
  | 'fire'
  | 'privacy-zone'
  | 'muted'
  | 'quiet-hours'
  | 'not-moving'
  | 'too-far'
  | 'mood'
  | 'cooldown';

/**
 * Whether `nowMin` falls inside a quiet-hours window, handling the ordinary
 * case where the window wraps midnight (22:00–08:00 is `start > end`).
 *
 * The window is half-open — `[start, end)` — so a window ending at 08:00 is
 * already over at 08:00. A degenerate `start === end` window means *no* silence
 * rather than a silent 24 hours: a setting that could accidentally mute the app
 * forever should fail towards making noise.
 */
export function inQuietHours(nowMin: number, hours: QuietHours | null): boolean {
  if (!hours) {
    return false;
  }
  const { startMin, endMin } = hours;
  if (startMin === endMin) {
    return false;
  }
  return startMin < endMin
    ? nowMin >= startMin && nowMin < endMin
    : nowMin >= startMin || nowMin < endMin;
}

/** The cooldown a mode imposes between two hums. `off` never fires anyway. */
export function cooldownFor(mode: NotificationMode): number {
  switch (mode) {
    case 'rare':
      return RARE_COOLDOWN_MS;
    case 'always':
      return ALWAYS_COOLDOWN_MS;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

/**
 * The gate. Pure, and checked in this order:
 *
 * 1. `privacy-zone` — standing inside a zone. Outranks even the master switch:
 *    every other gate here is a preference the user can change their mind about
 *    from row to row, while this one is a promise that the app does not act on
 *    where they live. Turning the hum to `always` must not buy a notification at
 *    home.
 * 2. `muted` — the master switch outranks everything else.
 * 3. `quiet-hours` — a time the user said not to be disturbed.
 * 4. `not-moving` — sitting still, with the moving-only lever on.
 * 5. `too-far` — outside the notification radius (inclusive: exactly at the
 *    radius still fires; the radius is "tell me within X", not "beyond X").
 * 6. `mood` — a mood they aren't subscribed to.
 * 7. `cooldown` — everything else passed, but it's too soon.
 *
 * Cheap-and-absolute first, "would have fired but not yet" last, so the reason
 * reported is always the most informative one.
 */
export function shouldNotify(input: GateInput): GateVerdict {
  if (input.inPrivacyZone) {
    return 'privacy-zone';
  }
  if (input.mode === 'off') {
    return 'muted';
  }
  if (inQuietHours(input.nowMin, input.quietHours)) {
    return 'quiet-hours';
  }
  if (input.onlyWhenMoving && !input.isMoving) {
    return 'not-moving';
  }
  if (!(input.distanceM <= input.notifyRadiusM)) {
    return 'too-far';
  }
  if (!input.subscribedMoods.includes(input.dropMood)) {
    return 'mood';
  }
  if (
    input.lastFiredAt != null &&
    input.now - input.lastFiredAt < cooldownFor(input.mode)
  ) {
    return 'cooldown';
  }
  return 'fire';
}

/** Local wall-clock minutes past midnight for a ms-epoch instant. */
export function minutesOfDay(at: number): number {
  const d = new Date(at);
  return d.getHours() * 60 + d.getMinutes();
}
