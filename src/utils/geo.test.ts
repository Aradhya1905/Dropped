import {
  cellBounds,
  cellIdFor,
  FOG_CELL_DEG,
  haversineMeters,
  isWithin,
  samplePathSteps,
} from './geo';
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

describe('fog cell grid', () => {
  it('is stable for the same coordinate', () => {
    expect(cellIdFor(a)).toBe(cellIdFor(a));
  });

  it('is idempotent within one cell', () => {
    const jittered = {
      lat: a.lat + FOG_CELL_DEG / 3,
      lng: a.lng + FOG_CELL_DEG / 3,
    };
    // Only true when `a` isn't sitting right on a cell edge — snap it inward.
    const inside = {
      lat: Math.floor(a.lat / FOG_CELL_DEG) * FOG_CELL_DEG + FOG_CELL_DEG / 4,
      lng: Math.floor(a.lng / FOG_CELL_DEG) * FOG_CELL_DEG + FOG_CELL_DEG / 4,
    };
    expect(cellIdFor(inside)).toBe(
      cellIdFor({ lat: inside.lat + FOG_CELL_DEG / 4, lng: inside.lng }),
    );
    expect(cellIdFor(jittered)).toMatch(/^-?\d+:-?\d+$/);
  });

  it('separates coordinates more than a cell apart', () => {
    const far = { lat: a.lat + FOG_CELL_DEG * 1.5, lng: a.lng };
    expect(cellIdFor(far)).not.toBe(cellIdFor(a));
  });

  it('cellBounds contains the coordinate that produced the id', () => {
    const [sw, ne] = cellBounds(cellIdFor(a))!;
    expect(a.lat).toBeGreaterThanOrEqual(sw.lat);
    expect(a.lat).toBeLessThanOrEqual(ne.lat);
    expect(a.lng).toBeGreaterThanOrEqual(sw.lng);
    expect(a.lng).toBeLessThanOrEqual(ne.lng);
  });

  it('measures roughly 10 m on a side at mid-latitude', () => {
    const [sw, ne] = cellBounds(cellIdFor(a))!;
    const northSouth = haversineMeters(sw, { lat: ne.lat, lng: sw.lng });
    const eastWest = haversineMeters(sw, { lat: sw.lat, lng: ne.lng });
    expect(northSouth).toBeGreaterThan(8);
    expect(northSouth).toBeLessThan(12);
    // East-west shrinks by cos(lat) — still ~10 m this close to the equator.
    expect(eastWest).toBeGreaterThan(8);
    expect(eastWest).toBeLessThan(12);
  });

  it('returns null for a malformed id', () => {
    expect(cellBounds('nonsense')).toBeNull();
  });
});

describe('samplePathSteps', () => {
  // A due-east leg from a: heading should be ~90°.
  const east = { lat: a.lat, lng: a.lng + 0.01 };

  it('skips the start vertex and spaces points along the line', () => {
    const steps = samplePathSteps([a, east], 100);
    expect(steps.length).toBeGreaterThan(0);
    // First step must be past the start, not sitting on it.
    expect(haversineMeters(steps[0].coord, a)).toBeGreaterThan(50);
  });

  it('tags each step with the segment travel heading', () => {
    const steps = samplePathSteps([a, east], 100);
    // Walking due east → heading near 90°.
    expect(steps[0].headingDeg).toBeGreaterThan(80);
    expect(steps[0].headingDeg).toBeLessThan(100);
  });

  it('returns nothing for a degenerate line', () => {
    expect(samplePathSteps([], 50)).toEqual([]);
    expect(samplePathSteps([a], 50)).toEqual([]);
  });
});
