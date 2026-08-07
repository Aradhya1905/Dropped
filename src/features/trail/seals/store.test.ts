/**
 * The collection's one promise: a seal never changes after it is pressed.
 * Everything else here is round-tripping; the `revealCount: 40` test is the
 * feature.
 */
import { clearAll, getSeal, getSealCities } from '../../../services/storage';
import type { Secret } from '../../../types';
import { recordSeal, sealFor, sealsFor } from './store';

const AT_NOON = new Date(2026, 6, 15, 13, 0, 0).getTime();

const secret = (over: Partial<Secret> = {}): Secret => ({
  id: 's1',
  drop: { id: 'd1', coordinate: { lat: 12.97, lng: 77.59 }, createdAt: AT_NOON },
  createdAt: AT_NOON,
  mood: 'ache',
  hearts: 0,
  stoodHere: 1,
  replyCount: 0,
  sealed: false,
  saved: false,
  hearted: false,
  shareable: true,
  ...over,
});

beforeEach(() => clearAll());

describe('recordSeal', () => {
  it('presses a seal and stores it', () => {
    const seal = recordSeal({
      secretId: 's1',
      mood: 'joy',
      revealCountAtReveal: 3,
      revealedAt: AT_NOON,
    });
    expect(seal).toEqual({ motif: 'plain', tint: 'joy', night: false });
    expect(getSeal('s1')).toEqual({ motif: 'plain', tint: 'joy', night: false, at: AT_NOON });
  });

  it('never re-presses: a first-finder seal survives 39 more people finding it', () => {
    // The whole point of storing the variant. If this regresses, everyone's
    // collection silently rewrites itself as drops get popular.
    const first = recordSeal({
      secretId: 's1',
      mood: 'ache',
      revealCountAtReveal: 1,
      revealedAt: AT_NOON,
    });
    expect(first.motif).toBe('first');

    const again = recordSeal({
      secretId: 's1',
      mood: 'ache',
      revealCountAtReveal: 40,
      revealedAt: AT_NOON + 86_400_000,
    });
    expect(again.motif).toBe('first');
    expect(getSeal('s1')?.motif).toBe('first');
    expect(getSeal('s1')?.at).toBe(AT_NOON);
  });

  it('stamps the first find in a city, and not the second', () => {
    const first = recordSeal({
      secretId: 's1',
      mood: 'wonder',
      revealCountAtReveal: 5,
      revealedAt: AT_NOON,
      city: 'Bengaluru',
    });
    expect(first.motif).toBe('city');

    const second = recordSeal({
      secretId: 's2',
      mood: 'wonder',
      revealCountAtReveal: 5,
      revealedAt: AT_NOON,
      city: 'Bengaluru',
    });
    expect(second.motif).toBe('plain');
    expect(getSealCities()).toEqual(['Bengaluru']);
  });

  it('remembers the city even when another motif won', () => {
    // A first-finder seal in a new city is still evidence you have been there,
    // otherwise the next reveal in that city would stamp a second "first city".
    recordSeal({
      secretId: 's1',
      mood: 'joy',
      revealCountAtReveal: 1,
      revealedAt: AT_NOON,
      city: 'Lisbon',
    });
    expect(getSealCities()).toEqual(['Lisbon']);
  });
});

describe('sealFor', () => {
  it('reads back what was pressed', () => {
    recordSeal({ secretId: 's1', mood: 'joy', revealCountAtReveal: 1, revealedAt: AT_NOON });
    expect(sealFor(secret()).motif).toBe('first');
  });

  it('falls back to a plain seal rather than a hole in the page', () => {
    // Your own drops were never revealed by you, and a wiped device still has
    // its reveals server-side.
    expect(sealFor(secret({ mood: 'trouble' }))).toEqual({
      motif: 'plain',
      tint: 'trouble',
      night: false,
    });
  });

  it('falls back when a stored tint is a mood the app no longer knows', () => {
    recordSeal({ secretId: 's1', mood: 'dread' as never, revealCountAtReveal: 2, revealedAt: AT_NOON });
    expect(sealFor(secret()).tint).toBe('wonder');
  });
});

describe('sealsFor', () => {
  it('answers for a whole page, mixing stored and fallback seals', () => {
    recordSeal({ secretId: 's1', mood: 'joy', revealCountAtReveal: 1, revealedAt: AT_NOON });
    const seals = sealsFor([secret(), secret({ id: 's2', mood: 'wonder' })]);
    expect(seals.s1.motif).toBe('first');
    expect(seals.s2).toEqual({ motif: 'plain', tint: 'wonder', night: false });
  });
});

describe('a wiped device', () => {
  it('loses its collection with everything else', () => {
    // Keeps the panic wipe honest: seals are device-local, so `clearAll` has to
    // actually clear them.
    recordSeal({ secretId: 's1', mood: 'joy', revealCountAtReveal: 1, revealedAt: AT_NOON });
    clearAll();
    expect(getSeal('s1')).toBeNull();
    expect(getSealCities()).toEqual([]);
  });
});
