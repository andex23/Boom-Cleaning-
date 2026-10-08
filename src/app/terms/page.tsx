import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import shared from "../home.module.css";
import styles from "./terms.module.css";

export const metadata = { title: "Booking terms and conditions | BOOM", description: "Terms for booking BOOM Cleaning Services." };

export default function TermsPage() {
  return <main className={shared.page}><SiteHeader /><article className={styles.content}>
    <p className={shared.pill}>Before you book</p><h1>Booking terms and conditions</h1>
    <h2>Your service and price</h2><p>Your booking covers the service, quantities, address and appointment shown in your booking review. Check these details before paying. The full price shown is due at checkout.</p>
    <h2>Payment and confirmation</h2><p>Payments are processed securely by Flutterwave. Your booking is confirmed once the full payment has been verified. Keep your booking reference and payment confirmation for any enquiries.</p>
    <h2>Preparing for your visit</h2><p>Provide accurate contact details and arrange access to the service address at the booked time. Let BOOM know about access restrictions, pets or other information relevant to the cleaning visit.</p>
    <h2>Changes and payment enquiries</h2><p>Contact BOOM with your booking reference if you need to change your appointment, cancel, request a refund or report a payment problem. Contact the team before paying if you need clarification about any of these arrangements.</p>
    <p><a href="mailto:boomcleaninfo@gmail.com">boomcleaninfo@gmail.com</a> · <a href="tel:+2349029799205">0902 979 9205</a></p>
    <Link href="/quote">Return to booking →</Link>
  </article><SiteFooter /></main>;
}
