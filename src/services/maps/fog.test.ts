import {
  cellsToRects,
  coveragePercent,
  fogFeature,
  formatCoverage,
  padView,
  CITY_CELL_TARGET,
  type FogRect,
} from './fog';
import { cellIdFor, FOG_CELL_DEG } from '../../utils/geo';

const D = FOG_CELL_DEG;

/** Rectangles overlap if they share any interior area. */
function overlaps(a: FogRect, b: FogRect): boolean {
  return (
    a.west < b.east && b.west < a.east && a.south < b.north && b.south < a.north
  );
}

describe('cellsToRects', () => {
  it('returns nothing for an empty set', () => {
    expect(cellsToRects([], null)).toEqual([]);
  });

  it('turns one cell into one cell-sized rectangle', () => {
    const rects = cellsToRects(['10:20'], null);
    expect(rects).toHaveLength(1);
    expect(rects[0].west).toBeCloseTo(20 * D, 10);
    expect(rects[0].east).toBeCloseTo(21 * D, 10);
    expect(rects[0].south).toBeCloseTo(10 * D, 10);
    expect(rects[0].north).toBeCloseTo(11 * D, 10);
  });

  it('merges a horizontal run into one rectangle', () => {
    const rects = cellsToRects(['5:1', '5:2', '5:3'], null);
    expect(rects).toHaveLength(1);
    expect(rects[0].west).toBeCloseTo(1 * D, 10);
    expect(rects[0].east).toBeCloseTo(4 * D, 10);
  });

  it('merges a vertical run into one rectangle', () => {
    const rects = cellsToRects(['1:9', '2:9', '3:9'], null);
    expect(rects).toHaveLength(1);
    expect(rects[0].south).toBeCloseTo(1 * D, 10);
    expect(rects[0].north).toBeCloseTo(4 * D, 10);
  });

  it('keeps a gap in a row as two rectangles', () => {
    const rects = cellsToRects(['5:1', '5:2', '5:9'], null);
    expect(rects).toHaveLength(2);
  });

  it('never emits overlapping rectangles (they become polygon holes)', () => {
    // An L-shaped walk: three cells east, then three cells north.
    const cells = ['0:0', '0:1', '0:2', '1:2', '2:2', '3:2'];
    const rects = cellsToRects(cells, null);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it('is order- and duplicate-insensitive', () => {
    const a = cellsToRects(['5:1', '5:2', '5:3'], null);
    const b = cellsToRects(['5:3', '5:1', '5:2', '5:2'], null);
    expect(b).toEqual(a);
  });

  it('drops cells outside the viewport', () => {
    const view = { west: 0, south: 0, east: 5 * D, north: 5 * D };
    const rects = cellsToRects(['1:1', '900:900'], view);
    expect(rects).toHaveLength(1);
    expect(rects[0].west).toBeCloseTo(1 * D, 10);
  });

  it('ignores malformed ids', () => {
    expect(cellsToRects(['nonsense', '', 'a:b'], null)).toEqual([]);
  });

  it('honours the rectangle cap', () => {
    // Alternating columns so nothing merges: 50 separate rectangles.
    const cells = Array.from({ length: 50 }, (_, i) => `0:${i * 2}`);
    expect(cellsToRects(cells, null, 10)).toHaveLength(10);
  });

  it('round-trips a real coordinate through cellIdFor', () => {
    const here = { lat: 12.9756, lng: 77.6094 };
    const rects = cellsToRects([cellIdFor(here)], null);
    expect(rects).toHaveLength(1);
    expect(here.lat).toBeGreaterThanOrEqual(rects[0].south);
    expect(here.lat).toBeLessThanOrEqual(rects[0].north);
    expect(here.lng).toBeGreaterThanOrEqual(rects[0].west);
    expect(here.lng).toBeLessThanOrEqual(rects[0].east);
  });
});

describe('padView', () => {
  it('grows the box by a share of its own span', () => {
    const padded = padView({ west: 0, south: 0, east: 10, north: 20 }, 0.5);
    expect(padded).toEqual({ west: -5, south: -10, east: 15, north: 30 });
  });
});

describe('fogFeature', () => {
  it('is the whole world when nothing has been walked', () => {
    const f = fogFeature([]);
    expect(f.geometry.coordinates).toHaveLength(1);
    expect(f.geometry.coordinates[0][0]).toEqual([-180, -85]);
  });

  it('adds one closed interior ring per walked rectangle', () => {
    const f = fogFeature(cellsToRects(['0:0', '5:5'], null));
    expect(f.geometry.coordinates).toHaveLength(3); // world + 2 holes
    for (const ring of f.geometry.coordinates) {
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  it('winds holes opposite to the exterior ring', () => {
    const [outer, hole] = fogFeature(cellsToRects(['0:0'], null)).geometry
      .coordinates;
    expect(signedArea(outer)).toBeGreaterThan(0); // counter-clockwise
    expect(signedArea(hole)).toBeLessThan(0); // clockwise
  });
});

/** Shoelace: positive = counter-clockwise. */
function signedArea(ring: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

describe('coverage', () => {
  it('is 0 with nothing walked and 100 at the target', () => {
    expect(coveragePercent(0)).toBe(0);
    expect(coveragePercent(CITY_CELL_TARGET)).toBe(100);
  });

  it('never exceeds 100', () => {
    expect(coveragePercent(CITY_CELL_TARGET * 3)).toBe(100);
  });

  it('formats small values without collapsing to 0%', () => {
    expect(formatCoverage(0)).toBe('0%');
    expect(formatCoverage(1)).toBe('<0.1%');
    expect(formatCoverage(Math.round(CITY_CELL_TARGET * 0.024))).toBe('2.4%');
    expect(formatCoverage(Math.round(CITY_CELL_TARGET * 0.5))).toBe('50%');
  });
});
