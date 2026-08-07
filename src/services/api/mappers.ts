import type { DropPreview, Echo, Reply, Secret } from '../../types';
import type { ApiDropPreview, ApiEcho, ApiReply, ApiSecret } from './index';

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
    // Older servers predate the opt-out; treat a missing flag as shareable,
    // matching the column default rather than silently hiding the affordance.
    shareable: s.shareable ?? true,
    // Absent = no condition beyond the 50 m rule, which is both the default and
    // what a server predating time gates sends for every drop.
    revealCondition: s.revealCondition,
  };
}

/**
 * A shared spot as the app holds it. Field-for-field with the wire shape, but
 * kept explicit (rather than a cast) so that adding a `body` on the server
 * would not silently start flowing into the app.
 */
export function apiDropPreviewToDropPreview(p: ApiDropPreview): DropPreview {
  return {
    id: p.id,
    coordinate: p.coordinate,
    placeLabel: p.placeLabel,
    city: p.city,
    mood: p.mood,
    createdAt: p.createdAt,
    revealCount: p.revealCount,
    expiresAt: p.expiresAt,
  };
}

/** An anniversary, with its secret run through the same mapper as every other. */
export function apiEchoToEcho(e: ApiEcho): Echo {
  return {
    secret: apiSecretToSecret(e.secret),
    interval: e.interval,
    kind: e.kind,
    stoodAt: e.stoodAt,
  };
}

export function apiReplyToReply(r: ApiReply): Reply {
  return { id: r.id, body: r.body, createdAt: r.createdAt, mine: r.mine };
}
