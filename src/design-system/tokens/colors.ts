/**
 * Dropped color tokens.
 * Pulled from the design export (`design-reference/Dropped Onboarding…html`):
 * serif ink on a warm paper ground, with a moss accent.
 */
export const colors = {
  /** Primary text / wordmark — near-black warm ink. */
  ink: '#211D18',
  /** Accent — moss green (tagline, active states, "near" pulse). */
  moss: '#566E5B',

  /** Warm paper background. */
  bg: '#F4F0E8',
  /** Raised surfaces (cards, sheets). */
  surface: '#FFFFFF',

  /** Muted ink for secondary text. */
  inkMuted: '#6F675C',
  /** Hairlines / borders. */
  line: '#E2DBCD',

  /** Reveal states. */
  locked: '#6F675C',
  near: '#566E5B',
  revealed: '#211D18',

  /** Feedback. */
  danger: '#B3402E',
  onAccent: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
