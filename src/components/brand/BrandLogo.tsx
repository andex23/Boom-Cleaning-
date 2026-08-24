import "server-only";

import { existsSync, readSync, openSync, closeSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * One definition of the logo for the whole site.
 *
 * The mark is a single flat colour, so it needs two versions: cyan reads at 7.3:1 on the
 * navy panels but only 2.07:1 on the warm off-white, where navy reads at 14.2:1. Callers
 * say which ground the logo is sitting on rather than picking a file.
 *
 * Files are tried best-first within each tone, so replacing the mark means dropping a file
 * into public/images and nothing else.
 */
const CANDIDATES = {
  onLight: [
    "/images/boom-logo-dark.svg",
    "/images/boom-logo-dark.png",
    "/images/boom-logo.svg",
    "/images/boom-logo.png",
    "/images/boom-official-logo.jpg",
  ],
  onDark: [
    "/images/boom-logo.svg",
    "/images/boom-logo.png",
    "/images/boom-logo-dark.png",
    "/images/boom-official-logo.jpg",
  ],
} as const;

export type LogoTone = keyof typeof CANDIDATES;

export function resolveLogoSrc(tone: LogoTone = "onLight") {
  const options = CANDIDATES[tone];
  for (const candidate of options) {
    if (existsSync(path.join(process.cwd(), "public", candidate))) return candidate;
  }
  return options[options.length - 1];
}

/**
 * A wordmark is wider than it is tall, and assuming a square crops it. PNG stores its
 * dimensions in the IHDR chunk at a fixed offset, so the real shape is read from the file
 * rather than guessed.
 */
function pngAspect(publicPath: string): number | null {
  if (!publicPath.endsWith(".png")) return null;
  try {
    const file = openSync(path.join(process.cwd(), "public", publicPath), "r");
    const header = Buffer.alloc(24);
    readSync(file, header, 0, 24, 0);
    closeSync(file);
    if (header.toString("ascii", 12, 16) !== "IHDR") return null;
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    return width > 0 && height > 0 ? width / height : null;
  } catch {
    return null;
  }
}

export function BrandLogo({
  size = 64,
  tone = "onLight",
  priority = false,
  className,
}: { size?: number; tone?: LogoTone; priority?: boolean; className?: string }) {
  const src = resolveLogoSrc(tone);
  const isVector = src.endsWith(".svg");
  const aspect = isVector ? 1.9 : pngAspect(src) ?? 1;
  return (
    <Image
      src={src}
      width={Math.round(size * aspect)}
      height={size}
      alt="BOOM Cleaning Services"
      priority={priority}
      className={className}
      unoptimized={isVector}
    />
  );
}
