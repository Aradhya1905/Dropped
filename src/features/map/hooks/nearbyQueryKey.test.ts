/**
 * The nearby query key decides two things that are easy to break and hard to
 * notice: whether standing still refetches the map, and whether toggling a
 * mood chip twice lands back on a cached result. Both are pure, so they're
 * tested here without a renderer.
 */
import { nearbyQueryKey } from './useNearbyDrops';

const bengaluru = { lat: 12.9716, lng: 77.5946 };

/** Shift a coordinate north by roughly `m` metres. */
const north = (c: { lat: number; lng: number }, m: number) => ({
  lat: c.lat + m / 111_320,
  lng: c.lng,
});

describe('nearbyQueryKey — grid snapping', () => {
  it('gives two points 5 m apart the same key (GPS jitter must not refetch)', () => {
    expect(nearbyQueryKey(north(bengaluru, 5))).toEqual(
      nearbyQueryKey(bengaluru),
    );
  });

  it('gives two points 50 m apart different keys (real movement refetches)', () => {
    expect(nearbyQueryKey(north(bengaluru, 50))).not.toEqual(
      nearbyQueryKey(bengaluru),
    );
  });

  it('handles a null coordinate without throwing', () => {
    expect(() => nearbyQueryKey(null)).not.toThrow();
  });
});

describe('nearbyQueryKey — mood filter', () => {
  it('is order-independent', () => {
    expect(nearbyQueryKey(bengaluru, ['joy', 'wonder'])).toEqual(
      nearbyQueryKey(bengaluru, ['wonder', 'joy']),
    );
  });

  it('treats all four moods as no filter at all', () => {
    expect(
      nearbyQueryKey(bengaluru, ['joy', 'ache', 'trouble', 'wonder']),
    ).toEqual(nearbyQueryKey(bengaluru, []));
  });

  it('separates different filters', () => {
    expect(nearbyQueryKey(bengaluru, ['joy'])).not.toEqual(
      nearbyQueryKey(bengaluru, ['ache']),
    );
  });

  it('separates a filter from no filter', () => {
    expect(nearbyQueryKey(bengaluru, ['joy'])).not.toEqual(
      nearbyQueryKey(bengaluru, []),
    );
  });

  it('keeps the grid snap intact while filtering', () => {
    expect(nearbyQueryKey(north(bengaluru, 5), ['joy'])).toEqual(
      nearbyQueryKey(bengaluru, ['joy']),
    );
  });
});
