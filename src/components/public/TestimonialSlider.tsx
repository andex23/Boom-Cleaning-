"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Testimonial } from "@/features/reviews/testimonials";
import styles from "./TestimonialSlider.module.css";
import { Arrow } from "@/components/brand/Arrow";

const SOURCE_LABELS: Record<Testimonial["source"], string> = {
  WHATSAPP: "via WhatsApp", INSTAGRAM: "via Instagram", GOOGLE: "via Google", EMAIL: "via email", OTHER: "",
};

/**
 * Testimonials as a horizontal rail rather than a stacked grid. Same approach as the
 * service carousel: native overflow scrolling with snapping, so it swipes on a phone and
 * works with JavaScript off.
 */
export function TestimonialSlider({ testimonials }: { testimonials: Testimonial[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setOverflows(max > 8);
    setAtStart(track.scrollLeft <= 8);
    setAtEnd(track.scrollLeft >= max - 8);
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, testimonials.length]);

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: step * direction, behavior: still ? "auto" : "smooth" });
  };

  return (
    <div className={styles.rail} role="region" aria-label="Customer testimonials" aria-roledescription="carousel">
      {overflows ? (
        <div className={styles.controls}>
          <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Previous testimonials"><Arrow direction="left" /></button>
          <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="More testimonials"><Arrow /></button>
        </div>
      ) : null}

      <ul className={styles.track} ref={trackRef} onScroll={measure} tabIndex={0} aria-label="Testimonials, scroll for more">
        {testimonials.map((testimonial) => (
          <li key={testimonial.id} className={styles.slide}>
            <figure className={styles.card}>
              <span className={styles.mark} aria-hidden="true">&ldquo;</span>
              <blockquote>{testimonial.quote}</blockquote>
              <figcaption>
                <strong>{testimonial.author}</strong>
                <span>{SOURCE_LABELS[testimonial.source]}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
