/**
 * Dropped type tokens.
 * Four voices from the design (design-reference/*.html → Newsreader / Geist /
 * Geist Mono / Caveat): a serif wordmark, a clean sans body, a spaced mono for
 * labels/numerics, and a handwriting accent.
 *
 * Fonts live in `assets/fonts/`, linked via `react-native-asset`. Each weight
 * is a SEPARATE font file referenced by name — do NOT rely on `fontWeight` with
 * custom fonts (Android falls back to the regular file or fakes the weight).
 * iOS references a font by its internal PostScript name, Android by filename;
 * `f()` picks the right one per platform.
 */
import { Platform, StyleSheet } from 'react-native';

/** android = filename (no ext), ios = PostScript name. */
const f = (android: string, ios: string): string =>
  Platform.select({ android, ios, default: android }) as string;

// Concrete font families, keyed by role + weight. Newsreader is the 24pt
// optical cut, so iOS bakes "24pt" into its PostScript name.
export const fonts = {
  // Geist — sans / body.
  sansLight: f('Geist-Light', 'Geist-Light'),
  sans: f('Geist-Regular', 'Geist-Regular'),
  sansMedium: f('Geist-Medium', 'Geist-Medium'),
  sansSemibold: f('Geist-SemiBold', 'Geist-SemiBold'),
  sansBold: f('Geist-Bold', 'Geist-Bold'),

  // Geist Mono — labels / numerics (spaced, often uppercase).
  mono: f('GeistMono-Regular', 'GeistMono-Regular'),
  monoMedium: f('GeistMono-Medium', 'GeistMono-Medium'),
  monoSemibold: f('GeistMono-Medium', 'GeistMono-Medium'), // no SemiBold cut bundled; Medium is the heaviest mono

  // Newsreader — serif / wordmark + display.
  serif: f('Newsreader-Regular', 'Newsreader24pt-Regular'),
  serifLight: f('Newsreader-Light', 'Newsreader24pt-Light'),
  serifMedium: f('Newsreader-Medium', 'Newsreader24pt-Medium'),
  serifItalic: f('Newsreader-Italic', 'Newsreader24pt-Italic'),

  // Caveat — handwriting accent.
  hand: f('Caveat-Regular', 'Caveat-Regular'),
  handMedium: f('Caveat-Medium', 'Caveat-Medium'),
  handSemibold: f('Caveat-SemiBold', 'Caveat-SemiBold'),
} as const;

export type FontToken = keyof typeof fonts;

