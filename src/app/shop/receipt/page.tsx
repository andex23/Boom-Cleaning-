import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";
import { flutterwave } from "@/features/payments/flutterwave";
import { bundles, formatPrice } from "../catalog";
import styles from "../shop.module.css";

async function receipt(reference?: string) {
  const match = reference?.match(/^BOOM-paste-([123])-([a-f0-9-]{36})$/);
  const bundle = bundles.find(({ quantity }) => String(quantity) === match?.[1]);
  if (!reference || !bundle) return;
  try {
    const tx = await flutterwave("/transactions/verify_by_reference?tx_ref=" + encodeURIComponent(reference));
    if (tx.tx_ref === reference && tx.status === "successful" &&
        tx.currency === "NGN" && Number(tx.amount) === bundle.price) return bundle;
  } catch {
    return;
  }
}

export default async function Receipt({ searchParams }: { searchParams: Promise<{ tx_ref?: string }> }) {
  const { tx_ref: reference } = await searchParams;
  const bundle = await receipt(reference);
  return <><SiteHeader /><main className={styles.product}><section>
    <h1>{bundle ? "Payment confirmed" : "Payment unconfirmed"}</h1>
    <p>{bundle ? `Boom Cleaning Paste · ${bundle.quantity} ${bundle.quantity === 1 ? "tub" : "tubs"} · ${formatPrice(bundle.price)}` : "If you completed checkout, refresh this page to check again."}</p>
    <Link href="/shop">Back to shop</Link>
  </section></main></>;
}
