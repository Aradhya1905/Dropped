import { create } from 'zustand';

import type { Secret } from '../types';

interface DropsState {
  drops: Secret[];
  upsertDrop: (secret: Secret) => void;
  addDrop: (secret: Secret) => void;
  /** Merge a server list (nearby / trail) into the store. */
  hydrateDrops: (secrets: Secret[]) => void;
}

/**
 * Merge one server copy over what we already hold.
 *
 * A nearby-drops payload is *sealed* — it has no `body` — so a naive overwrite
 * would blank a secret the user already revealed. Keep the richer local value
 * for the fields the list endpoint doesn't carry.
 */
function merge(prev: Secret | undefined, next: Secret): Secret {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    body: next.body ?? prev.body,
    // A revealed secret never re-seals for this device.
    sealed: prev.sealed === false ? false : next.sealed,
    revealCount: next.revealCount ?? prev.revealCount,
  };
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

  hydrateDrops(secrets: Secret[]) {
    if (secrets.length === 0) return;
    set(s => {
      const byId = new Map(s.drops.map(d => [d.id, d]));
      for (const incoming of secrets) {
        byId.set(incoming.id, merge(byId.get(incoming.id), incoming));
      }
      return { drops: Array.from(byId.values()) };
    });
  },
}));

/** Store-writing helper for query functions (outside React). */
export const hydrateDrops = (secrets: Secret[]) =>
  useDropsStore.getState().hydrateDrops(secrets);
