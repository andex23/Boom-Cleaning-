"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicServiceView } from "@/features/services/public-catalog";
import { bundles, formatPrice } from "@/app/shop/catalog";
import styles from "./ServiceCarousel.module.css";
import { Arrow } from "@/components/brand/Arrow";

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

  const cards = [
    ...services.map((service) => ({
      ...service,
      href: `/quote?service=${service.slug}`,
      action: "Book",
    })),
    {
      href: "/shop",
      name: "Boom Cleaning Paste",
      image: "/images/boom-cleaning-paste.jpg",
      tagline: "Hard stain removal",
      priceLabel: `From ${formatPrice(bundles[0].price)}`,
      action: "Shop",
    },
  ];

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
    <div className={styles.rail} role="region" aria-label="BOOM services and products" aria-roledescription="carousel">
      {overflows ? (
        <div className={styles.controls}>
          <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Previous card"><Arrow direction="left" /></button>
          <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="Next card"><Arrow /></button>
        </div>
      ) : null}

      <ul className={styles.track} ref={trackRef} onScroll={measure} tabIndex={0} aria-label="Services and products, scroll for more">
        {cards.map((card) => (
          <li key={card.href} className={styles.slide}>
            <Link href={card.href} className={styles.card} aria-label={`${card.action} ${card.name}`}>
              <span className={styles.media}>
                <Image src={card.image} alt="" fill style={card.href === "/shop" ? { objectFit: "contain", background: "white" } : undefined} sizes="(max-width: 700px) 80vw, 340px" />
              </span>
              <span className={styles.body}>
                <strong>{card.name}</strong>
                <span className={styles.tagline}>{card.tagline}</span>
                <span className={styles.foot}>
                  <em>{card.priceLabel}</em>
                  <span className={styles.go}>{card.action} <Arrow /></span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {overflows ? <p className={styles.hint}>Swipe or use the arrows to see more.</p> : null}
    </div>
  );
}
