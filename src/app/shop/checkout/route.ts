import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { paystack } from "@/features/payments/paystack";
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
    const session = await paystack("/transaction/initialize", {
      email, reference, amount: bundle.price * 100, currency: "NGN",
      callback_url: new URL("/shop/receipt", origin).href,
      metadata: { product: "Boom Cleaning Paste", quantity: bundle.quantity },
    });
    const checkout = new URL(session.authorization_url);
    if (session.reference !== reference || checkout.origin !== "https://checkout.paystack.com") return failure;
    return NextResponse.redirect(checkout, 303);
  } catch {
    return failure;
  }
}
