/**
 * The outline icon set, drawn rather than pulled from a font or an icon package.
 *
 * Same reasoning as [Arrow]: a glyph that depends on the font stack renders differently
 * per platform, and an icon dependency is a lot of weight for a dozen shapes. These are
 * sized in `em` and stroked in `currentColor`, so each one inherits the size and colour of
 * whatever it sits in.
 */

const PATHS = {
  sparkle: "M12 3v6m0 6v6m-9-9h6m6 0h6M6.3 6.3l4.2 4.2m3 3 4.2 4.2m0-11.4-4.2 4.2m-3 3-4.2 4.2",
  calendar: "M8 3v4m8-4v4M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z",
  phone: "M7.5 3.5h-2A2 2 0 0 0 3.5 5.7c.3 3.6 1.9 7 4.4 9.5s5.9 4.1 9.5 4.4a2 2 0 0 0 2.1-2v-2a1.5 1.5 0 0 0-1.3-1.5l-2.2-.3a1.5 1.5 0 0 0-1.5.7l-.7 1.1a12 12 0 0 1-5-5l1.1-.7a1.5 1.5 0 0 0 .7-1.5l-.3-2.2A1.5 1.5 0 0 0 7.5 3.5Z",
  shield: "M12 3.2 5 6v5.5c0 4.1 2.8 7.9 7 9.3 4.2-1.4 7-5.2 7-9.3V6l-7-2.8Z",
  shieldCheck: "M12 3.2 5 6v5.5c0 4.1 2.8 7.9 7 9.3 4.2-1.4 7-5.2 7-9.3V6l-7-2.8Zm-3 8.6 2.2 2.2L15.4 10",
  headset: "M4 13.5v-1.7a8 8 0 1 1 16 0v1.7M4 13.5A1.5 1.5 0 0 1 5.5 12h1v5h-1A1.5 1.5 0 0 1 4 15.5v-2Zm16 0A1.5 1.5 0 0 0 18.5 12h-1v5h1a1.5 1.5 0 0 0 1.5-1.5v-2Zm0 3.5v.5a3 3 0 0 1-3 3h-3",
  leaf: "M4.5 19.5C3 15 5 8 12 6c3-.9 5.5-1.5 7.5-2 .5 2.5.5 6-.5 9-1.8 5.5-7 7.5-11 6M8.5 15.5c2-3.5 5-6 8.5-7.5",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 1.8",
  card: "M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7A1.5 1.5 0 0 1 5 5.5ZM7 14.5h3",
  star: "m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8L12 4Z",
  quote: "M9.5 6.5c-3 1.4-4.5 3.9-4.5 7.5v4h6v-6H7.2c.2-1.7 1-2.9 2.3-3.6ZM19.5 6.5C16.5 7.9 15 10.4 15 14v4h6v-6h-3.8c.2-1.7 1-2.9 2.3-3.6Z",
  chevronRight: "m9.5 5.5 6.5 6.5-6.5 6.5",
  check: "m5 12.5 4.5 4.5L19 7.5",
  facebook: "M14.5 8.5h2v-3h-2a3.5 3.5 0 0 0-3.5 3.5v2H9v3h2v6h3v-6h2.2l.3-3H14V9a.5.5 0 0 1 .5-.5Z",
  instagram: "M7.5 3.5h9A4 4 0 0 1 20.5 7.5v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4Zm4.5 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5-.5h.01",
  x: "m5 5 14 14M19 5 5 19",
  whatsapp: "M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Zm5.2-9.4c0 3 2.2 4.7 2.5 4.9.3.2 1.5.9 2.4.9.5 0 .9-.1 1.2-.4.3-.4.3-1 .2-1.1l-1.4-.7c-.2 0-.4.2-.6.5s-.4.3-.6.2c-.9-.4-1.7-1.2-2.1-2.1-.1-.2 0-.4.2-.6s.4-.4.5-.6l-.7-1.4c-.1-.1-.7-.1-1.1.2-.3.3-.5.7-.5 1.2Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg
      // Every caller pairs the icon with a label or adjacent text, so it is decorative.
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto" }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
