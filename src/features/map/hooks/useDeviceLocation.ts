/**
 * useDeviceLocation — the feature-facing view of the app's shared location.
 *
 * All state lives in `store/locationStore` (one permission state, one GPS
 * watch, one reverse-geocode for the whole app); this hook is a thin reader so
 * existing call sites keep their shape:
 *
 *   const { status, coord, shortAddress, fixing, request, refresh } =
 *     useDeviceLocation();
 *   // request()  → ask permission, then start watching
 *   // refresh()  → one-shot re-fix (e.g. a "recenter" tap)
 */
import type { Coordinate } from '../../../types';
import type { PermissionStatus } from '../../../services/location';
import { useLocationStore, type LocationStatus } from '../../../store/locationStore';

export type { LocationStatus };

export interface UseDeviceLocationResult {
  status: LocationStatus;
  /** Best known position — a live fix, or the persisted last-known one. */
  coord: Coordinate | null;
  /** False while `coord` is the persisted last-known fix, not a live one. */
  live: boolean;
  /** Resolved street/area line, e.g. "Bedford Ave, Williamsburg". */
  shortAddress: string | null;
  /** Resolved city/town, e.g. "Bengaluru" — feeds the Trail "cities" stat. */
  city: string | null;
  /** True while a one-shot fix or the first watch fix is pending. */
  fixing: boolean;
  /** ms epoch of the last live fix, or null if we've never had one. */
  lastFixAt: number | null;
  /** Ask for permission; on grant, start watching. Returns the outcome. */
  request: () => Promise<PermissionStatus>;
  /** One-shot re-fix without re-prompting. */
  refresh: () => Promise<void>;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  const status = useLocationStore(s => s.status);
  const coord = useLocationStore(s => s.coord);
  const live = useLocationStore(s => s.live);
  const shortAddress = useLocationStore(s => s.shortAddress);
  const city = useLocationStore(s => s.city);
  const fixing = useLocationStore(s => s.fixing);
  const lastFixAt = useLocationStore(s => s.lastFixAt);
  const request = useLocationStore(s => s.request);
  const refresh = useLocationStore(s => s.refresh);

  return { status, coord, live, shortAddress, city, fixing, lastFixAt, request, refresh };
}
