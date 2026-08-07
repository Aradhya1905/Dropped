/**
 * What a screen needs to draw one echo card.
 *
 * Deliberately not the whole `Echo`: this shape is also what gets cached to
 * disk, and the cache must never hold a confession's text (see
 * `services/storage/keys.EchoMemo`). The body, when the reader has earned it,
 * comes from the drops store — which lives in memory only.
 */
import type { EchoInterval, EchoKind, Mood } from '../../types';

export interface EchoCardData {
  secretId: string;
  interval: EchoInterval;
  kind: EchoKind;
  /** ms epoch of the remembered drop / reveal. */
  stoodAt: number;
  placeLabel?: string;
  mood: Mood;
}
