import "server-only";

import { closeSync, openSync, readSync } from "node:fs";
import path from "node:path";

export type ImageSize = { width: number; height: number };

/** Enough bytes to cover a PNG IHDR, a WebP header, and a JPEG's opening segments. */
const HEAD_BYTES = 65_536;

function readHead(publicPath: string): Buffer | null {
  try {
    const file = openSync(path.join(process.cwd(), "public", publicPath), "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const read = readSync(file, buffer, 0, HEAD_BYTES, 0);
      return read > 0 ? buffer.subarray(0, read) : null;
    } finally {
      closeSync(file);
    }
  } catch {
    return null;
  }
}

/** PNG keeps width and height in the IHDR chunk, always the first chunk after the magic. */
function pngSize(head: Buffer): ImageSize | null {
  if (head.length < 24 || head.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

/**
 * WebP is a RIFF container with three body formats. Lossy ("VP8 ") stores 14-bit
 * dimensions after the frame sync code; lossless ("VP8L") packs them into 28 bits; the
 * extended form ("VP8X") carries a canvas size as two 24-bit values, minus one.
 */
function webpSize(head: Buffer): ImageSize | null {
  if (head.length < 30 || head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WEBP") return null;
  const format = head.toString("ascii", 12, 16);

  if (format === "VP8 ") {
    if (head.readUInt8(23) !== 0x9d || head.readUInt8(24) !== 0x01 || head.readUInt8(25) !== 0x2a) return null;
    return { width: head.readUInt16LE(26) & 0x3fff, height: head.readUInt16LE(28) & 0x3fff };
  }
  if (format === "VP8L") {
    if (head.readUInt8(20) !== 0x2f) return null;
    const bits = head.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === "VP8X") {
    const width = head.readUIntLE(24, 3) + 1;
    const height = head.readUIntLE(27, 3) + 1;
    return { width, height };
  }
  return null;
}

/**
 * JPEG has no fixed header position: dimensions live in whichever start-of-frame marker
 * the encoder used, so the segment chain has to be walked to find it.
 */
function jpegSize(head: Buffer): ImageSize | null {
  if (head.length < 4 || head.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < head.length) {
    if (head.readUInt8(offset) !== 0xff) { offset += 1; continue; }
    const marker = head.readUInt8(offset + 1);
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    const length = head.readUInt16BE(offset + 2);
    // SOF0-SOF15, excluding the DHT/JPG/DAC markers that share the range.
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { height: head.readUInt16BE(offset + 5), width: head.readUInt16BE(offset + 7) };
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

/**
 * The real pixel dimensions of an image in /public, read from its own header.
 *
 * Layout that assumes a shape crops whatever does not match it — a 0.56 portrait forced
 * into a 4:3 frame loses 58% of the picture. Reading the file means a frame can take the
 * shape of the photograph inside it, whatever gets dropped into the folder later.
 */
export function imageSize(publicPath: string): ImageSize | null {
  const head = readHead(publicPath);
  if (!head) return null;
  const size = pngSize(head) ?? webpSize(head) ?? jpegSize(head);
  return size && size.width > 0 && size.height > 0 ? size : null;
}

export function imageAspect(publicPath: string): number | null {
  const size = imageSize(publicPath);
  return size ? size.width / size.height : null;
}
