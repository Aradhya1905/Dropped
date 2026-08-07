/**
 * The precedence ladder is pinned here rather than in a comment, because the
 * one thing this function must never do is answer "it depends".
 */
import { MOODS } from '../../../types';
import { deriveSeal, isNightAt, WORN_REVEALS, type SealInput } from './derive';

/** A daylight reveal, so `night` never contaminates a motif assertion. */
const AT_NOON = new Date(2026, 6, 15, 13, 0, 0).getTime();
const AT_2AM = new Date(2026, 6, 15, 2, 0, 0).getTime();

const input = (over: Partial<SealInput> = {}): SealInput => ({
  mood: 'ache',
  revealCountAtReveal: 5,
  revealedAt: AT_NOON,
  isNewCity: false,
  ...over,
});

describe('deriveSeal totality', () => {
  it('returns a defined motif and tint for every mood and reveal count', () => {
    for (const mood of MOODS) {
      for (const count of [1, 2, 50]) {
        const seal = deriveSeal(input({ mood, revealCountAtReveal: count }));
        expect(seal.motif).toBeDefined();
        expect(seal.tint).toBe(mood);
        expect(typeof seal.night).toBe('boolean');
      }
    }
  });

  it('treats a missing reveal count as an ordinary find rather than throwing', () => {
    // `revealCount` is optional on the wire; a seal must still press.
    expect(deriveSeal(input({ revealCountAtReveal: undefined })).motif).toBe('plain');
  });

  it('is pure — same input, deeply equal result', () => {
    const args = input({ revealCountAtReveal: 1 });
    expect(deriveSeal(args)).toEqual(deriveSeal(args));
  });
});

describe('deriveSeal motifs', () => {
  it('presses a first-finder seal when nobody had revealed it', () => {
    expect(deriveSeal(input({ revealCountAtReveal: 1 })).motif).toBe('first');
  });

  it('presses a worn seal on a well-trodden drop', () => {
    expect(deriveSeal(input({ revealCountAtReveal: WORN_REVEALS })).motif).toBe('worn');
    expect(deriveSeal(input({ revealCountAtReveal: 200 })).motif).toBe('worn');
  });

  it('presses a plain seal between the two', () => {
    expect(deriveSeal(input({ revealCountAtReveal: WORN_REVEALS - 1 })).motif).toBe('plain');
  });

  it('stamps the city, and only on a city seal', () => {
    const seal = deriveSeal(input({ city: 'Bengaluru', isNewCity: true }));
    expect(seal.motif).toBe('city');
    expect(seal.cityLabel).toBe('Bengaluru');
    expect(deriveSeal(input({ city: 'Bengaluru', isNewCity: false })).cityLabel).toBeUndefined();
  });

  it('cannot press a city seal without a city name to stamp', () => {
    expect(deriveSeal(input({ city: undefined, isNewCity: true })).motif).toBe('plain');
  });
});

describe('deriveSeal precedence', () => {
  it('resolves a first find, after dark, in a new city to exactly one motif', () => {
    // city > first > worn > plain. Change this and you are changing the
    // feature, not fixing the test.
    const seal = deriveSeal(
      input({
        revealCountAtReveal: 1,
        revealedAt: AT_2AM,
        city: 'Lisbon',
        isNewCity: true,
      }),
    );
    expect(seal.motif).toBe('city');
    expect(seal.night).toBe(true); // rides along, it is not part of the ladder
  });

  it('prefers first over worn when a count somehow satisfies both', () => {
    expect(deriveSeal(input({ revealCountAtReveal: 1 })).motif).toBe('first');
  });
});

describe('night wax', () => {
  it('cools after dark and not at midday', () => {
    expect(deriveSeal(input({ revealedAt: AT_2AM })).night).toBe(true);
    expect(deriveSeal(input({ revealedAt: AT_NOON })).night).toBe(false);
  });

  it('reads the local hour at both edges of the band', () => {
    expect(isNightAt(new Date(2026, 0, 2, 20, 0, 0).getTime())).toBe(true);
    expect(isNightAt(new Date(2026, 0, 2, 19, 59, 0).getTime())).toBe(false);
    expect(isNightAt(new Date(2026, 0, 2, 5, 59, 0).getTime())).toBe(true);
    expect(isNightAt(new Date(2026, 0, 2, 6, 0, 0).getTime())).toBe(false);
  });
});
