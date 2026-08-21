/**
 * Arrows drawn rather than typed.
 *
 * U+2192 (→), U+2197 (↗) and U+2190 (←) all carry Emoji=Yes in Unicode. Geist ships no
 * glyph for any of them, so the font stack fell through to whatever the platform had:
 * a thin text arrow on desktop, and Apple Color Emoji on iOS. The same button rendered
 * a hairline arrow on a laptop and a colour emoji on a phone.
 *
 * A variation selector (U+FE0E) would ask for text presentation, but it is invisible in
 * source and not honoured everywhere. Drawing the shape removes the font from the
 * question entirely, so every arrow is identical on every device.
 *
 * Sized in `em` and stroked in `currentColor`, so it inherits the size and colour of
 * whatever it sits in exactly as the character did.
 */

const PATHS = {
  right: "M4 12h15m-6-6 6 6-6 6",
  left: "M20 12H5m6-6-6 6 6 6",
  "up-right": "M6 18 18 6M8 6h10v10",
} as const;

export type ArrowDirection = keyof typeof PATHS;

export function Arrow({ direction = "right" }: { direction?: ArrowDirection }) {
  return (
    <svg
      // Every caller names the action in adjacent text or an aria-label, so the arrow is
      // decorative in all of them.
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: "-0.125em", flex: "0 0 auto" }}
    >
      <path d={PATHS[direction]} />
    </svg>
  );
}