// Type-scale presets: size + family only (no color, no per-use spacing).
// One source of truth for the type scale — change a size/family here and every
// screen that spreads the preset follows. Naming: text{size}{WeightSuffix}.
// Usage: { ...textStyles.text14SemiBold, color: colors.ink, letterSpacing: -0.2 }
export const textStyles = StyleSheet.create({
  // Regular (sans)
  text10: { fontSize: 10, fontFamily: fonts.sans },
  text11: { fontSize: 11, fontFamily: fonts.sans },
  text12: { fontSize: 12, fontFamily: fonts.sans },
  text13: { fontSize: 13, fontFamily: fonts.sans },
  text14: { fontSize: 14, fontFamily: fonts.sans },
  text15: { fontSize: 15, fontFamily: fonts.sans },
  text16: { fontSize: 16, fontFamily: fonts.sans },
  text18: { fontSize: 18, fontFamily: fonts.sans },
  text22: { fontSize: 22, fontFamily: fonts.sans },
  text30: { fontSize: 30, fontFamily: fonts.sans },
  text32: { fontSize: 32, fontFamily: fonts.sans },
  // Medium
  text12Medium: { fontSize: 12, fontFamily: fonts.sansMedium },
  text13Medium: { fontSize: 13, fontFamily: fonts.sansMedium },
  text14Medium: { fontSize: 14, fontFamily: fonts.sansMedium },
  text16Medium: { fontSize: 16, fontFamily: fonts.sansMedium },
  // SemiBold
  text9SemiBold: { fontSize: 9, fontFamily: fonts.sansSemibold },
  text10SemiBold: { fontSize: 10, fontFamily: fonts.sansSemibold },
  text11SemiBold: { fontSize: 11, fontFamily: fonts.sansSemibold },
  text12SemiBold: { fontSize: 12, fontFamily: fonts.sansSemibold },
  text13SemiBold: { fontSize: 13, fontFamily: fonts.sansSemibold },
  text14SemiBold: { fontSize: 14, fontFamily: fonts.sansSemibold },
  text15SemiBold: { fontSize: 15, fontFamily: fonts.sansSemibold },
  text16SemiBold: { fontSize: 16, fontFamily: fonts.sansSemibold },
  text17SemiBold: { fontSize: 17, fontFamily: fonts.sansSemibold },
  text22SemiBold: { fontSize: 22, fontFamily: fonts.sansSemibold },
  text28SemiBold: { fontSize: 28, fontFamily: fonts.sansSemibold },
  // Bold
  text9Bold: { fontSize: 9, fontFamily: fonts.sansBold },
  text10Bold: { fontSize: 10, fontFamily: fonts.sansBold },
  text11Bold: { fontSize: 11, fontFamily: fonts.sansBold },
  text12Bold: { fontSize: 12, fontFamily: fonts.sansBold },
  text13Bold: { fontSize: 13, fontFamily: fonts.sansBold },
  text18Bold: { fontSize: 18, fontFamily: fonts.sansBold },
  // Mono (numeric)
  text10Mono: { fontSize: 10, fontFamily: fonts.mono },
  text11Mono: { fontSize: 11, fontFamily: fonts.mono },
  text12Mono: { fontSize: 12, fontFamily: fonts.mono },
  text13Mono: { fontSize: 13, fontFamily: fonts.mono },
  text14Mono: { fontSize: 14, fontFamily: fonts.mono },
  text20Mono: { fontSize: 20, fontFamily: fonts.mono },
  text24Mono: { fontSize: 24, fontFamily: fonts.mono },
  // Mono SemiBold (mapped to Geist Mono Medium — heaviest mono bundled)
  text8MonoSemiBold: { fontSize: 8, fontFamily: fonts.monoSemibold },
  text9MonoSemiBold: { fontSize: 9, fontFamily: fonts.monoSemibold },
  text10MonoSemiBold: { fontSize: 10, fontFamily: fonts.monoSemibold },
  text11MonoSemiBold: { fontSize: 11, fontFamily: fonts.monoSemibold },
  text12MonoSemiBold: { fontSize: 12, fontFamily: fonts.monoSemibold },
  text13MonoSemiBold: { fontSize: 13, fontFamily: fonts.monoSemibold },
  text14MonoSemiBold: { fontSize: 14, fontFamily: fonts.monoSemibold },
  text22MonoSemiBold: { fontSize: 22, fontFamily: fonts.monoSemibold },
  // Serif
  text14Serif: { fontSize: 14, fontFamily: fonts.serif },
  text16Serif: { fontSize: 16, fontFamily: fonts.serif },
  text18Serif: { fontSize: 18, fontFamily: fonts.serif },
  text22Serif: { fontSize: 22, fontFamily: fonts.serif },
  text26Serif: { fontSize: 26, fontFamily: fonts.serif },
  text30Serif: { fontSize: 30, fontFamily: fonts.serif },
  text32Serif: { fontSize: 32, fontFamily: fonts.serif },
  text36Serif: { fontSize: 36, fontFamily: fonts.serif },
  text56Serif: { fontSize: 56, fontFamily: fonts.serif },
  // Serif Italic
  text30SerifItalic: { fontSize: 30, fontFamily: fonts.serifItalic },
  text32SerifItalic: { fontSize: 32, fontFamily: fonts.serifItalic },
});

// Raw scale tokens — kept for cases that need a size/spacing without a preset.
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

export const typography = {
  fonts,
  textStyles,
  fontSize,
  lineHeight,
  letterSpacing,
} as const;
