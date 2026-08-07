import { fetchEchoes, type ApiEcho } from '../../../services/api';

/** Anniversaries near a point, for this device. See `useEchoes` for the rules. */
export async function getEchoes(
  lat: number,
  lng: number,
  radiusMeters?: number,
): Promise<ApiEcho[]> {
  return fetchEchoes(lat, lng, radiusMeters);
}
