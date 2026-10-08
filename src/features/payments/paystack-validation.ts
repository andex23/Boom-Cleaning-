import { createHmac, timingSafeEqual } from "node:crypto";
export function validPaystackSignature(body: string, signature: string | null, secret: string) {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), createHmac("sha512", secret).update(body).digest());
}
export function paymentMatches(transaction: { status: string; amount: number; currency: string; domain: string }, payment: { amount: number | string; currency: string }) {
  return transaction.status === "success" && transaction.domain === "test" && transaction.currency === payment.currency && transaction.amount === Math.round(Number(payment.amount) * 100);
}
