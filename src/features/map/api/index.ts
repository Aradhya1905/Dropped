import {
  fetchFootRoute,
  fetchNearbyDrops,
  type ApiFootRoute,
  type ApiSecret,
} from '../../../services/api';
import type { Coordinate } from '../../../types';

export async function getNearbyDrops(lat: number, lng: number, radiusMeters = 2000): Promise<ApiSecret[]> {
  const res = await fetchNearbyDrops(lat, lng, radiusMeters);
  return res.secrets;
}

export async function getFootRoute(from: Coordinate, to: Coordinate): Promise<ApiFootRoute> {
  return fetchFootRoute(from, to);
}
