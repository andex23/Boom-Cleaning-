import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ConfirmationClient } from "./confirmation-client";
import styles from "./payment.module.css";

export const metadata: Metadata = {
  title: "Your booking | BOOM Cleaning",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default function PaymentReturn() {
  return <div className={styles.shell}>
    <header className={styles.header}>
      <Link href="/" aria-label="BOOM Cleaning home"><BrandLogo size={44} priority /></Link>
      <a href="tel:+2349029799205">Need a hand? <span>Call BOOM</span></a>
    </header>
    <ConfirmationClient />
  </div>;
}
