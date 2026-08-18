import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

const PROCESS_DIR = path.join(process.cwd(), "public", "images", "process");
const IMAGE_TYPES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/**
 * Photographs for the "how it works" steps, matched to steps by filename order: 01-*, 02-*
 * and so on. Steps without a matching photograph simply render without one, so the section
 * works whether there are three images or none.
 */
export async function loadProcessPhotos(): Promise<string[]> {
  try {
    const entries = await readdir(PROCESS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && IMAGE_TYPES.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
      .map((name) => `/images/process/${name}`);
  } catch {
    return [];
  }
}
