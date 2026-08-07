import {
  fetchDeviceCities,
  fetchDeviceStats,
  fetchTrailDropped,
  fetchTrailFound,
  fetchTrailSaved,
} from '../../../services/api';
import type { ApiDeviceCity, ApiDeviceStats, ApiTrailSecret } from '../../../services/api';

type TrailPage = { secrets: ApiTrailSecret[]; total: number };

export async function getTrailStats(): Promise<ApiDeviceStats> {
  return fetchDeviceStats();
}

/** Every city this device has found or left something in, newest activity first. */
export async function getCities(): Promise<ApiDeviceCity[]> {
  return fetchDeviceCities();
}

export async function getTrailFound(limit = 20, offset = 0, city?: string): Promise<TrailPage> {
  return fetchTrailFound(limit, offset, city);
}

export async function getTrailSaved(limit = 20, offset = 0, city?: string): Promise<TrailPage> {
  return fetchTrailSaved(limit, offset, city);
}

export async function getTrailDropped(limit = 20, offset = 0, city?: string): Promise<TrailPage> {
  return fetchTrailDropped(limit, offset, city);
}
