import { droppedAgo, formatDistance, relativeTime } from './format';

const NOW = Date.UTC(2026, 7, 22, 12, 0, 0);
const ago = (ms: number) => NOW - ms;

describe('relativeTime', () => {
  it('reads "just now" only inside the first minute', () => {
    expect(relativeTime(ago(5_000), NOW)).toBe('just now');
    expect(relativeTime(ago(90_000), NOW)).toBe('1m ago');
  });

  it('steps through minutes, hours and days', () => {
    expect(relativeTime(ago(45 * 60_000), NOW)).toBe('45m ago');
    expect(relativeTime(ago(5 * 3600_000), NOW)).toBe('5h ago');
    expect(relativeTime(ago(26 * 3600_000), NOW)).toBe('yesterday');
    expect(relativeTime(ago(9 * 24 * 3600_000), NOW)).toBe('9d ago');
  });

  it('does not call a months-old drop "just now" (the old bug)', () => {
    expect(relativeTime(ago(95 * 24 * 3600_000), NOW)).toBe('3mo ago');
    expect(relativeTime(ago(800 * 24 * 3600_000), NOW)).toBe('2y ago');
  });

  it('never shows a negative age for clock skew', () => {
    expect(relativeTime(NOW + 60_000, NOW)).toBe('just now');
  });
});

describe('droppedAgo', () => {
  it('prefixes the byline form', () => {
    expect(droppedAgo(ago(2 * 24 * 3600_000), NOW)).toBe('dropped 2d ago');
  });
});

describe('formatDistance', () => {
  it('uses metres up close and km beyond a kilometre', () => {
    expect(formatDistance(42.4)).toBe('42 m');
    expect(formatDistance(999)).toBe('999 m');
    expect(formatDistance(2400)).toBe('2.4 km');
  });
});
