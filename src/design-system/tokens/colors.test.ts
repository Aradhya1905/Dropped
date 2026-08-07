import { highContrastColors, paperColors } from './colors';

describe('the colour token sets', () => {
  /**
   * The one test that matters here. A high-contrast set missing a key doesn't
   * fail loudly — it hands a component `undefined`, which React Native renders
   * as "no colour" (transparent text, no border) on a device belonging to
   * someone who turned high contrast on because they were struggling to see.
   * Key equality catches that at build time instead.
   */
  it('have identical keys', () => {
    expect(Object.keys(highContrastColors).sort()).toEqual(
      Object.keys(paperColors).sort(),
    );
  });

  /**
   * White on the accent fill is already the maximum contrast available, so it
   * is the one token with nothing to raise.
   */
  const UNCHANGED_BY_DESIGN = new Set(['onAccent']);

  it('defines every value as a non-empty string, and actually raises contrast', () => {
    for (const [key, value] of Object.entries(highContrastColors)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      if (UNCHANGED_BY_DESIGN.has(key)) continue;
      // A key silently copied across would pass the equality test above while
      // doing nothing for the person who turned the setting on.
      expect(`${key}:${value}`).not.toBe(
        `${key}:${(paperColors as Record<string, string>)[key]}`,
      );
    }
  });
});
