import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata = { title: "Staff sign in | BOOM", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; signedOut?: string }> }) {
  if (await isAdminAuthenticated()) redirect("/admin");
  const { error, signedOut } = await searchParams;

  return <main className={styles.page}>
    <section className={styles.panel}>
      <Link href="/" className={styles.brand}>
        <BrandLogo size={52} priority />
      </Link>
      <p className={styles.eyebrow}>SECURE OPERATIONS</p>
      <h1>Welcome back.</h1>
      <p className={styles.intro}>Sign in to manage bookings, pricing, schedules and customer operations.</p>

      <LoginForm error={error} signedOut={signedOut === "1"} />

      <p className={styles.hint}>This workspace is for BOOM staff. Sessions end automatically after 12 hours.</p>
      <Link href="/" className={styles.back}>← Return to website</Link>
    </section>
    <aside>
      <div>
        <span>Private workspace</span>
        <strong>Bookings, pricing and customer operations in one place.</strong>
        <ul className={styles.asideList}>
          <li>Set prices without a deploy</li>
          <li>Quote the jobs that need a human</li>
          <li>See how every total was reached</li>
        </ul>
      </div>
    </aside>
  </main>;
}
