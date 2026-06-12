/**
 * Shared box-shadow stacks from the design CSS, as RN `boxShadow` strings
 * (supported on RN 0.76+ / New Architecture, including multiple shadows).
 * Hairline "0 0 0 1px" rings from the CSS are done with borders instead.
 */
export const shadows = {
  /** Floating paper notes / tickets (`.snote`, `.ticket`). */
  note: '0 16px 30px -18px rgba(43,33,20,0.5)',
  /** Small cards & chips (`.loc-chip`, `.range-card` base). */
  chip: '0 12px 24px -14px rgba(43,33,20,0.45)',
  /** Big anchored cards (`.range-card`, `.findcard`, `.secret-card`). */
  card: '0 22px 40px -22px rgba(43,33,20,0.5)',
  /** Bottom sheets (`.s5sheet`, `.composer-sheet`). */
  sheet: '0 -20px 40px -24px rgba(43,33,20,0.4)',
  /** Wax seals & stamp buttons. */
  seal: '0 8px 16px -7px rgba(86,110,91,0.7)',
  /** Larger wax FAB (`.drop-fab`). */
  sealLarge: '0 14px 24px -8px rgba(86,110,91,0.65)',
  /** White core circles (`.core`). */
  core: '0 10px 22px -10px rgba(86,110,91,0.55)',
} as const;

export type ShadowToken = keyof typeof shadows;
