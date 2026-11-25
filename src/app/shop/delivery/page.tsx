import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { bundles, formatPrice } from "../catalog";
import styles from "../shop.module.css";
import { DeliveryForm } from "./DeliveryForm";

export const metadata = { title: "Delivery details | BOOM Shop" };

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ quantity?: string }> }) {
  const { quantity } = await searchParams;
  const bundle = bundles.find((item) => String(item.quantity) === quantity);
  if (!bundle) redirect("/shop");

  return <>
    <SiteHeader />
    <main className={styles.delivery}>
      <Link href="/shop">← Change bundle</Link>
      <h1>Delivery details</h1>
      <p>Boom Cleaning Paste · {bundle.quantity} {bundle.quantity === 1 ? "tub" : "tubs"} · <strong>{formatPrice(bundle.price)}</strong></p>
      <DeliveryForm quantity={bundle.quantity} price={formatPrice(bundle.price)} />
    </main>
    <SiteFooter />
  </>;
}
