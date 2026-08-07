/**
 * The lying compass — the needle is only honest up close.
 *
 * Far away it drifts and points vaguely; as you close, the drift narrows; inside
 * the whisper band it locks on and stays put. A perfectly accurate arrow turns
 * the walk into following a route (which `useFootRoute` already does better) —
 * an unreliable one turns the last stretch into a search, and leaves the exact
 * spot ambiguous enough that you look at the actual bench instead of the phone.
 * See FUN_TODOs/12-lying-compass.md.
 *
 * Two rules this file exists to keep:
 *  - the drift is **deterministic** on `(dropId, time bucket)`, never per-frame
 *    random. It has to read as a heavy, unreliable instrument, not a glitch —
 *    and seeding on the drop id means reopening the screen doesn't re-roll it.
 *  - the **distance readout is never touched**. One unreliable signal is
 *    playful; two is a broken app.
 */
import { useEffect, useState } from 'react';

import { getAccurateCompass, onAccurateCompassChange } from '../../../services/storage';
import { WHISPER_RADIUS_M } from '../../../types';

/**
 * Inside this the needle is exactly honest — no drift at all.
 *
 * It is {@link WHISPER_RADIUS_M} on purpose: the needle steadying, the whisper
 * appearing and the warmth haptics quickening are then all the same line, so the
 * bands read as one system rather than three features with their own opinions
 * (`useWarmth.WARMTH_FAR_M` is the same constant). The ticket asks for a lock
 * below 100 m; locking at 150 satisfies that and costs one fewer threshold.
 */
export const NEEDLE_LOCK_M = WHISPER_RADIUS_M;

/** At or beyond this the needle is at its most useless. */
export const NEEDLE_DRIFT_M = 400;

/** Worst-case drift, in degrees, either side of the true bearing. */
export const NEEDLE_MAX_DRIFT_DEG = 35;

/**
 * How long a drifted bearing holds before the next one. Long enough that the
 * needle *settles* between moves — at 4 s the tween below has finished well
 * before the next value arrives, which is what makes it read as weight rather
 * than as jitter.
 */
export const WOBBLE_BUCKET_MS = 4000;

/** Tween used when the needle is locked (and the floor for every other tween). */
export const NEEDLE_TWEEN_LOCKED_MS = 300;

/** Extra tween time at maximum drift — a heavy needle swinging, not a twitch. */
const NEEDLE_TWEEN_DRIFT_MS = 1100;

/** FNV-1a. Small, fast, and stable across reloads — which is the whole point. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    /* eslint-disable-next-line no-bitwise -- FNV-1a */
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  /* eslint-disable-next-line no-bitwise -- to unsigned */
  return h >>> 0;
}

/** Deterministic pseudo-random in [-1, 1] from a drop id and a time bucket. */
export function wobbleAt(dropId: string, bucket: number): number {
  return (hash(`${dropId}:${bucket}`) / 0xffffffff) * 2 - 1;
}

/**
 * Degrees of drift to add at this distance. Exactly 0 inside
 * {@link NEEDLE_LOCK_M} — the lock is a guarantee, not an approximation.
 *
 * The curve is `t^1.5` rather than linear so the drift collapses over the last
 * stretch instead of easing away evenly: it's ~35° out at 400 m, ~16° at 300 m,
 * ~4° at 200 m. The needle should feel like it's *finding* the place.
 */
export function wobbleAmplitude(distanceM: number): number {
  // NaN means "we don't know where you are", and an unknown distance must not
  // produce an unknown needle — treat it as locked.
  if (Number.isNaN(distanceM) || distanceM <= NEEDLE_LOCK_M) return 0;
  if (distanceM >= NEEDLE_DRIFT_M) return NEEDLE_MAX_DRIFT_DEG;
  const t = (distanceM - NEEDLE_LOCK_M) / (NEEDLE_DRIFT_M - NEEDLE_LOCK_M);
  return NEEDLE_MAX_DRIFT_DEG * Math.pow(t, 1.5);
}

/**
 * The needle bearing actually shown, in [0, 360).
 *
 * `accurate` returns `trueBearing` untouched (including its exact value, not a
 * normalized copy) — the accessibility path must be provably a no-op.
 */
export function apparentBearing(
  trueBearing: number,
  distanceM: number,
  dropId: string,
  bucket: number,
  accurate: boolean,
): number {
  if (accurate) return trueBearing;
  const drift = wobbleAmplitude(distanceM) * wobbleAt(dropId, bucket);
  return ((((trueBearing + drift) % 360) + 360) % 360);
}

/**
 * How long the needle should take to reach a new bearing. Slow and heavy while
 * it's lying, back to the crisp {@link NEEDLE_TWEEN_LOCKED_MS} once it locks.
 */
export function needleTweenMs(distanceM: number | null): number {
  const amp = wobbleAmplitude(distanceM ?? 0);
  return Math.round(
    NEEDLE_TWEEN_LOCKED_MS + (amp / NEEDLE_MAX_DRIFT_DEG) * NEEDLE_TWEEN_DRIFT_MS,
  );
}

/** The current drift bucket. Exported for tests; not interesting otherwise. */
export function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / WOBBLE_BUCKET_MS);
}

export interface NeedleWobble {
  /** What to hand `<Compass rotation>`. `null` keeps its ambient-sway branch. */
  rotation: number | null;
  /** What to hand `<Compass tweenMs>`. */
  tweenMs: number;
  /** True while the needle is telling the truth (locked, or the toggle is on). */
  honest: boolean;
}

/**
 * Wrap a true bearing in the lie. `trueBearing` is whatever the screen already
 * computed (bearing to the drop, minus device heading) — drift is additive, so
 * it doesn't matter which side of that subtraction it lands on.
 */
export function useNeedleWobble(
  trueBearing: number | null,
  distanceM: number | null,
  dropId: string,
): NeedleWobble {
  const [accurate, setAccurate] = useState(getAccurateCompass);
  useEffect(() => {
    // Re-read on mount as well as on change: the flag may have been flipped on
    // the You tab while this screen was merely backgrounded, not unmounted.
    setAccurate(getAccurateCompass());
    const sub = onAccurateCompassChange(() => setAccurate(getAccurateCompass()));
    return () => sub.remove();
  }, []);

  const drifting =
    !accurate && distanceM != null && wobbleAmplitude(distanceM) > 0;

  const [bucket, setBucket] = useState(currentBucket);
  useEffect(() => {
    if (!drifting) return;
    setBucket(currentBucket());
    const id = setInterval(() => setBucket(currentBucket()), WOBBLE_BUCKET_MS);
    return () => clearInterval(id);
  }, [drifting]);

  if (trueBearing == null) {
    return { rotation: null, tweenMs: NEEDLE_TWEEN_LOCKED_MS, honest: true };
  }

  return {
    rotation: apparentBearing(
      trueBearing,
      distanceM ?? 0,
      dropId,
      bucket,
      accurate,
    ),
    tweenMs: accurate ? NEEDLE_TWEEN_LOCKED_MS : needleTweenMs(distanceM),
    honest: !drifting,
  };
}
