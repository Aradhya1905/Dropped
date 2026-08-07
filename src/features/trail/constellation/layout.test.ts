/**
 * The constellation is the one artifact users deliberately publish, so its
 * geometry is tested like arithmetic rather than like a view: determinism,
 * degenerate inputs that must not produce `NaN`, and a hard assertion that a
 * node carries nothing but geometry, a place, and a date.
 */
import {
  labelledNodes,
  layout,
  radiusFor,
  type ConstellationNode,
  type ConstellationPoint,
} from './layout';

const VIEW = { w: 320, h: 320 };
const PAD = 24;

const point = (
  id: string,
  lat: number,
  lng: number,
  at: number,
  revealCount = 1,
  label?: string,
): ConstellationPoint => ({
  id,
  coordinate: { lat, lng },
  revealCount,
  at,
  ...(label ? { label } : {}),
});

// A short walk across central Bengaluru, deliberately out of chronological
// order in the array — the layout must not care how the trail was paged.
const CITY: ConstellationPoint[] = [
  point('c', 12.9784, 77.6408, 3_000, 2, 'Ulsoor'),
  point('a', 12.9716, 77.5946, 1_000, 1, 'Cubbon Park'),
  point('d', 12.9698, 77.6499, 4_000, 9, 'Indiranagar'),
  point('b', 12.9762, 77.6033, 2_000, 5),
];

describe('constellation layout', () => {
  it('is deterministic — the same input draws the same picture', () => {
    const once = layout(CITY, VIEW, PAD);
    const twice = layout(CITY, VIEW, PAD);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });

  it('draws nothing at all from no points', () => {
    const result = layout([], VIEW, PAD);
    expect(result).toEqual({ nodes: [], path: '' });
    expect(JSON.stringify(result)).not.toContain('NaN');
  });

  it('centres a lone point and draws no line to it', () => {
    const result = layout([point('a', 12.97, 77.59, 1_000)], VIEW, PAD);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({ x: 160, y: 160 });
    expect(result.path).toBe('');
    expect(JSON.stringify(result)).not.toContain('NaN');
  });

  it('survives a city walked entirely on one spot', () => {
    // Two identical coordinates: a zero-width bounding box, and the one input
    // most likely to divide by zero.
    const result = layout(
      [point('a', 12.97, 77.59, 1_000), point('b', 12.97, 77.59, 2_000)],
      VIEW,
      PAD,
    );
    expect(JSON.stringify(result)).not.toContain('NaN');
    for (const n of result.nodes) {
      expect(n.x).toBe(160);
      expect(n.y).toBe(160);
    }
  });

  it('keeps every node inside the padded box, circle included', () => {
    for (const n of layout(CITY, VIEW, PAD).nodes) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(PAD);
      expect(n.x + n.r).toBeLessThanOrEqual(VIEW.w - PAD);
      expect(n.y - n.r).toBeGreaterThanOrEqual(PAD);
      expect(n.y + n.r).toBeLessThanOrEqual(VIEW.h - PAD);
    }
  });

  it('holds up when the padding is larger than the box', () => {
    const result = layout(CITY, { w: 40, h: 40 }, 60);
    expect(JSON.stringify(result)).not.toContain('NaN');
    for (const n of result.nodes) {
      expect(n.x).toBe(20);
      expect(n.y).toBe(20);
    }
  });

  it('walks the line in chronological order, not array order', () => {
    const { nodes, path } = layout(CITY, VIEW, PAD);
    expect(nodes.map(n => n.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.match(/L /g)).toHaveLength(3);
  });

  it('does not stretch a city sideways', () => {
    // One scale for both axes: a square of coordinates (allowing for the
    // cos(lat) correction) has to come out square, not letterboxed.
    const lat = 12.97;
    const dLat = 0.01;
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);
    const { nodes } = layout(
      [
        point('a', lat, 77.59, 1),
        point('b', lat + dLat, 77.59, 2),
        point('c', lat + dLat, 77.59 + dLng, 3),
        point('d', lat, 77.59 + dLng, 4),
      ],
      VIEW,
      PAD,
    );
    const width = Math.max(...nodes.map(n => n.x)) - Math.min(...nodes.map(n => n.x));
    const height = Math.max(...nodes.map(n => n.y)) - Math.min(...nodes.map(n => n.y));
    expect(Math.abs(width - height)).toBeLessThan(1);
  });

  it('sizes nodes by how many people stood there, clamped at both ends', () => {
    const radii = [0, 1, 5, 50, 5_000].map(radiusFor);
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]!).toBeGreaterThanOrEqual(radii[i - 1]!);
    }
    expect(radii[0]).toBe(2.6);
    expect(radii[radii.length - 1]).toBe(7);
    // A nonsense count is a small dot, not a NaN-sized one.
    expect(radiusFor(Number.NaN)).toBe(2.6);
  });

  it('puts nothing on a node but geometry, a place, and a date', () => {
    // The leak guard. The input type is a superset in practice — a caller with
    // a whole `Secret` in hand can pass one — so this asserts on what comes
    // *out*, which is what gets drawn and exported.
    const laden = {
      ...point('a', 12.97, 77.59, 1_000, 2, 'Cubbon Park'),
      body: 'the thing I never said',
      mood: 'ache',
    } as ConstellationPoint;

    const result = layout([laden], VIEW, PAD);
    expect(Object.keys(result.nodes[0]!).sort()).toEqual([
      'at',
      'id',
      'label',
      'r',
      'x',
      'y',
    ]);
    expect(JSON.stringify(result)).not.toContain('never said');
  });
});

describe('label thinning', () => {
  const node = (
    id: string,
    x: number,
    y: number,
    label?: string,
  ): ConstellationNode => ({ id, x, y, r: 3, at: Number(id), ...(label ? { label } : {}) });

  it('keeps the first of a crowded cluster and silences the rest', () => {
    const kept = labelledNodes(
      [node('1', 10, 10, 'Cubbon Park'), node('2', 14, 12, 'Also Cubbon Park')],
      20,
    );
    expect([...kept]).toEqual(['1']);
  });

  it('keeps names that stand apart', () => {
    const kept = labelledNodes(
      [node('1', 10, 10, 'Cubbon Park'), node('2', 200, 200, 'Indiranagar')],
      20,
    );
    expect(kept.size).toBe(2);
  });

  it('never offers a label for a node that has none', () => {
    expect(labelledNodes([node('1', 10, 10)], 20).size).toBe(0);
  });
});
