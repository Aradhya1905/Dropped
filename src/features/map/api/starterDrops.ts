import { postStarterDrops } from '../../../services/api';
import { getStarterRequested, setStarterRequested } from '../../../services/storage';
import type { Coordinate } from '../../../types';

let inFlight: Promise<boolean> | null = null;

/**
 * Ask the server, once per device, to seed starter drops around `coord` (it
 * only does so if the area has no drops yet). Resolves to whether anything
 * was seeded.
 *
 * - Already asked (persisted flag) → resolves false without a request.
 * - A request already in flight → shares it, so remounts can't double-fire.
 * - On failure the flag stays unset and the promise rejects; the next attempt
 *   (next map mount) retries.
 */
export function requestStarterDropsOnce(coord: Coordinate): Promise<boolean> {
  if (getStarterRequested()) return Promise.resolve(false);
  if (inFlight) return inFlight;

  inFlight = postStarterDrops(coord)
    .then(res => {
      setStarterRequested(true);
      return res.seeded;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
