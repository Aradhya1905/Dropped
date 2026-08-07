/**
 * movement — "is this person actually walking, or are they at their desk?"
 *
 * The single most important input to the notification gate. A hum that fires
 * while someone is sitting still is why walking apps get their notifications
 * switched off, and a switched-off walking app is an uninstall with extra steps.
 *
 * Pure over an array of fixes, so the judgement is testable without GPS. If the
 * platform activity-recognition API is ever wired up (`ACTIVITY_RECOGNITION` is
 * already declared in the manifest for the step counter, so it costs no new
 * prompt), it goes behind this same function rather than beside it.
 */
import type { Coordinate } from '../../types';
import { haversineMeters } from '../../utils/geo';

/** One remembered GPS fix. */
export interface TimedFix {
  /** ms epoch. */
  at: number;
  coordinate: Coordinate;
}

export interface MovementOptions {
  /** Sustained speed that counts as walking. ~0.7 m/s ≈ a slow stroll. */
  minSpeedMs?: number;
  /** How far back to look. */
  windowMs?: number;
}

export const DEFAULT_MIN_SPEED_MS = 0.7;
export const DEFAULT_WINDOW_MS = 60_000;

/**
 * Faster than a sprint, so it can only be a GPS jump. A single fix like this —
 * common indoors, where the phone briefly relocates you to a cell tower — would
 * otherwise read as movement and defeat the entire feature, so it is dropped
 * rather than averaged in.
 */
const MAX_PLAUSIBLE_SPEED_MS = 12;

/** Fixes needed before we'll call it either way. */
const MIN_FIXES = 3;

/**
 * Whether the recent fixes describe *sustained* movement.
 *
 * Compares the average position of the oldest third of the window with the
 * newest third, rather than first-fix to last-fix. That averaging is what
 * separates the two cases this has to get right:
 *
 * - **standing still with GPS jitter** — ±8 m of noise averages out to roughly
 *   no displacement, so the answer is `false` however violently the dot dances;
 * - **a five-second shuffle in an otherwise still minute** — real displacement,
 *   but divided by the whole window it stays well under the threshold.
 *
 * Returns `false` when it can't tell (too few fixes, or a window too sparse to
 * judge): silence is the safe answer, since the cost of a wrong `true` is a
 * notification someone didn't want.
 */
export function isSustainedMovement(
  fixes: readonly TimedFix[] | null | undefined,
  opts: MovementOptions = {},
): boolean {
  const minSpeedMs = opts.minSpeedMs ?? DEFAULT_MIN_SPEED_MS;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;

  if (!fixes || fixes.length < 2) {
    return false;
  }

  const sorted = [...fixes].sort((a, b) => a.at - b.at);
  const newest = sorted[sorted.length - 1].at;
  const recent = sorted.filter(f => newest - f.at <= windowMs);
  const clean = withoutTeleports(recent);

  if (clean.length < MIN_FIXES) {
    return false;
  }
  // Half a window of evidence, minimum: a burst of fixes over three seconds
  // says nothing about whether someone is walking.
  if (clean[clean.length - 1].at - clean[0].at < windowMs / 2) {
    return false;
  }

  const size = Math.max(1, Math.floor(clean.length / 3));
  const head = clean.slice(0, size);
  const tail = clean.slice(clean.length - size);

  const seconds = (meanTime(tail) - meanTime(head)) / 1000;
  if (seconds <= 0) {
    return false;
  }

  return haversineMeters(centroid(head), centroid(tail)) / seconds >= minSpeedMs;
}

/**
 * Drop fixes that imply an impossible speed from the last accepted one. The
 * outlier is skipped, not used as the new reference, so a lone jump-and-return
 * leaves the remaining fixes intact.
 */
function withoutTeleports(fixes: readonly TimedFix[]): TimedFix[] {
  const out: TimedFix[] = [];
  for (const fix of fixes) {
    const prev = out[out.length - 1];
    if (prev) {
      const seconds = (fix.at - prev.at) / 1000;
      if (
        seconds > 0 &&
        haversineMeters(prev.coordinate, fix.coordinate) / seconds >
          MAX_PLAUSIBLE_SPEED_MS
      ) {
        continue;
      }
    }
    out.push(fix);
  }
  return out;
}

/**
 * Mean lat/lng. Fine at these scales — the points are metres apart, so the
 * spherical correction is far below GPS noise.
 */
function centroid(fixes: readonly TimedFix[]): Coordinate {
  let lat = 0;
  let lng = 0;
  for (const f of fixes) {
    lat += f.coordinate.lat;
    lng += f.coordinate.lng;
  }
  return { lat: lat / fixes.length, lng: lng / fixes.length };
}

function meanTime(fixes: readonly TimedFix[]): number {
  return fixes.reduce((sum, f) => sum + f.at, 0) / fixes.length;
}
