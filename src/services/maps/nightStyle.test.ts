import { resolveMapStyle } from './nightStyle';
import { sunTimes } from '../../utils/sun';

/** Greenwich, so UTC timestamps in the test read as roughly local solar time. */
const LONDON = { lat: 51.4779, lng: 0 };
const utc = (iso: string): number => Date.parse(iso);

describe('sunTimes', () => {
  // Published times for London on the 2026 summer solstice are 03:43 and 20:21
  // UTC. Asserting to the minute would be asserting the ephemeris; a few
  // minutes proves the algorithm is right and not, say, an hour out on the
  // equation of time.
  it('matches published sunrise/sunset at the solstice', () => {
    const { sunrise, sunset } = sunTimes(LONDON, utc('2026-06-21T12:00:00Z'));
    expect(sunrise).not.toBeNull();
    expect(sunset).not.toBeNull();

    const minutesFrom = (ms: number, iso: string) =>
      Math.abs(ms - utc(iso)) / 60_000;
    expect(minutesFrom(sunrise as number, '2026-06-21T03:43:00Z')).toBeLessThan(5);
    expect(minutesFrom(sunset as number, '2026-06-21T20:21:00Z')).toBeLessThan(5);
  });

  it('returns null inside the polar circle when the sun never sets', () => {
    // Longyearbyen in June: midnight sun, so there is no sunrise or sunset to
    // report and inventing one would be worse than saying so.
    const { sunrise, sunset } = sunTimes(
      { lat: 78.22, lng: 15.63 },
      utc('2026-06-21T12:00:00Z'),
    );
    expect(sunrise).toBeNull();
    expect(sunset).toBeNull();
  });
});

describe('resolveMapStyle', () => {
  describe("with 'auto'", () => {
    // Sunrise 03:43, sunset 20:21 UTC on this date.
    const cases: Array<[string, string]> = [
      ['2026-06-21T02:00:00Z', 'droppedNight'], // before sunrise
      ['2026-06-21T06:00:00Z', 'dropped'],
      ['2026-06-21T13:00:00Z', 'dropped'],
      ['2026-06-21T20:00:00Z', 'dropped'], // sun is still up until 20:21
      ['2026-06-21T23:00:00Z', 'droppedNight'],
    ];

    it.each(cases)('at %s resolves to %s', (iso, expected) => {
      expect(resolveMapStyle('auto', LONDON, utc(iso))).toBe(expected);
    });
  });

  it('lets a manual choice win over the sun, at any hour', () => {
    const midnight = utc('2026-06-21T23:00:00Z');
    const noon = utc('2026-06-21T13:00:00Z');
    expect(resolveMapStyle('dropped', LONDON, midnight)).toBe('dropped');
    expect(resolveMapStyle('droppedNight', LONDON, noon)).toBe('droppedNight');
    expect(resolveMapStyle('grayscale', LONDON, midnight)).toBe('grayscale');
  });

  it('falls back to the day style when there is no fix, rather than throwing', () => {
    // A wrongly-bright map is an annoyance; a wrongly-dark one looks like the
    // tiles failed to load.
    expect(resolveMapStyle('auto', null, utc('2026-06-21T23:00:00Z'))).toBe('dropped');
    expect(resolveMapStyle('auto', undefined)).toBe('dropped');
  });

  it('follows the sun through the polar circles without a hole', () => {
    const arctic = { lat: 78.22, lng: 15.63 };
    // Midnight sun: never night, even at local midnight.
    expect(resolveMapStyle('auto', arctic, utc('2026-06-21T23:00:00Z'))).toBe('dropped');
    // Polar night: never day, even at local noon.
    expect(resolveMapStyle('auto', arctic, utc('2026-12-21T12:00:00Z'))).toBe('droppedNight');
  });
});
