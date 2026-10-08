import "server-only";
import { verifyPayment as verifyFlutterwave } from "./flutterwave";
import { verifyPayment as verifyPaystack } from "./paystack";
export { requestPayment, loadPayments } from "./flutterwave";
export function verifyPayment(reference: string) { return reference.startsWith("BOOM-flw-") ? verifyFlutterwave(reference) : verifyPaystack(reference); }
