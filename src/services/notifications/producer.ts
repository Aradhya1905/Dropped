/**
 * producer — decides whether a walk-by hum fires, and about which drop.
 *
 * Pure by construction: no GPS, no network, no MMKV, no notifee. It takes a
 * fix, the drops near it, the state left by the last firing, and a gate; it
 * returns a decision and the state that should be persisted. `services/walkEngine`
 * is the only caller and owns every side effect.
 *
 * **This module contains no policy of its own.** Whether a hum is allowed right
 * now — notifications off, quiet hours, not actually moving, a mood the user
 * doesn't subscribe to, standing inside a privacy zone — is the gate's call,
 * and the gate's verdict is returned unmodified. What lives here is only the
 * mechanical part no gate should have to repeat: pick the nearest candidate,
 * never hum twice about the same drop, never hum twice in a row too quickly.
 *
 * The distinction matters because the moment there are two places that can
 * suppress a notification, "why didn't it fire?" stops being answerable.
 */
import type { Coordinate, Secret } from '../../types';
import { haversineMeters } from '../../utils/geo';

/** Everything the gate is told about a candidate hum. */
export interface GateInput {
  /** ms epoch of the decision. */
  now: number;
  /** Where the walker is. */
  coordinate: Coordinate;
  /** Meters from the walker to the drop. */
  distanceM: number;
  secret: Secret;
}

/**
 * The gate's answer. `reason` is a free-form slug so a gate can grow new
 * verdicts (`quiet-hours`, `not-moving`, `privacy-zone`, …) without this module
 * knowing about them — it passes whatever it is straight through.
 */
export type GateVerdict = { allowed: true } | { allowed: false; reason: string };

export type NotificationGate = (input: GateInput) => GateVerdict;

/**
 * The permissive gate, used until a real one is registered.
 *
 * Deliberately *not* the shipping default: `walkEngine` refuses to fire at all
 * while this is the gate, because "no gate configured" must mean silence rather
 * than a free-for-all. See `setNotificationGate`.
 */
export const openGate: NotificationGate = () => ({ allowed: true });

/** What survives between firings — and, crucially, across a process restart. */
export interface ProducerState {
  /** ms epoch of the last hum, or `null` if we've never hummed. */
  lastFiredAt: number | null;
  /** Drops already hummed about. Never hum about the same drop twice. */
  firedDropIds: string[];
  /** Where we last ran a check, so a stationary phone doesn't poll. */
  lastCheckCoord: Coordinate | null;
}

export const EMPTY_PRODUCER_STATE: ProducerState = {
  lastFiredAt: null,
  firedDropIds: [],
  lastCheckCoord: null,
};

/**
 * Cap on remembered fired drops. A hum is a place you walked past, so a few
 * hundred is a lot of walking; past this the oldest are forgotten. The failure
 * mode of forgetting is one repeat hum about a drop from months ago, which is
 * mild — unbounded growth in a value written from a background thread is not.
 */
export const FIRED_ID_CAP = 500;

/** Default: no more than one hum every 30 minutes, whatever else is true. */
export const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;

/**
 * Default hum radius, meters. Wider than the 50 m reveal radius on purpose —
 * a nudge is only useful if it arrives while the detour is still small.
 */
export const DEFAULT_NOTIFY_RADIUS_M = 150;

/** Don't re-check until the walker has moved this far since the last check. */
export const DEFAULT_MIN_MOVE_M = 40;

export interface DecideInput {
  /** Where the walker is. */
  fix: Coordinate;
  /** Drops near the fix, as last fetched. */
  nearby: Secret[];
  state: ProducerState;
  /** ms epoch. */
  now: number;
  gate: NotificationGate;
  /** Ids this device has already revealed. */
  revealedIds?: string[];
  radiusM?: number;
  cooldownMs?: number;
}

/** Why nothing fired. Gate verdicts pass through as their own slugs. */
export type SilentReason =
  | 'cooldown'
  | 'no-candidates'
  | 'already-fired'
  | (string & {});

export type Decision =
  | { fire: Secret; distanceM: number; reason: 'fire'; state: ProducerState }
  | { fire: null; distanceM: null; reason: SilentReason; state: ProducerState };

/**
 * Whether it is worth spending a network call on this fix.
 *
 * A phone on a desk still emits fixes; without this the app would poll
 * `/drops/nearby` all day to be told nothing changed. Distance-based rather
 * than time-based because the question is "did the world around me change?".
 */
export function shouldPoll(
  fix: Coordinate,
  state: ProducerState,
  minMoveM: number = DEFAULT_MIN_MOVE_M,
): boolean {
  if (!state.lastCheckCoord) return true;
  return haversineMeters(state.lastCheckCoord, fix) >= minMoveM;
}

/** Remember where we last checked, whether or not anything fired. */
export function markChecked(state: ProducerState, fix: Coordinate): ProducerState {
  return { ...state, lastCheckCoord: fix };
}

function isCandidate(s: Secret, revealed: Set<string>, now: number): boolean {
  // `sealed === false` on a nearby list means the server already counts this
  // device as having revealed it — no point humming someone toward a secret
  // they've read.
  if (!s.sealed) return false;
  if (revealed.has(s.id)) return false;
  if (s.expiresAt != null && s.expiresAt <= now) return false;
  return true;
}

/**
 * Decide whether to hum, and about what.
 *
 * Returns the state to persist in every branch, so the caller can write once
 * without knowing which branch it took. The state is returned unchanged when
 * nothing happened (notably during the cooldown), so a burst of fixes can't
 * quietly push the cooldown forward and starve the next real hum.
 */
export function decide(input: DecideInput): Decision {
  const {
    fix,
    nearby,
    state,
    now,
    gate,
    revealedIds = [],
    radiusM = DEFAULT_NOTIFY_RADIUS_M,
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = input;

  const checked = markChecked(state, fix);

  if (state.lastFiredAt != null && now - state.lastFiredAt < cooldownMs) {
    // Note: `state`, not `checked` — inside the cooldown we didn't really look,
    // so the next fix should still be allowed to.
    return { fire: null, distanceM: null, reason: 'cooldown', state };
  }

  const revealed = new Set(revealedIds);
  const inRange = nearby
    .filter(s => isCandidate(s, revealed, now))
    .map(s => ({ secret: s, distanceM: haversineMeters(fix, s.drop.coordinate) }))
    .filter(c => c.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);

  if (inRange.length === 0) {
    return { fire: null, distanceM: null, reason: 'no-candidates', state: checked };
  }

  const fired = new Set(state.firedDropIds);
  const fresh = inRange.filter(c => !fired.has(c.secret.id));
  if (fresh.length === 0) {
    return { fire: null, distanceM: null, reason: 'already-fired', state: checked };
  }

  const best = fresh[0];
  const verdict = gate({
    now,
    coordinate: fix,
    distanceM: best.distanceM,
    secret: best.secret,
  });

  if (!verdict.allowed) {
    // Passed through untouched. If this module ever starts interpreting a
    // reason, there are two gates again.
    return { fire: null, distanceM: null, reason: verdict.reason, state: checked };
  }

  const firedDropIds = [...state.firedDropIds, best.secret.id];
  return {
    fire: best.secret,
    distanceM: best.distanceM,
    reason: 'fire',
    state: {
      lastFiredAt: now,
      firedDropIds:
        firedDropIds.length > FIRED_ID_CAP
          ? firedDropIds.slice(firedDropIds.length - FIRED_ID_CAP)
          : firedDropIds,
      lastCheckCoord: fix,
    },
  };
}
