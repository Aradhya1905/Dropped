import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { requestStarterDropsOnce } from '../api';
import { useDeviceLocation } from './useDeviceLocation';

/**
 * First-run starter drops: on the first *live* fix, ask the server (once per
 * device) to seed a few drops here if the area is empty, then refresh the
 * map's nearby pins so they appear straight away.
 *
 * Waits for a live fix on purpose — the persisted last-known coordinate could
 * be somewhere the user was days ago. Mounted on MapScreen rather than the
 * onboarding Location screen, which leaves before the first fix arrives (and
 * so this also covers "Not now" users who grant location later).
 */
export function useStarterDrops(): void {
  const { coord, live } = useDeviceLocation();
  const queryClient = useQueryClient();
  // One attempt per mount: `coord` changes on every fix, and a failed request
  // shouldn't retry on each one. The next mount gets another go.
  const attempted = useRef(false);

  useEffect(() => {
    if (!live || !coord || attempted.current) return;
    attempted.current = true;

    requestStarterDropsOnce(coord)
      .then(seeded => {
        if (seeded) {
          queryClient.invalidateQueries({ queryKey: ['drops', 'nearby'] });
        }
      })
      .catch(() => {
        // Non-critical: the map still works, and the next mount retries.
      });
  }, [live, coord, queryClient]);
}
