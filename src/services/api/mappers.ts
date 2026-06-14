import type { Secret } from '../../types';
import type { ApiSecret } from './index';

export function apiSecretToSecret(s: ApiSecret): Secret {
  return {
    id: s.id,
    body: s.body,
    drop: {
      id: s.drop.id,
      coordinate: s.drop.coordinate,
      placeLabel: s.drop.placeLabel,
      createdAt: s.drop.createdAt,
    },
    createdAt: s.createdAt,
    revealCount: s.revealCount,
    mood: s.mood,
    hearts: s.hearts,
    stoodHere: s.stoodHere,
    sealed: s.sealed,
    saved: s.saved,
    hearted: s.hearted,
    distanceMeters: s.distanceMeters,
  };
}
