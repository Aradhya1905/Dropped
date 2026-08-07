/**
 * Warmth on approach — hot/cold feedback while you walk a secret into range.
 *
 * The distance to the drop is bucketed into five bands; each band owns a haptic
 * pulse rate and a matching `PulseRing` period, so the buzz in your hand and the
 * ring on screen quicken at the same moment. See FUN_TODOs/02-warmth-haptics.md.
 *
 * Foreground only: the GPS watch lives in the React tree, so warmth stops when
 * the walk screen does. "Phone in your pocket" needs the background walk engine
 * (FUN_TODOs/16).
 *
 * The band thresholds are the source of truth for the walk's beats too —
 * `WalkSequenceScreen` derives its own constants from these so the visual and
 * the felt states can't drift apart.
 */
import { useEffect, useRef, useState } from 'react';

import { trigger, type HapticKind } from '../../../services/haptics';
import { REVEAL_RADIUS_M, WHISPER_RADIUS_M } from '../../../types';

/** Beyond this you get nothing — the secret isn't "near" in any useful sense. */
export const WARMTH_COLD_M = 200;
/**
 * First contact: a slow, faint thump. Also the walk's "in range" line, and the
 * line the whisper appears on — one constant so the buzz, the beat and the
 * teaser can't drift apart.
 */
export const WARMTH_FAR_M = WHISPER_RADIUS_M;
/** Quickening. Also how far along the route footsteps stay lit. */
export const WARMTH_WARM_M = 70;
/** Inside this you've unlocked it; the reveal owns the feel from here. */
export const WARMTH_HOT_M = REVEAL_RADIUS_M;

/**
 * How far past a band's outer edge you must drift before stepping back out of
 * it. Standing on a boundary with GPS jitter must not rattle between two bands.
 */
export const WARMTH_HYSTERESIS_M = 10;

export type WarmthBand = 'cold' | 'far' | 'warm' | 'hot' | 'arrived';

/** Cold → hot. Index is used to tell "getting warmer" from "cooling off". */
const ORDER: WarmthBand[] = ['cold', 'far', 'warm', 'hot', 'arrived'];

/** Outer edge of each band, in metres. */
const OUTER_EDGE_M: Record<WarmthBand, number> = {
  arrived: WARMTH_HOT_M,
  hot: WARMTH_WARM_M,
  warm: WARMTH_FAR_M,
  far: WARMTH_COLD_M,
  cold: Infinity,
};

/** Milliseconds between haptic pulses; `null` = silent. */
const PERIOD_MS: Record<WarmthBand, number | null> = {
  cold: null,
  far: 4000,
  warm: 2000,
  hot: 900,
  // Silent on purpose: the single hard snap comes from the server-confirmed
  // reveal, not from the client deciding it's close enough.
  arrived: null,
};

/** What each band feels like. Rate carries most of the signal, weight the rest. */
const KIND: Record<WarmthBand, HapticKind | null> = {
  cold: null,
  far: 'tick',
  warm: 'tick',
  hot: 'thump',
  arrived: null,
};

/**
 * `PulseRing` cycle length per band. Never null — the ring keeps animating even
 * where the haptics are silent (and carries the whole feature on a phone with a
 * weak motor, or with haptics switched off).
 */
const RING_PERIOD_MS: Record<WarmthBand, number> = {
  cold: 4200,
  far: 3600,
  warm: 3000,
  hot: 1600,
  arrived: 1100,
};

/** The band a distance falls in, ignoring where you came from. */
function rawBand(distanceM: number): WarmthBand {
  if (distanceM <= WARMTH_HOT_M) return 'arrived';
  if (distanceM <= WARMTH_WARM_M) return 'hot';
  if (distanceM <= WARMTH_FAR_M) return 'warm';
  if (distanceM <= WARMTH_COLD_M) return 'far';
  return 'cold';
}

/**
 * The band for a distance, with hysteresis on the way out.
 *
 * Warming up is immediate — that's the fun direction, and overshooting inward
 * costs nothing. Cooling off needs {@link WARMTH_HYSTERESIS_M} of real
 * separation from the band's edge, so a phone sitting on the 70 m line doesn't
 * stutter between `hot` and `warm` once a second.
 */
export function bandFor(distanceM: number, previous?: WarmthBand): WarmthBand {
  const next = rawBand(distanceM);
  if (previous === undefined) {
    return next;
  }
  const coolingOff = ORDER.indexOf(next) < ORDER.indexOf(previous);
  if (coolingOff && distanceM < OUTER_EDGE_M[previous] + WARMTH_HYSTERESIS_M) {
    return previous;
  }
  return next;
}

/** Milliseconds between haptic pulses in a band; `null` when it should be silent. */
export function periodFor(band: WarmthBand): number | null {
  return PERIOD_MS[band];
}

/** Which haptic a band pulses with; `null` when it should be silent. */
export function hapticFor(band: WarmthBand): HapticKind | null {
  return KIND[band];
}

/** `PulseRing` cycle length for a band, in ms. */
export function ringPeriodFor(band: WarmthBand): number {
  return RING_PERIOD_MS[band];
}

export interface UseWarmthResult {
  band: WarmthBand;
  /** Current haptic period; `null` in the silent bands. */
  periodMs: number | null;
  /** Matching `PulseRing` cycle length. */
  ringPeriodMs: number;
}

/**
 * Drive warmth from a live distance-to-drop. Pass `null` while there's no fix —
 * the band is held rather than reset, so a dropped fix doesn't buzz on recovery.
 *
 * Pulses fire on band change and then on the band's period. Never once per GPS
 * fix, and never at a cadence tied to the GPS rate.
 */
export function useWarmth(distanceM: number | null): UseWarmthResult {
  const [band, setBand] = useState<WarmthBand>('cold');
  const bandRef = useRef<WarmthBand>('cold');

  useEffect(() => {
    if (distanceM == null || !Number.isFinite(distanceM)) {
      return;
    }
    const next = bandFor(distanceM, bandRef.current);
    if (next !== bandRef.current) {
      bandRef.current = next;
      setBand(next);
    }
  }, [distanceM]);

  useEffect(() => {
    const kind = hapticFor(band);
    const period = periodFor(band);
    if (kind == null || period == null) {
      return;
    }
    trigger(kind);
    const id = setInterval(() => trigger(kind), period);
    return () => clearInterval(id);
  }, [band]);

  return { band, periodMs: periodFor(band), ringPeriodMs: ringPeriodFor(band) };
}
