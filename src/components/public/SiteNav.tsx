"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import styles from "./SiteNav.module.css";

const subscribeNever = () => () => {};

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About us" },
  { href: "/#process", label: "How it works" },
];

/**
 * The header navigation. Below the breakpoint the links collapse into a panel rather than
 * disappearing, which is what happened before: they were simply hidden on a phone and the
 * only way to reach them was the footer.
 */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  // Portals need the DOM. This reports false during server rendering and true on the
  // client without setting state in an effect, so hydration still matches.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // A menu that covers the page should not leave the page scrolling behind it, and
    // keyboard focus should stay inside until it is closed.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); return; }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return <>
    <nav className={styles.desktopNav} aria-label="Primary">
      {LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
    </nav>

    <button
      ref={toggleRef}
      type="button"
      className={styles.toggle}
      aria-expanded={open}
      aria-controls="site-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      onClick={() => setOpen((value) => !value)}
    >
      <span className={open ? styles.barTop : ""} />
      <span className={open ? styles.barMid : ""} />
      <span className={open ? styles.barBottom : ""} />
    </button>

    {/* Rendered into <body>. The header sets backdrop-filter, which creates a containing
        block, so a position:fixed panel inside it would be trapped in the header's box
        rather than covering the viewport. */}
    {mounted ? createPortal(
      <>
        {open ? <button className={styles.scrim} aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
        <div id="site-menu" ref={panelRef} className={open ? styles.panelOpen : styles.panel} hidden={!open} aria-label="Site menu">
          <nav aria-label="Primary, mobile">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}<span aria-hidden="true">→</span>
              </Link>
            ))}
          </nav>
          <Link className={styles.panelCta} href="/quote" onClick={() => setOpen(false)}>Book a service</Link>
          <a className={styles.panelCall} href="tel:+2349029799205">Call 0902 979 9205</a>
        </div>
      </>,
      document.body,
    ) : null}
  </>;
}
