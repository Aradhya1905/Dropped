/**
 * Dropped type tokens.
 * Three voices from the design: a serif wordmark, a spaced mono tagline,
 * and a clean sans body.
 *
 * `family` values are placeholders — wire to real font files in
 * `assets/fonts/` and the native font config when fonts are installed.
 */
export const fonts = {
  serif: 'Georgia', // wordmark / display — e.g. Instrument Serif later
  mono: 'Courier', // tagline / labels — spaced, uppercase
  sans: 'System', // body
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  display: 48, // "Dropped" wordmark
} as const;

export const lineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  tagline: 6, // "SECRETS, WHERE THEY HAPPENED"
  normal: 0,
} as const;

export const typography = { fonts, fontSize, lineHeight, letterSpacing } as const;
