import { fetchTrailFound, fetchTrailSaved, fetchTrailDropped, fetchDeviceStats } from '../../../services/api';
import type { ApiSecret, ApiDeviceStats } from '../../../services/api';

export async function getTrailStats(): Promise<ApiDeviceStats> {
  return fetchDeviceStats();
}

export async function getTrailFound(limit = 20, offset = 0): Promise<{ secrets: ApiSecret[]; total: number }> {
  return fetchTrailFound(limit, offset);
}

export async function getTrailSaved(limit = 20, offset = 0): Promise<{ secrets: ApiSecret[]; total: number }> {
  return fetchTrailSaved(limit, offset);
}

export async function getTrailDropped(limit = 20, offset = 0): Promise<{ secrets: ApiSecret[]; total: number }> {
  return fetchTrailDropped(limit, offset);
}
