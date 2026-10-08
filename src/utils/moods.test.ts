import type { Mood, Secret } from '../types';
import { filterByMood, isAllMoods } from './moods';

function secret(id: string, mood: Mood, chained = false): Secret {
  return {
    id,
    drop: { id, coordinate: { lat: 12, lng: 77.6 }, createdAt: 0 },
    createdAt: 0,
    mood,
    hearts: 0,
    stoodHere: 0,
    sealed: true,
    saved: false,
    hearted: false,
    ...(chained ? { chain: { id: 't1', pos: 1, length: 2 } } : {}),
  };
}

describe('moods', () => {
  const drops = [
    secret('a', 'joy'),
    secret('b', 'ache'),
    secret('c', 'wonder'),
    secret('d', 'trouble', true),
  ];

  it('returns the same list when every mood is chosen', () => {
    expect(filterByMood(drops, ['joy', 'ache', 'trouble', 'wonder'])).toBe(drops);
    expect(isAllMoods(['wonder', 'joy', 'trouble', 'ache'])).toBe(true);
  });

  it('keeps only the chosen moods', () => {
    expect(filterByMood(drops, ['joy', 'wonder']).map(d => d.id)).toEqual(['a', 'c', 'd']);
  });

  it('always keeps trail stops', () => {
    expect(filterByMood(drops, ['ache']).map(d => d.id)).toEqual(['b', 'd']);
  });
});
