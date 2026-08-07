/**
 * The mood colour map has to cover every mood. A missing entry doesn't crash —
 * `moodColor` falls back to sage, so the pin renders in the wrong colour and
 * looks entirely deliberate. That is the kind of bug nobody reports.
 */
import { MOODS } from '../../types';
import { moodColor, moodColors } from './mood';

describe('moodColors', () => {
  it('has an entry for every mood', () => {
    MOODS.forEach(mood => {
      expect(moodColors[mood]).toBeDefined();
      expect(moodColors[mood].ink).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(moodColors[mood].tint).toMatch(/^rgba\(/);
    });
  });

  it('has no extra entries beyond the four moods', () => {
    expect(Object.keys(moodColors).sort()).toEqual([...MOODS].sort());
  });

  it('gives every mood a distinct ink', () => {
    const inks = MOODS.map(m => moodColors[m].ink);
    expect(new Set(inks).size).toBe(MOODS.length);
  });

  it('keeps every wash at the palette alpha, so tints stay washes', () => {
    MOODS.forEach(mood => {
      expect(moodColors[mood].tint).toContain('0.14)');
    });
  });
});

describe('moodColor', () => {
  it('returns the mood’s own colours', () => {
    MOODS.forEach(mood => {
      expect(moodColor(mood)).toBe(moodColors[mood]);
    });
  });

  it('falls back to sage rather than throwing on an unknown mood', () => {
    expect(moodColor(undefined)).toBe(moodColors.wonder);
    expect(moodColor('dread' as never)).toBe(moodColors.wonder);
  });
});
