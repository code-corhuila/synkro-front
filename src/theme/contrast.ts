// WCAG 2.x contrast ratio between two opaque colours. Used by the token tests
// to check the published values; the application never needs it.

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function rgbChannels(colour: string): number[] {
  if (!HEX_COLOUR.test(colour)) {
    throw new Error(`contrastRatio needs an opaque hex colour, got "${colour}"`);
  }
  const digits = colour.slice(1);
  const sixDigits = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
  return [0, 2, 4].map((offset) => parseInt(sixDigits.slice(offset, offset + 2), 16));
}

function linearChannel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(colour: string): number {
  const [red, green, blue] = rgbChannels(colour).map(linearChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
