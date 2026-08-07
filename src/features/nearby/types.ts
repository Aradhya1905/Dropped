import type { DropPreview, Secret } from '../../types';

/**
 * Turn a shared-link preview into a sealed `Secret` the rest of the app can
 * hold — enough for the Walk screen to draw a compass and a route.
 *
 * **Its coordinate is the coarsened one (~100 m out).** That is deliberate and
 * self-correcting: it points at the right block, and the moment the walker
 * comes inside the 2 km `nearby` radius the real drop arrives with its exact
 * coordinate and `upsertDrop` replaces this placeholder. So the guidance is
 * approximate at the start of the walk and exact well before the end of it —
 * which is also the only honest thing a link can promise, since the server
 * never ships the precise point to someone who hasn't walked there.
 *
 * The counters are zeroed rather than guessed: `revealCount` is the one number
 * the preview actually knows.
 */
export function previewToSealedSecret(preview: DropPreview): Secret {
  return {
    id: preview.id,
    drop: {
      id: preview.id,
      coordinate: preview.coordinate,
      placeLabel: preview.placeLabel,
      createdAt: preview.createdAt,
    },
    createdAt: preview.createdAt,
    revealCount: preview.revealCount,
    mood: preview.mood,
    hearts: 0,
    stoodHere: 0,
    replyCount: 0,
    sealed: true,
    saved: false,
    hearted: false,
    // Necessarily true: the preview endpoint 404s for an opted-out drop, so
    // holding a preview at all is proof this one may be linked to.
    shareable: true,
    expiresAt: preview.expiresAt,
  };
}
