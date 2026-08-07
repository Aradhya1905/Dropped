/**
 * seals/store — the derive-once rule, in one place.
 *
 * `services/storage` holds seals but decides nothing about them; `derive.ts`
 * decides but remembers nothing. This joins the two, and it is the only module
 * that may write a seal.
 */
import {
  getSeal,
  getSealCities,
  getSeals,
  putSeal,
  type StoredSeal,
} from '../../../services/storage';
import { MOODS, type Mood, type Secret } from '../../../types';
import { deriveSeal, type SealVariant } from './derive';

/** A stored seal read back as the variant the UI renders. */
function toVariant(stored: StoredSeal): SealVariant {
  return {
    motif: stored.motif,
    // A tint that no longer exists (a mood retired since the seal was pressed)
    // falls back rather than rendering `undefined` wax.
    tint: (MOODS as readonly string[]).includes(stored.tint)
      ? (stored.tint as Mood)
      : 'wonder',
    night: stored.night === true,
    ...(stored.cityLabel ? { cityLabel: stored.cityLabel } : {}),
  };
}

/**
 * Press the seal for a reveal — once.
 *
 * Called from `useReveal`'s `onSuccess`, which is the only moment
 * `revealCountAtReveal` is knowable: the server's count includes the reveal it
 * just accepted, so a first finder sees 1. Calling it again for the same secret
 * returns the seal already pressed and writes nothing, so a re-reveal (or a
 * replayed mutation) can't age your own history.
 */
export function recordSeal(input: {
  secretId: string;
  mood: Mood;
  revealCountAtReveal?: number;
  revealedAt: number;
  city?: string;
}): SealVariant {
  const existing = getSeal(input.secretId);
  if (existing) {
    return toVariant(existing);
  }

  const variant = deriveSeal({
    mood: input.mood,
    revealCountAtReveal: input.revealCountAtReveal,
    revealedAt: input.revealedAt,
    city: input.city,
    isNewCity: input.city != null && !getSealCities().includes(input.city),
  });

  putSeal(input.secretId, {
    ...variant,
    // Kept even when the city motif didn't win — see `getSealCities`.
    ...(input.city ? { city: input.city } : {}),
    at: input.revealedAt,
  });
  return variant;
}

/**
 * The seal to draw for a secret in the scrapbook.
 *
 * Falls back to a plain seal in the secret's mood when nothing was stored:
 * drops you wrote yourself were never revealed by you, and anyone who cleared
 * app data still has their reveals server-side. A plain seal is a truthful "you
 * have this"; a hole in the grid would just look like a bug.
 */
export function sealFor(secret: Secret): SealVariant {
  const stored = getSeal(secret.id);
  return stored ? toVariant(stored) : plainSeal(secret);
}

/**
 * The same answer for a whole page of the scrapbook, off **one** read of the
 * store. The grid renders every secret in a tab, and `sealFor` would re-parse
 * the collection once per seal.
 */
export function sealsFor(secrets: Secret[]): Record<string, SealVariant> {
  const stored = getSeals();
  const out: Record<string, SealVariant> = {};
  for (const secret of secrets) {
    const found = stored[secret.id];
    out[secret.id] = found ? toVariant(found) : plainSeal(secret);
  }
  return out;
}

function plainSeal(secret: Secret): SealVariant {
  return { motif: 'plain', tint: secret.mood, night: false };
}
