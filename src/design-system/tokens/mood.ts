/**
 * Mood → colour. Four moods only, fixed by the `drops_mood_chk` DB constraint.
 *
 * Every tint stays inside the design's muted paper/ink/sage world — these are
 * washes on aged paper, not a category palette. A saturated mood map would
 * wreck the one thing the design is: quiet. `ink` is for a stroke or a word,
 * `tint` is the 14 % wash behind it (same weight as `colors.accentTint`).
 *
 * Lives next to the palette rather than in the map feature because the whisper
 * tier, the mood filter and the composer all need the same four answers.
 */
import type { Mood } from '../../types';

export interface MoodColor {
  /** Line / text colour — readable on paper, never black. */
  ink: string;
  /** Translucent wash for a pin or chip behind the ink. */
  tint: string;
  /**
   * The two stops of a pressed wax seal in this mood: `light` where the lamp
   * catches it, `deep` at the cooled rim. Same radial geometry as the sage
   * default — this only re-tints the wax, it does not restyle the seal.
   */
  wax: { light: string; deep: string };
}

export const moodColors: Record<Mood, MoodColor> = {
  /** Honeyed ochre — warm light on paper. */
  joy: {
    ink: '#9A7B3C',
    tint: 'rgba(154,123,60,0.14)',
    wax: { light: '#B99A54', deep: '#7E6229' },
  },
  /** Dusty blue-grey — the colour of a cold window. */
  ache: {
    ink: '#6B7C8C',
    tint: 'rgba(107,124,140,0.14)',
    wax: { light: '#8B9CAB', deep: '#4F606F' },
  },
  /** Clay — a shade off `colors.danger`, so it reads as heat, not as an error. */
  trouble: {
    ink: '#A4593F',
    tint: 'rgba(164,89,63,0.14)',
    wax: { light: '#BE7259', deep: '#82432D' },
  },
  /** The house sage, kept for the mood the app is named after. */
  wonder: {
    ink: '#566E5B',
    tint: 'rgba(118,149,124,0.14)',
    // Exactly `colors.accent` / `colors.accentDeep` — the seal's own default,
    // so an untinted seal and a wonder seal are the same object.
    wax: { light: '#76957C', deep: '#566E5B' },
  },
};

/** The colours for a mood, falling back to sage for an unknown one. */
export function moodColor(mood?: Mood): MoodColor {
  return (mood && moodColors[mood]) || moodColors.wonder;
}
