import { haversineMeters, isWithin } from './geo';
import { REVEAL_RADIUS_M } from '../types';

// Two points on Bengaluru's MG Road, ~1 block apart.
const a = { lat: 12.9756, lng: 77.6094 };
const b = { lat: 12.9759, lng: 77.61 };

describe('geo', () => {
  it('measures a known short distance within tolerance', () => {
    const d = haversineMeters(a, b);
    // ~70 m on the ground; allow generous slack.
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(120);
  });

  it('is 0 m for identical points', () => {
    expect(haversineMeters(a, a)).toBeCloseTo(0, 5);
  });

  it('isWithin uses the 50 m reveal radius by default', () => {
    expect(isWithin(a, a)).toBe(true);
    // ~70 m apart → outside the 50 m unlock.
    expect(isWithin(a, b)).toBe(false);
    // but inside a wider radius.
    expect(isWithin(a, b, 200)).toBe(true);
  });

  it('exports the documented reveal radius', () => {
    expect(REVEAL_RADIUS_M).toBe(50);
  });
});
