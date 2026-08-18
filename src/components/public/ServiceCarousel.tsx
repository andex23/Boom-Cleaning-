"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicServiceView } from "@/features/services/public-catalog";
import styles from "./ServiceCarousel.module.css";

/**
 * A horizontal service rail. Built on native overflow scrolling with scroll snapping, so
 * it swipes on a phone, scrolls with a trackpad, and still works with JavaScript off —
 * the arrows only add a convenience for mouse users.
 */
export function ServiceCarousel({ services }: { services: PublicServiceView[] }) {
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
  }, [measure, services.length]);

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    // Move by whole cards so a slide never ends up half visible.
    const card = track.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: step * direction, behavior: still ? "auto" : "smooth" });
  };

  return (
    <div className={styles.rail} role="region" aria-label="BOOM services" aria-roledescription="carousel">
      {overflows ? (
        <div className={styles.controls}>
          <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Previous services">←</button>
          <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="More services">→</button>
        </div>
      ) : null}

      <ul className={styles.track} ref={trackRef} onScroll={measure} tabIndex={0} aria-label="Services, scroll for more">
        {services.map((service, index) => (
          <li key={service.id} className={styles.slide}>
            <Link href={`/quote?service=${service.slug}`} className={styles.card} aria-label={`Book ${service.name}`}>
              <span className={styles.media}>
                <Image src={service.image} alt="" fill sizes="(max-width: 700px) 80vw, 340px" />
                <small className={styles.index}>{String(index + 1).padStart(2, "0")}</small>
              </span>
              <span className={styles.body}>
                <strong>{service.name}</strong>
                <span className={styles.tagline}>{service.tagline}</span>
                <span className={styles.foot}>
                  <em>{service.priceFrom ? `From ₦${service.priceFrom.toLocaleString("en-NG")}` : "Quoted for you"}</em>
                  <span className={styles.go}>Book <span aria-hidden="true">→</span></span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {overflows ? <p className={styles.hint}>Swipe or use the arrows to see every service.</p> : null}
    </div>
  );
}
