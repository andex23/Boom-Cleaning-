import { getInstagramWebhookConfig } from "@/features/instagram/config";
import { storeInstagramEvents } from "@/features/instagram/event-store";
import { isValidMetaSignature, isValidVerificationRequest, normalizeInstagramWebhook } from "@/features/instagram/webhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getInstagramWebhookConfig();
  if (!config) return Response.json({ error: "Instagram webhook is not configured" }, { status: 503 });

  const search = new URL(request.url).searchParams;
  const valid = isValidVerificationRequest(search.get("hub.mode"), search.get("hub.verify_token"), config.verifyToken);
  if (!valid) return Response.json({ error: "Invalid verification request" }, { status: 403 });
  return new Response(search.get("hub.challenge") ?? "", { status: 200 });
}

export async function POST(request: Request) {
  const config = getInstagramWebhookConfig();
  if (!config) return Response.json({ error: "Instagram webhook is not configured" }, { status: 503 });

  const rawBody = await request.text();
  if (!isValidMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), config.appSecret)) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const events = normalizeInstagramWebhook(payload);
  await storeInstagramEvents(events);
  return Response.json({ received: true, events: events.length });
}
