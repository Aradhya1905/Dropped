import { fetchDropPreview } from '../../../services/api';
import { apiDropPreviewToDropPreview } from '../../../services/api/mappers';
import type { DropPreview } from '../../../types';

/**
 * Public metadata for a spot someone shared with you. The only drop read that
 * works before you have walked anywhere — and the only one with no body in it.
 */
export const getDropPreview = (id: string): Promise<DropPreview> =>
  fetchDropPreview(id).then(apiDropPreviewToDropPreview);
