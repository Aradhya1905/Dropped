/**
 * Dropped color tokens.
 * Exact palette from the design export (`design-reference/project/dropped.css`
 * `:root`): warm paper ground, near-black warm ink, a single quiet sage accent.
 */
export const colors = {
  /** Warm paper background (stage / screen ground). */
  paper: '#F1EBDE',
  /** Deeper paper — gradient edges, pressed surfaces. */
  paperDeep: '#E8E0D0',
  /** Raised paper surfaces (notes, cards, sheets, chips). */
  paperCard: '#F7F2E8',
  /** Bright paper highlight at the top of radial grounds. */
  paperBright: '#F8F3E9',

  /** Primary text / wordmark — near-black warm ink. */
  ink: '#211D17',
  /** Secondary text. */
  inkSoft: '#6E655A',
  /** Faint labels / captions. */
  inkFaint: '#A79D8D',
  /** Hairlines / borders. */
  line: 'rgba(33,29,23,0.14)',
  /** Softer hairlines (card rings). */
  lineSoft: 'rgba(33,29,23,0.07)',

  /** Accent — sage (wax seals, pulses, underlines). */
  accent: '#76957C',
  /** Deep sage (kickers, emphasized text, seal gradient edge). */
  accentDeep: '#566E5B',
  /** Translucent sage wash (tags, tapes, tints). */
  accentTint: 'rgba(118,149,124,0.14)',

  // ---- legacy aliases (pre-design seed) ----
  /** @deprecated use `accentDeep` */
  moss: '#566E5B',
  /** @deprecated use `paper` */
  bg: '#F1EBDE',
  /** @deprecated use `paperCard` */
  surface: '#F7F2E8',
  /** @deprecated use `inkSoft` */
  inkMuted: '#6E655A',

  /** Reveal states. */
  locked: '#6E655A',
  near: '#566E5B',
  revealed: '#211D17',

  /** Feedback. */
  danger: '#B3402E',
  onAccent: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
