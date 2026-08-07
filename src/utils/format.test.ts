import { agoLabel, echoAgo, relTime } from './format';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date('2026-08-07T12:00:00Z').getTime();

const ago = (ms: number) => NOW - ms;

describe('relTime (the compact stamp)', () => {
  it('collapses anything under a day to today', () => {
    expect(relTime(ago(3 * HOUR), NOW)).toBe('today');
  });

  it('counts days, then months, then years', () => {
    expect(relTime(ago(3 * DAY), NOW)).toBe('3d ago');
    expect(relTime(ago(120 * DAY), NOW)).toBe('4mo ago');
    expect(relTime(ago(800 * DAY), NOW)).toBe('2y ago');
  });

  it('reads a future timestamp as today rather than a negative age', () => {
    // A device with a skewed clock must not produce "-1d ago".
    expect(relTime(NOW + 5 * DAY, NOW)).toBe('today');
  });
});

describe('agoLabel (the sentence)', () => {
  it('speaks the recent past', () => {
    expect(agoLabel(ago(10 * 1000), NOW)).toBe('just now');
    expect(agoLabel(ago(1 * MINUTE), NOW)).toBe('a minute ago');
    expect(agoLabel(ago(20 * MINUTE), NOW)).toBe('20 minutes ago');
    expect(agoLabel(ago(1 * HOUR), NOW)).toBe('an hour ago');
    expect(agoLabel(ago(30 * HOUR), NOW)).toBe('yesterday');
    expect(agoLabel(ago(9 * DAY), NOW)).toBe('9 days ago');
  });

  it('never says "1 year ago" or "1 month ago"', () => {
    // The numeral reads like a database row; this string sits under things
    // people wrote about their lives.
    expect(agoLabel(ago(370 * DAY), NOW)).toBe('a year ago');
    expect(agoLabel(ago(32 * DAY), NOW)).toBe('a month ago');
  });

  it('pluralises past one', () => {
    expect(agoLabel(ago(800 * DAY), NOW)).toBe('2 years ago');
    expect(agoLabel(ago(120 * DAY), NOW)).toBe('4 months ago');
  });

  it('never prints a bare date', () => {
    for (const days of [0, 1, 5, 40, 200, 366, 900]) {
      expect(agoLabel(ago(days * DAY), NOW)).not.toMatch(/\d{4}|\//);
    }
  });
});

describe('echoAgo (the anniversary)', () => {
  it('spells each interval in words', () => {
    expect(echoAgo('6mo')).toBe('six months ago');
    expect(echoAgo('1yr')).toBe('a year ago');
    expect(echoAgo('2yr')).toBe('two years ago');
  });

  it('is what the card says, not a re-derivation from the clock', () => {
    // The server picked the window (±3 days). Deriving the phrase from the
    // timestamp on device could disagree by a day and turn "a year ago" into
    // "11 months ago" — the one thing an anniversary card must never say.
    const almostAYear = ago(363 * DAY);
    expect(agoLabel(almostAYear, NOW)).toBe('11 months ago');
    expect(echoAgo('1yr')).toBe('a year ago');
  });
});
