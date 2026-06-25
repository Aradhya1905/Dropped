import { create } from 'zustand';

import type { Secret } from '../types';

interface DropsState {
  drops: Secret[];
  upsertDrop: (secret: Secret) => void;
  addDrop: (secret: Secret) => void;
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
}));
