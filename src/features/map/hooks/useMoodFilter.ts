/**
 * The map's mood filter, persisted across restarts.
 *
 * `[]` means no filter — every mood shows. Selecting all four collapses back to
 * `[]` rather than being stored as a four-item list, so "everything" has one
 * representation instead of two (which would otherwise split the query cache).
 */
import { useCallback, useState } from 'react';

import { MOODS, type Mood } from '../../../types';
import { getMoodFilter, setMoodFilter } from '../../../services/storage';

export function useMoodFilter() {
  const [moods, setMoods] = useState<Mood[]>(() => getMoodFilter());

  const toggle = useCallback((mood: Mood) => {
    setMoods(prev => {
      // An empty filter means "all showing", so the first tap has to read as
      // "only this one" rather than "all except this one".
      const next = prev.includes(mood)
        ? prev.filter(m => m !== mood)
        : [...prev, mood];
      const normalized = next.length === MOODS.length ? [] : next;
      setMoodFilter(normalized);
      return normalized;
    });
  }, []);

  const clear = useCallback(() => {
    setMoodFilter([]);
    setMoods([]);
  }, []);

  return { moods, toggle, clear, filtering: moods.length > 0 };
}
