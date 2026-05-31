/** Corner radii. */
export const radii = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
