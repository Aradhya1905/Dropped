import { create } from 'zustand';

import { MOODS, type Mood } from '../types';
import { getMoodFilter, setMoodFilter } from '../services/storage';

interface MoodFilterState {
  /** Moods the map shows. Never empty — all four means "no filter". */
  moods: Mood[];
  /**
   * Flip one mood on/off. Refuses to switch off the last one (returns false)
   * so the map can't be filtered down to nothing.
   */
  toggle: (mood: Mood) => boolean;
  showAll: () => void;
}

/**
 * The You tab's "show me" filter. Lives in a store (not just MMKV) because the
 * Map tab stays mounted and has to re-render the moment it changes.
 */
export const useMoodFilterStore = create<MoodFilterState>()((set, get) => ({
  moods: getMoodFilter(),

  toggle(mood: Mood) {
    const { moods } = get();
    const on = moods.includes(mood);
    if (on && moods.length === 1) return false;
    // Rebuild from MOODS so the order stays stable whatever the tap order.
    const next = MOODS.filter(m => (m === mood ? !on : moods.includes(m)));
    setMoodFilter(next);
    set({ moods: next });
    return true;
  },

  showAll() {
    const next = [...MOODS];
    setMoodFilter(next);
    set({ moods: next });
  },
}));
