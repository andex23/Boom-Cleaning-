import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The site drifted to 50 font-size values, 7 weights and 197 hex colours because three
 * stylesheets are minified blobs with overrides appended on top — every fix got stacked
 * rather than edited. These assertions are the thing that stops it happening again.
 */
const SCALE = [13, 15, 20, 26, 34, 46];
const WEIGHTS = ["400", "700"];

function stylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(full);
    return entry.isFile() && entry.name.endsWith(".css") ? [full] : [];
  });
}

const files = stylesheets("src").sort();
const read = (f: string) => readFileSync(f, "utf8");

function declarations(property: string) {
  const found: { file: string; value: string }[] = [];
  for (const file of files) {
    for (const m of read(file).matchAll(new RegExp(`${property}:\\s*([^;}]+)`, "g"))) {
      found.push({ file, value: m[1].trim().replace("!important", "").trim() });
    }
  }
  return found;
}

describe("type system", () => {
  it("uses only the six sizes in the scale", () => {
    const offenders = declarations("font-size").filter(({ value }) => {
      if (value === "inherit") return false;
      if (value.startsWith("clamp")) {
        // Both ends of a clamp have to be steps on the scale.
        const ends = [...value.matchAll(/([\d.]+)px/g)].map((m) => Number(m[1]));
        return !ends.every((px) => SCALE.includes(px));
      }
      const px = value.match(/^([\d.]+)px$/);
      return px ? !SCALE.includes(Number(px[1])) : false;
    });
    expect(offenders, `off-scale sizes:\n${offenders.map((o) => `  ${o.file}: ${o.value}`).join("\n")}`).toEqual([]);
  });

  it("uses only a regular and a bold weight", () => {
    const offenders = declarations("font-weight").filter(({ value }) => !WEIGHTS.includes(value));
    expect(offenders, `off-scale weights:\n${offenders.map((o) => `  ${o.file}: ${o.value}`).join("\n")}`).toEqual([]);
  });
});

describe("colour system", () => {
  it("keeps the palette small enough to be deliberate", () => {
    const hexes = new Set<string>();
    for (const file of files) {
      for (const m of read(file).matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b(?![0-9a-fA-F])/g)) {
        const raw = m[0].toLowerCase();
        hexes.add(raw.length === 4 ? "#" + [...raw.slice(1)].map((c) => c + c).join("") : raw);
      }
    }
    // Was 197 before the near-duplicate merge. This ceiling is a ratchet, not a target:
    // lower it when the palette shrinks further, never raise it to make a build pass.
    expect(hexes.size).toBeLessThanOrEqual(80);
  });

  it("never reintroduces the grey that fails contrast at body size", () => {
    // #6b7a90 measures 4.36:1 on --surface. --ink-faint (#67758d) is the accessible one.
    const users = files.filter((f: string) => !f.endsWith("globals.css") && read(f).includes("#6b7a90"));
    expect(users).toEqual([]);
  });
});
