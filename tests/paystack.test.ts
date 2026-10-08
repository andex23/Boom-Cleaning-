import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { validPaystackSignature, paymentMatches } from "../src/features/payments/paystack-validation";
describe("Paystack payment trust boundary", () => {
 it("accepts only authentic unmodified webhook bodies", () => {
  const body='{"event":"charge.success"}'; const secret="test-secret";
  const signature=createHmac("sha512",secret).update(body).digest("hex");
  expect(validPaystackSignature(body,signature,secret)).toBe(true);
  expect(validPaystackSignature(body+" ",signature,secret)).toBe(false);
  expect(validPaystackSignature(body,"bad",secret)).toBe(false);
  expect(validPaystackSignature(body,null,secret)).toBe(false);
 });
 it("requires successful full NGN payment in test mode", () => {
  const transaction={status:"success",amount:8600000,currency:"NGN",domain:"test"};
  const payment={amount:"86000.00",currency:"NGN"};
  expect(paymentMatches(transaction,payment)).toBe(true);
  for (const patch of [{amount:86000},{currency:"USD"},{domain:"live"},{status:"failed"}]) expect(paymentMatches({...transaction,...patch},payment)).toBe(false);
 });
});
