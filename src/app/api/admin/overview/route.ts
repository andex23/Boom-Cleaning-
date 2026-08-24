import { NextResponse } from "next/server";
import { isAdminAuthenticated, isSameOriginRequest } from "@/lib/admin-auth";
import { loadOperationsOverview } from "@/features/operations/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });

  try {
    return NextResponse.json(await loadOperationsOverview(), { headers: noStore });
  } catch {
    console.error("Operations overview load failed");
    return NextResponse.json({ error: "Unable to load the overview." }, { status: 502, headers: noStore });
  }
}
