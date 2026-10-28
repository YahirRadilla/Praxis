/**
 * Picks readable text color (dark ink or white) for a chip/badge rendered on
 * an arbitrary, non-themed background (e.g. category/ODS `colorHex` values
 * coming from the database). These backgrounds don't follow the app's
 * light/dark theme tokens, so the returned color is a fixed hex, not a
 * theme-reactive CSS variable — it must stay correct no matter which theme
 * is active, since the chip's own background never changes with it.
 *
 * Uses WCAG relative luminance to choose whichever of ink/white clears more
 * contrast against the given background.
 */
const CHIP_TEXT_DARK = "#14161a";
const CHIP_TEXT_LIGHT = "#ffffff";

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getChipTextColor(backgroundHex: string): string {
  const bgLum = relativeLuminance(backgroundHex);
  const contrastWithWhite = contrastRatio(bgLum, 1);
  const contrastWithDark = contrastRatio(bgLum, relativeLuminance(CHIP_TEXT_DARK));
  return contrastWithDark > contrastWithWhite ? CHIP_TEXT_DARK : CHIP_TEXT_LIGHT;
}
