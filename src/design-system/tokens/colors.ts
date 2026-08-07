/**
 * Dropped color tokens.
 *
 * Two complete sets, never a mix:
 *
 * - {@link paperColors} — the exact palette from the design export
 *   (`design-reference/project/dropped.css` `:root`): warm paper ground,
 *   near-black warm ink, a single quiet sage accent.
 * - {@link highContrastColors} — the same app with the contrast turned up.
 *
 * The softness of the default palette is deliberate; it is most of what makes
 * this feel like paper rather than a form. That also makes it hard to read for
 * a lot of people, and the answer to that is a **second token set**, not
 * per-component overrides sprinkled around the app: one place to look, one
 * place to fix, and a test that says the two sets have identical keys so a
 * missing token fails a build instead of rendering `undefined` on a device.
 *
 * ## Why this resolves once, at import
 *
 * `colors` is chosen when this module first loads and does not change
 * afterwards. Nearly every style in the app is built by a module-scope
 * `StyleSheet.create`, which reads these values exactly once — so a set swapped
 * later would repaint nothing, and a *partly* repainted app (half high
 * contrast, half not) is worse than either. Resolving at import gets every
 * screen, including ones nobody remembered to convert, at the cost of the
 * setting applying on next launch. The You screen says so on the row.
 *
 * Anything that genuinely needs the live value — the settings row showing its
 * own pending state — can call {@link activeColors}.
 */
import { getHighContrast } from '../../services/storage';

/** The design's palette. */
export const paperColors = {
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

/**
 * A complete palette. Structural, so the two sets are interchangeable and
 * neither can drift a key past the other without TypeScript noticing.
 */
export type Palette = { readonly [K in keyof typeof paperColors]: string };

/**
 * The high-contrast set.
 *
 * Still recognisably this app — warm ground, sage accent, no pure-blue-black —
 * but every text/ground pair clears WCAG AA and the faint tokens stop being
 * decorative grey. The three that change most are the ones the design uses for
 * atmosphere and the app uses for information: `inkFaint` (every mono caption),
 * `line`/`lineSoft` (card edges), and `accent` (which sits under white text on
 * the seals, so it has to darken rather than brighten).
 *
 * Keys are identical to {@link paperColors} by contract — see `colors.test.ts`.
 */
export const highContrastColors: Palette ={
  paper: '#FFFDF7',
  paperDeep: '#EAE3D3',
  paperCard: '#FFFFFF',
  paperBright: '#FFFFFF',

  ink: '#0B0906',
  inkSoft: '#3A342B',
  inkFaint: '#554E43',
  line: 'rgba(11,9,6,0.42)',
  lineSoft: 'rgba(11,9,6,0.22)',

  accent: '#3F5C46',
  accentDeep: '#22331F',
  accentTint: 'rgba(63,92,70,0.20)',

  moss: '#22331F',
  bg: '#FFFDF7',
  surface: '#FFFFFF',
  inkMuted: '#3A342B',

  locked: '#3A342B',
  near: '#22331F',
  revealed: '#0B0906',

  danger: '#8E2718',
  onAccent: '#FFFFFF',
};

/**
 * The set the *setting* currently names, read fresh from storage.
 *
 * Note this can disagree with {@link colors} between flipping the switch and
 * relaunching — that gap is the point of the row's "next time you open the
 * app" note, and this is what lets the row show it honestly.
 */
export function activeColors(): Palette {
  return getHighContrast() ? highContrastColors : paperColors;
}

/**
 * The palette every style in the app is built from. Fixed for the lifetime of
 * the process — see the module note above for why that is the deliberate
 * choice rather than a limitation worked around.
 */
export const colors: Palette =activeColors();

export type ColorToken = keyof typeof paperColors;
