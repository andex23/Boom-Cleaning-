import { BrandLoader } from "@/components/brand/BrandLoader";
import { resolveLogoSrc } from "@/components/brand/BrandLogo";
import styles from "./loading.module.css";

export default function Loading() {
  return <div className={styles.pageLoader}>
    <BrandLoader logoSrc={resolveLogoSrc("onLight")} label="Preparing your clean" priority />
  </div>;
}
