import { fetchNearbyDrops, type ApiSecret } from '../../../services/api';

export async function getNearbyDrops(lat: number, lng: number, radiusMeters = 2000): Promise<ApiSecret[]> {
  const res = await fetchNearbyDrops(lat, lng, radiusMeters);
  return res.secrets;
}
