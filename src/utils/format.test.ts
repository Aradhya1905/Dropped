import {
  MIN_WALK_STEPS,
  droppedAgo,
  formatDistance,
  postmarkLine,
  relativeTime,
  stepsLine,
} from './format';

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

describe('postmarkLine', () => {
  // Local-time constructor so the test is timezone-independent.
  const tuesdayNight = new Date(2026, 9, 6, 22, 15).getTime(); // Tue 6 Oct 2026, 22:15
  const saturdayMorning = new Date(2026, 9, 10, 8, 0).getTime();

  it('reads weather + weekday + part of day', () => {
    expect(postmarkLine(tuesdayNight, 'rainy')).toBe('left on a rainy Tuesday night');
    expect(postmarkLine(saturdayMorning, 'overcast')).toBe('left on a grey Saturday morning');
  });

  it('drops the weather word when there is none', () => {
    expect(postmarkLine(tuesdayNight)).toBe('left on a Tuesday night');
  });

  it('buckets the hours', () => {
    const at = (h: number) => postmarkLine(new Date(2026, 9, 6, h).getTime());
    expect(at(4)).toMatch(/night$/);
    expect(at(5)).toMatch(/morning$/);
    expect(at(12)).toMatch(/afternoon$/);
    expect(at(17)).toMatch(/evening$/);
    expect(at(21)).toMatch(/night$/);
  });
});

describe('stepsLine', () => {
  it('groups thousands', () => {
    expect(stepsLine(1240)).toBe('1,240 steps to read this');
    expect(stepsLine(1234567)).toBe('1,234,567 steps to read this');
  });

  it('prints nothing for a non-walk', () => {
    expect(stepsLine(undefined)).toBeNull();
    expect(stepsLine(MIN_WALK_STEPS - 1)).toBeNull();
    expect(stepsLine(MIN_WALK_STEPS)).toBe(`${MIN_WALK_STEPS} steps to read this`);
  });
});
