import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { flutterwave } from "@/features/payments/flutterwave";
import { validFlutterwaveCheckout } from "@/features/payments/flutterwave-validation";
import { bundles } from "../catalog";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const failure = NextResponse.redirect(new URL("/shop?error=checkout", origin), 303);
  if (request.headers.get("origin") !== origin) return new Response(null, { status: 403 });
  try {
    const form = await request.formData();
    const email = z.email().parse(form.get("email"));
    const bundle = bundles.find(({ quantity }) => String(quantity) === form.get("quantity"));
    if (!bundle) return failure;
    const reference = `BOOM-paste-${bundle.quantity}-${randomUUID()}`;
    const session = await flutterwave("/payments", {
      tx_ref: reference, amount: bundle.price, currency: "NGN", customer: { email },
      redirect_url: new URL("/shop/receipt", origin).href,
      customizations: { title: "Boom Cleaning Paste", description: `${bundle.quantity} tub(s)` },
      meta: { product: "Boom Cleaning Paste", quantity: bundle.quantity },
    });
    if (!validFlutterwaveCheckout(session.link)) return failure;
    return NextResponse.redirect(session.link, 303);
  } catch {
    return failure;
  }
}
