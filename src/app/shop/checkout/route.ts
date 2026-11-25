import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { flutterwave } from "@/features/payments/flutterwave";
import { validFlutterwaveCheckout } from "@/features/payments/flutterwave-validation";
import { bundles } from "../catalog";

const deliverySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(25).regex(/^[+0-9() .-]+$/).refine(value => value.replace(/\D/g, "").length >= 7),
  address: z.string().trim().min(1).max(250),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return new Response(null, { status: 403 });
  try {
    const form = await request.formData();
    const customer = deliverySchema.safeParse(Object.fromEntries(form));
    const bundle = bundles.find(({ quantity }) => String(quantity) === form.get("quantity"));
    if (!bundle || !customer.success) return NextResponse.json({ error: "Invalid order details" }, { status: 400 });
    const { email, name, phone, address, city, state, instructions } = customer.data;
    const reference = `BOOM-paste-${bundle.quantity}-${randomUUID()}`;
    const session = await flutterwave("/payments", {
      tx_ref: reference, amount: bundle.price, currency: "NGN", customer: { email, name, phonenumber: phone },
      redirect_url: new URL("/shop/receipt", origin).href,
      customizations: { title: "Boom Cleaning Paste", description: `${bundle.quantity} tub(s)` },
      meta: { product: "Boom Cleaning Paste", quantity: bundle.quantity, delivery_address: address, city, state, delivery_instructions: instructions },
    });
    if (!validFlutterwaveCheckout(session.link)) return NextResponse.json({ error: "Checkout unavailable" }, { status: 502 });
    return NextResponse.json({ url: session.link });
  } catch {
    return NextResponse.json({ error: "Checkout unavailable" }, { status: 502 });
  }
}
