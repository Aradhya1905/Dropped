/**
 * seals/derive — what kind of wax a reveal leaves behind.
 *
 * Pure and total: one input, exactly one motif, no clock and no storage read
 * inside. That matters because the result is written down **once**, at reveal
 * time (see `services/storage.getOrDeriveSeal`), and never recomputed. If this
 * were re-derived on render, a stranger revealing the same drop next week would
 * quietly turn your first-finder seal into a worn one — a collection that
 * rewrites its own history is a broken collection.
 *
 * Deliberately absent: tiers, names, rarity scores. The seal is the whole
 * reward. See FUN_TODOs/11-wax-seal-collection.md.
 */
import type { SealMotif } from '../../../design-system/components';
import type { Mood } from '../../../types';

/**
 * How many reveals make a drop "well-trodden". A dozen strangers is enough for
 * a place to stop feeling like yours, and low enough to actually happen.
 */
export const WORN_REVEALS = 12;

/**
 * The night band, in local hours: 20:00 → 06:00.
 *
 * A crude stand-in for real sunset/sunrise. The server knows the true sun times
 * for a drop's coordinate (it gates `revealCondition` on them, see
 * `utils/revealCondition`), but it does not send them, and a seal is a keepsake
 * rather than a gate — being an hour off in June costs nothing. If sun times
 * ever reach the client, swap `isNightAt` for them and leave everything else.
 */
export const NIGHT_FROM_HOUR = 20;
export const NIGHT_UNTIL_HOUR = 6;

export interface SealVariant {
  motif: SealMotif;
  /** The mood the wax is tinted with. */
  tint: Mood;
  /** Found after dark — darker wax. Independent of `motif`. */
  night: boolean;
  /** Only ever set on a `city` motif. */
  cityLabel?: string;
}

export interface SealInput {
  mood: Mood;
  /**
   * The server's reveal count **including this reveal**, so the first finder
   * sees 1. Anything missing or nonsense is treated as an ordinary find.
   */
  revealCountAtReveal?: number;
  /** ms epoch of the reveal. */
  revealedAt: number;
  city?: string;
  /** Whether this device had already stamped a seal in that city. */
  isNewCity: boolean;
}

/** Whether a local timestamp falls inside the night band. */
export function isNightAt(revealedAt: number): boolean {
  const hour = new Date(revealedAt).getHours();
  return hour >= NIGHT_FROM_HOUR || hour < NIGHT_UNTIL_HOUR;
}

/**
 * The one seal a reveal earns.
 *
 * Precedence is **city > first > worn > plain**, and it is total: a first find
 * after dark in a new city is a `city` seal (dark, mood-tinted), not three
 * overlapping ones. A new city is the rarest of the three and the only one
 * that carries a place, so it wins. `night` is not part of the ladder — it is
 * a property of the wax, and rides along with whatever motif won.
 */
export function deriveSeal(input: SealInput): SealVariant {
  const { mood, revealedAt, city, isNewCity } = input;
  const count = Number.isFinite(input.revealCountAtReveal)
    ? (input.revealCountAtReveal as number)
    : 0;

  const night = isNightAt(revealedAt);
  const base = { tint: mood, night };

  if (isNewCity && city) {
    return { ...base, motif: 'city', cityLabel: city };
  }
  if (count === 1) {
    return { ...base, motif: 'first' };
  }
  if (count >= WORN_REVEALS) {
    return { ...base, motif: 'worn' };
  }
  return { ...base, motif: 'plain' };
}
