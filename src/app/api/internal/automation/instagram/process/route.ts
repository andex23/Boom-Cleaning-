import { createHash, timingSafeEqual } from "node:crypto";
import { processPendingInstagramDms } from "@/features/instagram/dm-processor";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export async function POST(request: Request) {
  const expected = process.env.AUTOMATION_WORKER_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !supplied || !safeEqual(supplied, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingInstagramDms();
  return Response.json(result);
}
