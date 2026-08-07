import {
  fetchFootRoute,
  fetchNearbyDrops,
  type ApiFootRoute,
  type ApiSecret,
} from '../../../services/api';
import type { Coordinate, Mood } from '../../../types';

export async function getNearbyDrops(
  lat: number,
  lng: number,
  radiusMeters = 2000,
  moods: Mood[] = [],
): Promise<{ secrets: ApiSecret[]; hiddenByFilter: number }> {
  return fetchNearbyDrops(lat, lng, radiusMeters, moods);
}

export async function getFootRoute(from: Coordinate, to: Coordinate): Promise<ApiFootRoute> {
  return fetchFootRoute(from, to);
}
