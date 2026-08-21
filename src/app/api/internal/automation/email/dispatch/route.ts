import { createHash, timingSafeEqual } from "node:crypto";
import { processBookingConfirmationEmails } from "@/features/email/booking-confirmation-worker";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

function hasWorkerAuthorization(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const secrets = [process.env.AUTOMATION_WORKER_SECRET, process.env.CRON_SECRET].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return Boolean(supplied && secrets.some((secret) => safeEqual(supplied, secret)));
}

export async function POST(request: Request) {
  if (!hasWorkerAuthorization(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processBookingConfirmationEmails();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
