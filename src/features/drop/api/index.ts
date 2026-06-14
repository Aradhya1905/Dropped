import { createDrop } from '../../../services/api';
import type { Coordinate, Mood } from '../../../types';

export const postDrop = (body: string, mood: Mood, coordinate: Coordinate, placeLabel?: string) =>
  createDrop(body, mood, coordinate, placeLabel);
