import { createDrop, fetchChainCandidates } from '../../../services/api';
import type { Coordinate, Mood } from '../../../types';

export const postDrop = (
  body: string,
  mood: Mood,
  coordinate: Coordinate,
  placeLabel?: string,
  city?: string,
  prevDropId?: string,
) => createDrop(body, mood, coordinate, placeLabel, city, prevDropId);

export const getChainCandidates = (coordinate: Coordinate) => fetchChainCandidates(coordinate);
