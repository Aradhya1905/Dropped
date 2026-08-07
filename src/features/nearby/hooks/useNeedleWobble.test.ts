import {
  apparentBearing,
  currentBucket,
  NEEDLE_DRIFT_M,
  NEEDLE_LOCK_M,
  NEEDLE_MAX_DRIFT_DEG,
  NEEDLE_TWEEN_LOCKED_MS,
  needleTweenMs,
  wobbleAmplitude,
  wobbleAt,
  WOBBLE_BUCKET_MS,
} from './useNeedleWobble';

const IDS = ['a', 'drop-1', 'drop-2', '7f1c0f9e-0b2a-4c3d-8e5f-1a2b3c4d5e6f', ''];

describe('wobbleAt', () => {
  it('is deterministic for the same id and bucket', () => {
    expect(wobbleAt('abc', 42)).toBe(wobbleAt('abc', 42));
    // …and across a fresh module instance, which is what makes reopening the
    // screen show the same needle rather than re-rolling it.
    jest.resetModules();
    const fresh = require('./useNeedleWobble');
    expect(fresh.wobbleAt('abc', 42)).toBe(wobbleAt('abc', 42));
  });

  it('gives different drops their own instrument', () => {
    const values = IDS.map(id => wobbleAt(id, 42));
    expect(new Set(values).size).toBe(IDS.length);
  });

  it('drifts over time for the same drop', () => {
    const values = [0, 1, 2, 3, 4, 5].map(b => wobbleAt('abc', 100 + b));
    expect(new Set(values).size).toBe(values.length);
  });

  it('stays within [-1, 1]', () => {
    for (const id of IDS) {
      for (let bucket = 0; bucket < 500; bucket++) {
        const v = wobbleAt(id, bucket);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('wobbleAmplitude', () => {
  it('never grows as you get closer', () => {
    let previous = Infinity;
    for (let d = 1000; d >= 0; d--) {
      const amp = wobbleAmplitude(d);
      expect(amp).toBeLessThanOrEqual(previous);
      previous = amp;
    }
  });

  it('is exactly zero inside the lock radius', () => {
    expect(wobbleAmplitude(99)).toBe(0);
    expect(wobbleAmplitude(10)).toBe(0);
    expect(wobbleAmplitude(0)).toBe(0);
    expect(wobbleAmplitude(NEEDLE_LOCK_M)).toBe(0);
  });

  it('caps at the maximum drift far out', () => {
    expect(wobbleAmplitude(NEEDLE_DRIFT_M)).toBe(NEEDLE_MAX_DRIFT_DEG);
    expect(wobbleAmplitude(50_000)).toBe(NEEDLE_MAX_DRIFT_DEG);
  });

  it('survives a missing or nonsense distance', () => {
    expect(wobbleAmplitude(NaN)).toBe(0);
    expect(wobbleAmplitude(-5)).toBe(0);
    expect(wobbleAmplitude(Infinity)).toBe(NEEDLE_MAX_DRIFT_DEG);
  });
});

describe('apparentBearing', () => {
  it('returns the true bearing untouched when accurate', () => {
    for (const d of [0, 60, 150, 300, 1200]) {
      expect(apparentBearing(123.456, d, 'abc', 7, true)).toBe(123.456);
    }
  });

  it('is honest inside the lock radius even when lying is allowed', () => {
    expect(apparentBearing(123, 40, 'abc', 7, false)).toBeCloseTo(123, 10);
  });

  it('lies by no more than the amplitude at that distance', () => {
    const amp = wobbleAmplitude(300);
    for (let bucket = 0; bucket < 200; bucket++) {
      const shown = apparentBearing(180, 300, 'abc', bucket, false);
      expect(Math.abs(shown - 180)).toBeLessThanOrEqual(amp + 1e-9);
    }
  });

  it('normalizes into [0, 360) across the seam', () => {
    for (const id of IDS) {
      for (let bucket = 0; bucket < 200; bucket++) {
        for (const trueBearing of [358, 2, 0, 359.9]) {
          const shown = apparentBearing(trueBearing, 1000, id, bucket, false);
          expect(shown).toBeGreaterThanOrEqual(0);
          expect(shown).toBeLessThan(360);
        }
      }
    }
  });
});

describe('needleTweenMs', () => {
  it('is the crisp tween when locked or unknown', () => {
    expect(needleTweenMs(40)).toBe(NEEDLE_TWEEN_LOCKED_MS);
    expect(needleTweenMs(null)).toBe(NEEDLE_TWEEN_LOCKED_MS);
  });

  it('gets heavier with distance', () => {
    expect(needleTweenMs(1000)).toBeGreaterThan(needleTweenMs(250));
    expect(needleTweenMs(250)).toBeGreaterThan(needleTweenMs(NEEDLE_LOCK_M));
  });
});

describe('currentBucket', () => {
  it('advances once per bucket length', () => {
    expect(currentBucket(0)).toBe(0);
    expect(currentBucket(WOBBLE_BUCKET_MS - 1)).toBe(0);
    expect(currentBucket(WOBBLE_BUCKET_MS)).toBe(1);
  });
});
