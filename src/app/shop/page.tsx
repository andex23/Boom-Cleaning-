import Image from "next/image";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { bundles, deliveryPaymentNote, formatPrice } from "./catalog";
import styles from "./shop.module.css";

export const metadata = { title: "Boom Cleaning Paste | BOOM Shop" };

export default function ShopPage() {
  return <>
    <SiteHeader />
    <main className={styles.product}>
      <Image src="/images/boom-cleaning-paste.jpg" width={1080} height={987}
        sizes="(max-width: 680px) 90vw, 480px" priority
        alt="White tub of Boom Cleaning Paste with a blue and yellow label" />
      <section>
        <h1>Boom Cleaning Paste</h1>
        <p>Hard stain removal</p>
        <form action="/shop/delivery" method="get">
          <fieldset>
            <legend>Choose your bundle</legend>
            {bundles.map(({ quantity, price }) => <label className={styles.bundle} key={quantity}>
              <input type="radio" name="quantity" value={quantity} defaultChecked={quantity === 1} />
              <span>{quantity} {quantity === 1 ? "tub" : "tubs"}</span><strong>{formatPrice(price)}</strong>
            </label>)}
          </fieldset>
          <p>{deliveryPaymentNote}</p>
          <button type="submit">Buy</button>
        </form>
      </section>
    </main>
    <SiteFooter />
  </>;
}
