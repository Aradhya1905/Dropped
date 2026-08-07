import { createDrop } from '../../../services/api';
import type { Coordinate, ExpiresInDays, Mood } from '../../../types';

export const postDrop = (
  body: string,
  mood: Mood,
  coordinate: Coordinate,
  placeLabel?: string,
  city?: string,
  expiresInDays?: ExpiresInDays,
  shareable?: boolean,
) => createDrop(body, mood, coordinate, placeLabel, city, expiresInDays, shareable);
