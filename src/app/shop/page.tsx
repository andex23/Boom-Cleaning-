import Image from "next/image";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { bundles, formatPrice } from "./catalog";
import styles from "./shop.module.css";

export const metadata = { title: "Boom Cleaning Paste | BOOM Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <>
    <SiteHeader />
    <main className={styles.product}>
      <Image src="/images/boom-cleaning-paste.jpg" width={1080} height={987}
        sizes="(max-width: 680px) 90vw, 480px" priority
        alt="White tub of Boom Cleaning Paste with a blue and yellow label" />
      <section>
        <h1>Boom Cleaning Paste</h1>
        <p>Hard stain removal</p>
        <form action="/shop/checkout" method="post">
          <fieldset>
            <legend>Choose your bundle</legend>
            {bundles.map(({ quantity, price }) => <label className={styles.bundle} key={quantity}>
              <input type="radio" name="quantity" value={quantity} defaultChecked={quantity === 1} />
              <span>{quantity} {quantity === 1 ? "tub" : "tubs"}</span><strong>{formatPrice(price)}</strong>
            </label>)}
          </fieldset>
          <label className={styles.email}>Receipt email<input type="email" name="email" required autoComplete="email" /></label>
          <p className={styles.note}>Preview checkout uses Paystack test payments.</p>
          {error && <p role="alert">Checkout could not start. Check your selection and email, then try again.</p>}
          <button type="submit">Continue to payment</button>
        </form>
      </section>
    </main>
    <SiteFooter />
  </>;
}
