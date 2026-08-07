import { create } from 'zustand';

import type { Secret } from '../types';

interface DropsState {
  drops: Secret[];
  upsertDrop: (secret: Secret) => void;
  addDrop: (secret: Secret) => void;
  /** Forget every secret held in memory. Used by the panic wipe. */
  clearDrops: () => void;
}

export const useDropsStore = create<DropsState>()(set => ({
  drops: [],

  upsertDrop(secret: Secret) {
    set(s => ({
      drops: s.drops.some(d => d.id === secret.id)
        ? s.drops.map(d => (d.id === secret.id ? secret : d))
        : [...s.drops, secret],
    }));
  },

  addDrop(secret: Secret) {
    set(s => ({ drops: [...s.drops, secret] }));
  },

  // Revealed bodies live here and nowhere else. A wipe that cleared disk but
  // left this alone would leave the erased device's secrets readable on screen
  // until the process died.
  clearDrops() {
    set({ drops: [] });
  },
}));
