import "server-only";

import Image from "next/image";
import { imageSize } from "@/lib/image-size";

/**
 * A photograph in a frame shaped like the photograph.
 *
 * Every frame on the site used to declare its own aspect ratio — 4/3, 16/9, 3/4 — while
 * the pictures range from 0.56 to 1.50. `object-fit: cover` then quietly threw away
 * whatever did not fit, up to 58% of one of the team photographs. Reading the real shape
 * off the file and handing it to the frame means nothing is cropped, and a replacement
 * photograph of any shape stays whole too.
 *
 * `minAspect`/`maxAspect` exist for frames that genuinely cannot take any shape — a
 * full-bleed banner cannot be 1600px tall. Inside those bounds the picture is untouched;
 * outside them it is cropped deliberately, from the centre unless `position` says otherwise.
 */
export function Photo({
  src,
  alt,
  className,
  sizes,
  priority = false,
  minAspect,
  maxAspect,
  position,
  fill = false,
  "data-reveal": reveal,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  minAspect?: number;
  maxAspect?: number;
  position?: string;
  /**
   * The frame is sized by CSS — it fills a column or bleeds to the viewport — instead of
   * taking the photograph's shape. A hero is the ground the page sits on, so it has to
   * meet the edges it is given; the crop is chosen with `position` rather than avoided.
   */
  fill?: boolean;
  /** Scroll-timeline hook; see the motion block in globals.css. */
  "data-reveal"?: string;
}) {
  const size = imageSize(src);
  const natural = size ? size.width / size.height : null;
  // An absent bound must not constrain: defaulting either side to `natural` made the
  // clamp collapse back onto the natural ratio and silently ignore the other bound.
  const aspect = natural === null
    ? null
    : Math.min(Math.max(natural, minAspect ?? 0), maxAspect ?? Number.POSITIVE_INFINITY);

  return (
    <div className={className} data-reveal={reveal} style={!fill && aspect ? { aspectRatio: String(aspect) } : undefined}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={position ? { objectPosition: position } : undefined} />
    </div>
  );
}
