"use client";

import { useEffect, useState } from "react";
import { BrandLoader } from "./BrandLoader";
import styles from "./SiteBootLoader.module.css";

/** A short branded reveal for the initial document load; route loading is handled by app/loading.tsx. */
export function SiteBootLoader({ logoSrc }: { logoSrc: string }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let exitTimer = 0;
    let removeTimer = 0;
    const finish = () => {
      exitTimer = window.setTimeout(() => setLeaving(true), 420);
      removeTimer = window.setTimeout(() => setVisible(false), 780);
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;
  return <div className={`${styles.boot} ${leaving ? styles.leaving : ""}`} aria-hidden={leaving}>
    <BrandLoader logoSrc={logoSrc} label="BOOM Cleaning Services" priority />
  </div>;
}
