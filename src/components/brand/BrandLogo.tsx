import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * One definition of the logo for the whole site.
 *
 * Files are tried best-first, so replacing the mark is a matter of dropping a file into
 * public/images and nothing else: an SVG wins if present, then a transparent PNG, and the
 * original photograph is only the last resort. Previously the path was written out in five
 * separate places, so a new logo meant editing five files.
 */
const CANDIDATES = [
  "/images/boom-logo.svg",
  "/images/boom-logo.png",
  "/images/boom-logo.webp",
  "/images/boom-official-logo.png",
  "/images/boom-official-logo.jpg",
];

export function resolveLogoSrc() {
  for (const candidate of CANDIDATES) {
    if (existsSync(path.join(process.cwd(), "public", candidate))) return candidate;
  }
  return CANDIDATES[CANDIDATES.length - 1];
}

export function BrandLogo({ size = 64, priority = false, className }: { size?: number; priority?: boolean; className?: string }) {
  const src = resolveLogoSrc();
  const isVector = src.endsWith(".svg");
  return (
    <Image
      src={src}
      // A wordmark is wider than it is tall; a square crop is only right for the photograph.
      width={isVector ? Math.round(size * 1.9) : size}
      height={size}
      alt="BOOM Cleaning Services"
      priority={priority}
      className={className}
      unoptimized={isVector}
    />
  );
}
