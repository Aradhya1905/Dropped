import { useQuery } from '@tanstack/react-query';

import { apiSecretToSecret } from '../../../services/api/mappers';
import type { ConstellationPoint } from '../constellation/layout';
import { getTrailDropped, getTrailFound } from '../api';

/**
 * The server's own page cap. A city with more history than this is drawn from
 * its most recent points, which is the right half to keep: a constellation is a
 * keepsake, not an audit, and both trail lists come back newest-first.
 */
const MAX_POINTS = 100;

/**
 * The points of one city's constellation: everywhere in it this device revealed
 * a secret, plus everywhere it left one.
 *
 * Both halves belong in the drawing — the city index counts both, and "the
 * corner where I left something" is as much a place you stood as one you walked
 * to. A drop you wrote *and* revealed is one place, kept at the earlier of the
 * two moments: you were there when you left it.
 */
export function useCityPoints(city: string | undefined) {
  return useQuery<ConstellationPoint[]>({
    queryKey: ['trail', 'constellation', city],
    enabled: !!city,
    staleTime: 60_000,
    queryFn: async () => {
      const [found, dropped] = await Promise.all([
        getTrailFound(MAX_POINTS, 0, city),
        getTrailDropped(MAX_POINTS, 0, city),
      ]);

      const byId = new Map<string, ConstellationPoint>();
      for (const api of [...found.secrets, ...dropped.secrets]) {
        const s = apiSecretToSecret(api);
        // `stoodAt` is the interaction; `createdAt` is the fallback for a
        // server that predates it, where the drop's own date is the best guess
        // at when this device was there.
        const at = s.stoodAt ?? s.createdAt;
        const existing = byId.get(s.drop.id);
        if (existing && existing.at <= at) continue;
        byId.set(s.drop.id, {
          id: s.drop.id,
          coordinate: s.drop.coordinate,
          revealCount: s.revealCount ?? 0,
          // The place, never the secret. Nothing else from `s` may reach a
          // point — see the leak guard in `layout.test.ts`.
          ...(s.drop.placeLabel ? { label: s.drop.placeLabel } : {}),
          at,
        });
      }

      return [...byId.values()];
    },
  });
}
