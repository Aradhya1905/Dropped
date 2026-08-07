import {
  bandFor,
  hapticFor,
  periodFor,
  ringPeriodFor,
  WARMTH_COLD_M,
  WARMTH_FAR_M,
  WARMTH_HOT_M,
  WARMTH_WARM_M,
  type WarmthBand,
} from './useWarmth';

describe('bandFor', () => {
  it('buckets a fresh reading into the right band', () => {
    expect(bandFor(250)).toBe('cold');
    expect(bandFor(175)).toBe('far');
    expect(bandFor(100)).toBe('warm');
    expect(bandFor(60)).toBe('hot');
    expect(bandFor(30)).toBe('arrived');
  });

  it('puts each boundary in the warmer band', () => {
    expect(bandFor(WARMTH_COLD_M)).toBe('far'); // 200
    expect(bandFor(WARMTH_FAR_M)).toBe('warm'); // 150
    expect(bandFor(WARMTH_WARM_M)).toBe('hot'); // 70
    expect(bandFor(WARMTH_HOT_M)).toBe('arrived'); // 50
  });

  it('warms up immediately, with no hysteresis inward', () => {
    expect(bandFor(149, 'far')).toBe('warm');
    expect(bandFor(69, 'warm')).toBe('hot');
    expect(bandFor(49, 'hot')).toBe('arrived');
  });

  it('holds the band until you drift clear of its edge', () => {
    // Standing on the 70 m line: GPS jitter must not rattle hot ↔ warm.
    expect(bandFor(71, 'hot')).toBe('hot');
    expect(bandFor(79, 'hot')).toBe('hot');
    expect(bandFor(82, 'hot')).toBe('warm');
  });

  it('applies hysteresis at every outward boundary', () => {
    expect(bandFor(55, 'arrived')).toBe('arrived');
    expect(bandFor(61, 'arrived')).toBe('hot');
    expect(bandFor(155, 'warm')).toBe('warm');
    expect(bandFor(161, 'warm')).toBe('far');
    expect(bandFor(205, 'far')).toBe('far');
    expect(bandFor(211, 'far')).toBe('cold');
  });

  it('lets a big jump skip bands rather than stepping one at a time', () => {
    expect(bandFor(400, 'arrived')).toBe('cold');
    expect(bandFor(10, 'cold')).toBe('arrived');
  });
});

describe('periodFor', () => {
  it('is silent where the design says silent', () => {
    expect(periodFor('cold')).toBeNull();
    // The reveal snap owns this band — the client never pulses inside 50 m.
    expect(periodFor('arrived')).toBeNull();
  });

  it('strictly quickens as the bands warm', () => {
    const far = periodFor('far')!;
    const warm = periodFor('warm')!;
    const hot = periodFor('hot')!;
    expect(far).toBeGreaterThan(warm);
    expect(warm).toBeGreaterThan(hot);
    expect(hot).toBeGreaterThan(0);
  });
});

describe('hapticFor', () => {
  it('matches the silent bands', () => {
    expect(hapticFor('cold')).toBeNull();
    expect(hapticFor('arrived')).toBeNull();
  });

  it('gets heavier as you close in', () => {
    expect(hapticFor('far')).toBe('tick');
    expect(hapticFor('hot')).toBe('thump');
  });
});

describe('ringPeriodFor', () => {
  it('always returns a period, so the ring animates even when silent', () => {
    const bands: WarmthBand[] = ['cold', 'far', 'warm', 'hot', 'arrived'];
    for (const band of bands) {
      expect(ringPeriodFor(band)).toBeGreaterThan(0);
    }
  });

  it('quickens in step with the haptics', () => {
    expect(ringPeriodFor('cold')).toBeGreaterThan(ringPeriodFor('far'));
    expect(ringPeriodFor('far')).toBeGreaterThan(ringPeriodFor('warm'));
    expect(ringPeriodFor('warm')).toBeGreaterThan(ringPeriodFor('hot'));
    expect(ringPeriodFor('hot')).toBeGreaterThan(ringPeriodFor('arrived'));
  });
});
