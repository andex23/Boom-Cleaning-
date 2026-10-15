import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { TemporaryAccessForm } from "./TemporaryAccessForm";
import styles from "../login/login.module.css";
export const metadata={title:"Temporary admin access | BOOM",robots:{index:false,follow:false},referrer:"same-origin" as const};
export default function TemporaryAccessPage() {
  return <main className={styles.page}><section className={styles.panel}><Link className={styles.brand} href="/"><BrandLogo size={52} priority /></Link><p className={styles.eyebrow}>PRIVATE ACCESS</p><h1>Your BOOM dashboard.</h1><p className={styles.intro}>This private link opens one temporary admin session. It works once and must be opened within 15 minutes of issue.</p><TemporaryAccessForm /><p className={styles.hint}>Your session lasts one hour. The owner’s account and password stay the same. Sign out when you are finished.</p></section><aside><div><span>Temporary workspace access</span><strong>Review the services, prices and calendar.</strong></div></aside></main>;
}
