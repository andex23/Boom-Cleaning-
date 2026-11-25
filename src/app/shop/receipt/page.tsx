import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";
import { paystack } from "@/features/payments/paystack";
import { bundles, formatPrice } from "../catalog";
import styles from "../shop.module.css";

async function receipt(reference?: string) {
  const match = reference?.match(/^BOOM-paste-([123])-([a-f0-9-]{36})$/);
  const bundle = bundles.find(({ quantity }) => String(quantity) === match?.[1]);
  if (!reference || !bundle) return;
  try {
    const tx = await paystack("/transaction/verify/" + encodeURIComponent(reference));
    if (tx.reference === reference && tx.status === "success" && tx.domain === "test" &&
        tx.currency === "NGN" && tx.amount === bundle.price * 100) return bundle;
  } catch {
    return;
  }
}

export default async function Receipt({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const bundle = await receipt(reference);
  return <><SiteHeader /><main className={styles.product}><section>
    <h1>{bundle ? "Test payment confirmed" : "Payment unconfirmed"}</h1>
    <p>{bundle ? `Boom Cleaning Paste · ${bundle.quantity} ${bundle.quantity === 1 ? "tub" : "tubs"} · ${formatPrice(bundle.price)}` : "If you completed checkout, refresh this page to check again."}</p>
    <Link href="/shop">Back to shop</Link>
  </section></main></>;
}
