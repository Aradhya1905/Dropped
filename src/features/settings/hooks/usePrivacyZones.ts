/**
 * usePrivacyZones — the editing side of the circles the app won't look inside.
 *
 * Thin on purpose: the zones live in MMKV and the *enforcement* lives at each
 * capture site (`LocationContext`, `useEchoes`, `ComposerScreen`). This hook
 * only owns the list and the one thing that must happen the moment a zone is
 * created — forgetting the walked cells already inside it.
 */
import { useCallback, useState } from 'react';

import {
  MAX_PRIVACY_ZONES,
  nextZoneLabel,
  type PrivacyZone,
} from '../../../services/location';
import {
  forgetWalkedCellsInside,
  getPrivacyZones,
  setPrivacyZones,
} from '../../../services/storage';
import type { Coordinate } from '../../../types';

export interface UsePrivacyZonesResult {
  zones: PrivacyZone[];
  canAdd: boolean;
  /** The label offered for the next zone ("Home", then "Work", then "School"). */
  suggestedLabel: string | undefined;
  /** Returns how many already-walked cells the new zone erased. */
  add: (centre: Coordinate, radiusM: number, label?: string) => number;
  remove: (id: string) => void;
  setRadius: (id: string, radiusM: number) => number;
}

function zoneId(): string {
  return `z${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function usePrivacyZones(): UsePrivacyZonesResult {
  const [zones, setZones] = useState<PrivacyZone[]>(getPrivacyZones);

  const commit = useCallback((next: PrivacyZone[]) => {
    setPrivacyZones(next);
    setZones(next);
  }, []);

  const add = useCallback(
    (centre: Coordinate, radiusM: number, label?: string) => {
      const current = getPrivacyZones();
      if (current.length >= MAX_PRIVACY_ZONES) return 0;
      const next = [...current, { id: zoneId(), centre, radiusM, label }];
      commit(next);
      // A zone that only applied going forward would leave this morning's walk
      // home painted on the map — and that street is precisely what the person
      // drawing the circle meant.
      return forgetWalkedCellsInside(next);
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      // Removing a zone does *not* bring back the cells it erased. There is
      // nothing to bring back: they were forgotten, not hidden.
      commit(getPrivacyZones().filter(z => z.id !== id));
    },
    [commit],
  );

  const setRadius = useCallback(
    (id: string, radiusM: number) => {
      const next = getPrivacyZones().map(z =>
        z.id === id ? { ...z, radiusM } : z,
      );
      commit(next);
      // Growing a circle has to sweep the newly-covered ground too.
      return forgetWalkedCellsInside(next);
    },
    [commit],
  );

  return {
    zones,
    canAdd: zones.length < MAX_PRIVACY_ZONES,
    suggestedLabel: nextZoneLabel(zones),
    add,
    remove,
    setRadius,
  };
}
