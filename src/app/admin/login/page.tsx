import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import styles from "./login.module.css";
import "./login.brand.css";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdminAuthenticated()) redirect("/admin");
  const { error } = await searchParams;

  return <main className={styles.page}>
    <section className={styles.panel}>
      <Link href="/" className={styles.brand}><Image src="/images/boom-official-logo.jpg" width={52} height={52} alt="BOOM Cleaning Services official logo" priority /><span><strong>BOOM</strong><small>Cleaning Services</small></span></Link>
      <p className={styles.eyebrow}>SECURE OPERATIONS</p>
      <h1>Welcome back.</h1>
      <p className={styles.intro}>Sign in to manage bookings, customers, schedules and payments.</p>
      <form action="/api/admin/login" method="post">
        <label htmlFor="password">Admin password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {error && <p className={styles.error} role="alert">That password is not correct.</p>}
        <button type="submit">Open operations <span>→</span></button>
      </form>
      <Link href="/" className={styles.back}>← Return to website</Link>
    </section>
    <aside><div><span>Private workspace</span><strong>Bookings, teams and customer operations in one place.</strong></div></aside>
  </main>;
}
