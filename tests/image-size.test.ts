import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { imageSize } from "@/lib/image-size";

/** Ground truth from the OS, so the header parsers are checked against something real. */
function sipsSize(file: string) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], { encoding: "utf8" });
  return {
    width: Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]),
    height: Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]),
  };
}

const folders = ["images/team", "images/services", "images"];

describe("intrinsic image dimensions", () => {
  it("reads every bundled image and agrees with the operating system", () => {
    let checked = 0;
    for (const folder of folders) {
      for (const name of readdirSync(`public/${folder}`, { withFileTypes: true })) {
        if (!name.isFile() || !/\.(png|jpe?g|webp)$/i.test(name.name)) continue;
        const publicPath = `/${folder}/${name.name}`;
        expect(imageSize(publicPath), publicPath).toEqual(sipsSize(`public/${folder}/${name.name}`));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("returns null rather than a wrong shape for anything it cannot parse", () => {
    expect(imageSize("/images/does-not-exist.png")).toBeNull();
    expect(imageSize("/../package.json")).toBeNull();
  });
});

describe("aspect clamping", () => {
  // Mirrors the expression in components/public/Photo.tsx.
  const clamp = (natural: number, min?: number, max?: number) =>
    Math.min(Math.max(natural, min ?? 0), max ?? Number.POSITIVE_INFINITY);

  it("applies a lower bound when no upper bound is given", () => {
    // A 0.56 portrait letterboxed into a banner: the earlier version returned 0.56.
    expect(clamp(0.563, 2.3, undefined)).toBe(2.3);
  });

  it("applies an upper bound when no lower bound is given", () => {
    expect(clamp(3.2, undefined, 1.8)).toBe(1.8);
  });

  it("leaves a ratio inside the bounds untouched", () => {
    expect(clamp(1.4, 1.2, 1.8)).toBe(1.4);
    expect(clamp(1.4)).toBe(1.4);
  });
});
