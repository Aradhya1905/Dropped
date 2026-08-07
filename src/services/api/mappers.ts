import type { Reply, Secret } from '../../types';
import type { ApiReply, ApiSecret } from './index';

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
    // Older servers predate replies; treat a missing count as none, so the UI
    // shows "no voices yet" rather than NaN.
    replyCount: s.replyCount ?? 0,
    sealed: s.sealed,
    saved: s.saved,
    hearted: s.hearted,
    distanceMeters: s.distanceMeters,
    // Absent stays absent: a drop with no expiry lives forever, and the UI
    // reads `undefined` as "no countdown" rather than needing a sentinel.
    expiresAt: s.expiresAt,
    // Likewise absent = out of the whisper band (or a server that predates the
    // whisper tier). The UI reads `undefined` as "you're too far to hear it".
    whisper: s.whisper,
  };
}

export function apiReplyToReply(r: ApiReply): Reply {
  return { id: r.id, body: r.body, createdAt: r.createdAt, mine: r.mine };
}
