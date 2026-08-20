import Image from "next/image";
import styles from "./BrandLoader.module.css";

export function BrandLoader({
  logoSrc,
  label = "Preparing BOOM",
  compact = false,
  priority = false,
}: {
  logoSrc: string;
  label?: string;
  compact?: boolean;
  priority?: boolean;
}) {
  return <div className={`${styles.loader} ${compact ? styles.compact : ""}`} role="status" aria-live="polite">
    <div className={styles.mark}>
      <Image className={styles.logo} src={logoSrc} alt="BOOM Cleaning Services" width={399} height={210} priority={priority} />
    </div>
    <span className={styles.line} aria-hidden="true" />
    <p className={styles.label}>{label}</p>
  </div>;
}
