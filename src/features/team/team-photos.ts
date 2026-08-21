import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

const TEAM_DIR = path.join(process.cwd(), "public", "images", "team");
const IMAGE_TYPES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/**
 * Reads whatever photographs are sitting in public/images/team. Listing the folder rather
 * than hardcoding filenames means new photographs appear on the site by being dropped in,
 * and the section simply does not render while the folder is empty.
 */
export async function loadTeamPhotos(): Promise<{ src: string; alt: string }[]> {
  try {
    const entries = await readdir(TEAM_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && IMAGE_TYPES.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
      .map((name) => ({
        src: `/images/team/${name}`,
        alt: "The BOOM Cleaning Services team at work in Abuja",
      }));
  } catch {
    // No folder yet, or it cannot be read: the section is optional either way.
    return [];
  }
}
