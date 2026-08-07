import { isSustainedMovement, type TimedFix } from './movement';

const START = { lat: 12.9716, lng: 77.5946 };
const T0 = 1_700_000_000_000;

/** Metres north of START, as a latitude offset. */
const north = (m: number) => START.lat + m / 111_320;

/** A fix every `stepMs`, walking north at `speedMs`. */
function walk(count: number, speedMs: number, stepMs = 5_000): TimedFix[] {
  return Array.from({ length: count }, (_, i) => ({
    at: T0 + i * stepMs,
    coordinate: {
      lat: north(((i * stepMs) / 1000) * speedMs),
      lng: START.lng,
    },
  }));
}

/** Standing still, with the dot dancing ±`jitterM` and no net displacement. */
function jitter(count: number, jitterM: number, stepMs = 5_000): TimedFix[] {
  return Array.from({ length: count }, (_, i) => ({
    at: T0 + i * stepMs,
    // Alternating sign, so the average displacement really is zero.
    coordinate: { lat: north(i % 2 === 0 ? jitterM : -jitterM), lng: START.lng },
  }));
}

describe('isSustainedMovement', () => {
  it('says no while you sit at your desk, however much the GPS wanders', () => {
    // The case the whole feature exists to fix: ±8 m of noise is not a walk.
    expect(isSustainedMovement(jitter(13, 8))).toBe(false);
  });

  it('says yes to a 90-second walk at strolling pace', () => {
    expect(isSustainedMovement(walk(19, 1.3))).toBe(true);
  });

  it('says no to a five-second shuffle inside an otherwise still minute', () => {
    const still = jitter(13, 2);
    // One burst of real movement between two fixes, then stillness again.
    const burst = still.map((f, i) =>
      i === 6
        ? { ...f, coordinate: { lat: north(6.5), lng: START.lng } }
        : f,
    );
    expect(isSustainedMovement(burst)).toBe(false);
  });

  it('is not fooled by a single teleporting fix', () => {
    // Indoors, one fix relocates you to a cell tower and back. Averaging alone
    // would let that outlier drag the tail centroid into "walking".
    const still = jitter(13, 5);
    const teleport = still.map((f, i) =>
      i === 11 ? { ...f, coordinate: { lat: north(500), lng: START.lng } } : f,
    );
    expect(isSustainedMovement(teleport)).toBe(false);
  });

  it('says no with fewer than two fixes, and never throws', () => {
    expect(isSustainedMovement([])).toBe(false);
    expect(isSustainedMovement([{ at: T0, coordinate: START }])).toBe(false);
    expect(isSustainedMovement(null)).toBe(false);
    expect(isSustainedMovement(undefined)).toBe(false);
  });

  it('says no when the fixes are too sparse to judge', () => {
    // Three fixes over four seconds says nothing about the last minute.
    expect(isSustainedMovement(walk(3, 1.3, 2_000))).toBe(false);
  });

  it('only looks at the recent window', () => {
    // A brisk walk that ended five minutes ago is not movement now.
    const old = walk(19, 1.3);
    const parkedSince = old[old.length - 1];
    const sitting = Array.from({ length: 13 }, (_, i) => ({
      at: parkedSince.at + 300_000 + i * 5_000,
      coordinate: parkedSince.coordinate,
    }));
    expect(isSustainedMovement([...old, ...sitting])).toBe(false);
  });

  it('accepts fixes out of order', () => {
    expect(isSustainedMovement([...walk(19, 1.3)].reverse())).toBe(true);
  });

  it('honours a custom threshold', () => {
    const strolling = walk(19, 1.0);
    expect(isSustainedMovement(strolling, { minSpeedMs: 2 })).toBe(false);
    expect(isSustainedMovement(strolling, { minSpeedMs: 0.5 })).toBe(true);
  });
});
