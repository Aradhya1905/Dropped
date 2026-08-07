import {
  daysUntilExpiry,
  fadeOpacity,
  fadesInLabel,
  isExpired,
} from './expiry';

const NOW = Date.parse('2026-08-07T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const inDays = (d: number) => NOW + d * DAY;

describe('isExpired', () => {
  it('is false for a drop that lives forever', () => {
    expect(isExpired(undefined, NOW)).toBe(false);
  });

  it('is false while there is time left', () => {
    expect(isExpired(inDays(0.001), NOW)).toBe(false);
  });

  // Matches the server, which keeps a row only while expires_at > now().
  it('is true at the instant itself', () => {
    expect(isExpired(NOW, NOW)).toBe(true);
  });
});

describe('daysUntilExpiry', () => {
  it('is null for a drop that lives forever', () => {
    expect(daysUntilExpiry(undefined, NOW)).toBeNull();
  });

  it('rounds a part-day up', () => {
    expect(daysUntilExpiry(inDays(0.5), NOW)).toBe(1);
    expect(daysUntilExpiry(inDays(6.7), NOW)).toBe(7);
  });

  it('floors at 0 rather than going negative', () => {
    expect(daysUntilExpiry(inDays(-3), NOW)).toBe(0);
  });
});

describe('fadesInLabel', () => {
  it('renders nothing when the drop never fades', () => {
    expect(fadesInLabel(undefined, NOW)).toBeNull();
  });

  it('says "fades today" inside the last day', () => {
    expect(fadesInLabel(inDays(0.5), NOW)).toBe('fades today');
    expect(fadesInLabel(inDays(1), NOW)).toBe('fades today');
  });

  // Rounds up: a drop with 6.7 days left has not yet entered its 6th day.
  it('counts whole days, rounded up', () => {
    expect(fadesInLabel(inDays(6.7), NOW)).toBe('fades in 7 days');
    expect(fadesInLabel(inDays(3), NOW)).toBe('fades in 3 days');
  });

  it('says "faded" once it is gone', () => {
    expect(fadesInLabel(inDays(-1), NOW)).toBe('faded');
  });
});

describe('fadeOpacity', () => {
  it('leaves a forever drop fully opaque', () => {
    expect(fadeOpacity(undefined, NOW)).toBe(1);
  });

  it('does not start fading a drop with more than a week left', () => {
    expect(fadeOpacity(inDays(30), NOW)).toBe(1);
    expect(fadeOpacity(inDays(7), NOW)).toBe(1);
  });

  it('thins out as expiry nears, monotonically', () => {
    const six = fadeOpacity(inDays(6), NOW);
    const two = fadeOpacity(inDays(2), NOW);
    expect(six).toBeLessThan(1);
    expect(two).toBeLessThan(six);
  });

  it('never reaches invisible — an unseeable pin is unwalkable', () => {
    expect(fadeOpacity(inDays(-10), NOW)).toBeGreaterThanOrEqual(0.45);
    expect(fadeOpacity(inDays(0), NOW)).toBeGreaterThanOrEqual(0.45);
  });
});
