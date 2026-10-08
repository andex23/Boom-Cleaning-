import { createHash, timingSafeEqual } from "node:crypto";
export function validFlutterwaveCheckout(value: string) {
 try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "checkout.flutterwave.com" && !url.username && !url.password && url.pathname.startsWith("/v3/hosted/pay/"); } catch { return false; }
}
export function validFlutterwaveWebhook(supplied: string | null, secret: string | undefined) {
 return Boolean(supplied && secret && timingSafeEqual(createHash("sha256").update(supplied).digest(), createHash("sha256").update(secret).digest()));
}
export function flutterwavePaymentMatches(transaction: { status: string; amount: number; currency: string; tx_ref: string }, payment: { amount: string | number; currency: string }, reference: string) {
 return transaction.status === "successful" && transaction.tx_ref === reference && transaction.currency === "NGN" && payment.currency === "NGN" && Number.isFinite(transaction.amount) && Math.round(transaction.amount * 100) === Math.round(Number(payment.amount) * 100);
}
