import { create } from 'zustand';

import type { Coordinate, Secret } from '../types';

interface DropsState {
  drops: Secret[];
  seeded: boolean;
  seed: (userCoord: Coordinate) => void;
  addDrop: (secret: Secret) => void;
}

export const useDropsStore = create<DropsState>((set, get) => ({
  drops: [],
  seeded: false,

  seed(userCoord: Coordinate) {
    if (get().seeded) return;
    const { lat, lng } = userCoord;
    const now = Date.now();
    const seeds: Secret[] = [
      {
        id: 'seed-a',
        body: 'I cried here once and nobody noticed.',
        drop: {
          id: 'drop-a',
          coordinate: { lat: lat + 0.0009, lng: lng + 0.0004 },
          placeLabel: 'Corner, heading north',
          createdAt: now - 4 * 365 * 24 * 3600 * 1000,
        },
        createdAt: now - 4 * 365 * 24 * 3600 * 1000,
        revealCount: 12,
      },
      {
        id: 'seed-b',
        body: 'Left my old life at this corner.',
        drop: {
          id: 'drop-b',
          coordinate: { lat: lat - 0.0006, lng: lng + 0.0010 },
          placeLabel: 'Side street, east end',
          createdAt: now - 2 * 365 * 24 * 3600 * 1000,
        },
        createdAt: now - 2 * 365 * 24 * 3600 * 1000,
        revealCount: 7,
      },
      {
        id: 'seed-c',
        body: 'She said yes here. I said nothing.',
        drop: {
          id: 'drop-c',
          coordinate: { lat: lat + 0.0015, lng: lng - 0.0006 },
          placeLabel: 'Near the crossroads',
          createdAt: now - 365 * 24 * 3600 * 1000,
        },
        createdAt: now - 365 * 24 * 3600 * 1000,
        revealCount: 34,
      },
    ];
    set({ drops: seeds, seeded: true });
  },

  addDrop(secret: Secret) {
    set(s => ({ drops: [...s.drops, secret] }));
  },
}));
