import { fetchTrailFound, fetchTrailSaved, fetchTrailDropped } from '../../../services/api';
import type { ApiSecret } from '../../../services/api';

export async function getTrailFound(limit = 20, offset = 0): Promise<{ secrets: ApiSecret[]; total: number }> {
  return fetchTrailFound(limit, offset);
}

export async function getTrailSaved(limit = 20, offset = 0): Promise<{ secrets: ApiSecret[]; total: number }> {
  return fetchTrailSaved(limit, offset);
}

export async function getTrailDropped(limit = 20, offset = 0): Promise<{ secrets: ApiSecret[]; total: number }> {
  return fetchTrailDropped(limit, offset);
}
