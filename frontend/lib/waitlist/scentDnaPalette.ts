/**
 * Shared DNA card bar colors (share PNG + HTML email).
 */

/** Terracotta → amber → sage → deep terracotta (matches Tailwind waitlist tokens). */
export const SCENT_DNA_FAMILY_BAR_COLORS = [
  "#B85A3A",
  "#D4A574",
  "#8B9E7E",
  "#A04D2F",
] as const;

/**
 * Return the bar fill for the n-th scent family row (cycles past four).
 *
 * Args:
 *   index: Zero-based row index.
 *
 * Returns:
 *   Hex color string.
 */
export function scentDnaFamilyBarColor(index: number): string {
  return SCENT_DNA_FAMILY_BAR_COLORS[index % SCENT_DNA_FAMILY_BAR_COLORS.length];
}
