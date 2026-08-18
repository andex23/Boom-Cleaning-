import "server-only";

import { existsSync, readSync, openSync, closeSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * One definition of the logo for the whole site.
 *
 * Files are tried best-first, so replacing the mark is a matter of dropping a file into
 * public/images and nothing else: an SVG wins if present, then a transparent PNG, and the
 * original photograph is only the last resort.
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

export function BrandLogo({ size = 64, priority = false, className }: { size?: number; priority?: boolean; className?: string }) {
  const src = resolveLogoSrc();
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
