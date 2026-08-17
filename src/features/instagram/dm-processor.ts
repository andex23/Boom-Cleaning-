import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import { generateDmAgentTurn, type DmAgentCatalog, type DmAgentTurn, type DmHistoryItem } from "./dm-agent";
import { extractInboundInstagramDm } from "./dm-event";

type JsonRecord = Record<string, unknown>;

interface PendingEvent {
  id: string;
  external_event_id: string;
  payload: JsonRecord;
}

interface DmSession {
  id: string;
  external_thread_id: string;
  external_user_id: string;
  status: "ACTIVE" | "PAUSED" | "HANDOFF" | "CLOSED";
  history: DmHistoryItem[];
  qualification: JsonRecord;
  lead_id: string | null;
}

function getSupabase() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getOrCreateSession(supabase: SupabaseClient, externalThreadId: string, externalUserId: string) {
  const existing = await supabase.from("instagram_dm_sessions").select("*").eq("external_thread_id", externalThreadId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data as DmSession;

  const created = await supabase.from("instagram_dm_sessions").insert({
    external_thread_id: externalThreadId,
    external_user_id: externalUserId,
  }).select("*").single();
  if (created.error) throw new Error(created.error.message);
  return created.data as DmSession;
}

/**
 * The vocabulary the agent may reference, read from the same tables the web quote uses so
 * a DM lead records the same shape of scope as a website lead.
 */
async function loadAgentCatalog(supabase: SupabaseClient): Promise<DmAgentCatalog> {
  const [services, propertyTypes, spaceTypes] = await Promise.all([
    supabase.from("services").select("slug,name,base_price,requires_review").eq("is_active", true).order("sort_order"),
    supabase.from("property_types").select("slug,name").eq("is_active", true).order("sort_order"),
    supabase.from("space_types").select("slug,name").eq("is_active", true).order("sort_order"),
  ]);
  for (const result of [services, propertyTypes, spaceTypes]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    services: (services.data as { slug: string; name: string; base_price: number | string; requires_review: boolean }[])
      .map((row) => ({ slug: row.slug, name: row.name, priceFrom: row.requires_review || Number(row.base_price) <= 0 ? null : Number(row.base_price) })),
    propertyTypes: propertyTypes.data as { slug: string; name: string }[],
    spaceTypes: spaceTypes.data as { slug: string; name: string }[],
  };
}

async function ensureLead(supabase: SupabaseClient, session: DmSession, turn: DmAgentTurn) {
  if (!["service_enquiry", "pricing", "booking"].includes(turn.intent)) return session.lead_id;

  let identity = await supabase.from("customer_identities")
    .select("customer_id")
    .eq("channel", "INSTAGRAM")
    .eq("external_id", session.external_user_id)
    .maybeSingle();
  if (identity.error) throw new Error(identity.error.message);

  let customerId = identity.data?.customer_id as string | undefined;
  if (!customerId) {
    const customer = await supabase.from("customers").insert({
      full_name: turn.collected.customerName,
      location: turn.collected.location,
    }).select("id").single();
    if (customer.error) throw new Error(customer.error.message);
    customerId = customer.data.id as string;

    identity = await supabase.from("customer_identities").insert({
      customer_id: customerId,
      channel: "INSTAGRAM",
      external_id: session.external_user_id,
    }).select("customer_id").single();
    if (identity.error) throw new Error(identity.error.message);
  } else if (turn.collected.customerName || turn.collected.location) {
    const customerUpdate: Record<string, string> = {};
    if (turn.collected.customerName) customerUpdate.full_name = turn.collected.customerName;
    if (turn.collected.location) customerUpdate.location = turn.collected.location;
    const updated = await supabase.from("customers").update(customerUpdate).eq("id", customerId);
    if (updated.error) throw new Error(updated.error.message);
  }

  let serviceId: string | null = null;
  if (turn.collected.serviceSlug) {
    const service = await supabase.from("services").select("id").eq("slug", turn.collected.serviceSlug).maybeSingle();
    if (service.error) throw new Error(service.error.message);
    serviceId = service.data?.id as string | undefined ?? null;
  }

  const status = turn.stage === "quote_ready" || turn.stage === "booking" ? "QUALIFIED" : "QUALIFYING";
  const notes = `Instagram DM qualification: ${JSON.stringify(turn.collected)}`;
  if (session.lead_id) {
    const lead = await supabase.from("leads").update({ service_id: serviceId, status, notes }).eq("id", session.lead_id);
    if (lead.error) throw new Error(lead.error.message);
    return session.lead_id;
  }

  const lead = await supabase.from("leads").insert({
    customer_id: customerId,
    service_id: serviceId,
    source: "INSTAGRAM_DM",
    status,
    notes,
  }).select("id").single();
  if (lead.error) throw new Error(lead.error.message);
  return lead.data.id as string;
}

async function processEvent(supabase: SupabaseClient, event: PendingEvent, catalog: DmAgentCatalog) {
  const claimedAt = new Date().toISOString();
  const claimed = await supabase.from("automation_events")
    .update({ processing_started_at: claimedAt })
    .eq("id", event.id)
    .is("processing_started_at", null)
    .select("id")
    .maybeSingle();
  if (claimed.error) throw new Error(claimed.error.message);
  if (!claimed.data) return "skipped" as const;

  try {
    const inbound = extractInboundInstagramDm(event.payload);
    if (!inbound) {
      await supabase.from("automation_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
      return "ignored" as const;
    }

    const session = await getOrCreateSession(supabase, inbound.externalThreadId, inbound.externalUserId);
    if (session.status !== "ACTIVE") {
      await supabase.from("automation_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
      return "paused" as const;
    }

    const history = [...(Array.isArray(session.history) ? session.history : []), { role: "user" as const, content: inbound.text }].slice(-24);
    const { responseId, turn } = await generateDmAgentTurn({ externalUserId: inbound.externalUserId, history, catalog });
    const leadId = await ensureLead(supabase, session, turn);
    const nextHistory = [...history, { role: "assistant" as const, content: turn.reply }].slice(-24);
    const now = new Date().toISOString();

    const sessionUpdate = await supabase.from("instagram_dm_sessions").update({
      history: nextHistory,
      qualification: { ...session.qualification, ...turn.collected, intent: turn.intent, stage: turn.stage },
      lead_id: leadId,
      status: turn.shouldHandoff ? "HANDOFF" : "ACTIVE",
      handoff_reason: turn.shouldHandoff ? turn.handoffReason || "AI requested staff review" : null,
      last_openai_response_id: responseId,
      last_inbound_at: now,
      last_outbound_at: now,
    }).eq("id", session.id);
    if (sessionUpdate.error) throw new Error(sessionUpdate.error.message);

    const outbox = await supabase.from("automation_outbox").upsert({
      event_type: "instagram.dm.reply",
      aggregate_type: "instagram_dm_session",
      aggregate_id: session.id,
      payload: { recipient_id: inbound.externalUserId, text: turn.reply, requires_handoff: turn.shouldHandoff },
      idempotency_key: `instagram-dm-reply:${event.external_event_id}`,
    }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (outbox.error) throw new Error(outbox.error.message);

    const completed = await supabase.from("automation_events").update({ processed_at: now }).eq("id", event.id);
    if (completed.error) throw new Error(completed.error.message);
    return turn.shouldHandoff ? "handoff" as const : "replied" as const;
  } catch (error) {
    await supabase.from("automation_events").update({
      failed_at: new Date().toISOString(),
      failure_reason: error instanceof Error ? error.message.slice(0, 1000) : "Unknown DM processing error",
    }).eq("id", event.id);
    throw error;
  }
}

export async function processPendingInstagramDms(limit = 10) {
  const supabase = getSupabase();
  const pending = await supabase.from("automation_events")
    .select("id,external_event_id,payload")
    .eq("source", "instagram")
    .eq("event_type", "instagram.messaging")
    .is("processed_at", null)
    .is("failed_at", null)
    .is("processing_started_at", null)
    .order("received_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 25));
  if (pending.error) throw new Error(pending.error.message);

  const results = { processed: 0, replied: 0, handoffs: 0, ignored: 0, failed: 0 };
  const events = (pending.data ?? []) as PendingEvent[];
  if (!events.length) return results;

  // Loaded once per batch: the vocabulary is identical for every event.
  const catalog = await loadAgentCatalog(supabase);
  for (const event of events) {
    try {
      const outcome = await processEvent(supabase, event, catalog);
      if (outcome !== "skipped") results.processed += 1;
      if (outcome === "replied") results.replied += 1;
      if (outcome === "handoff") results.handoffs += 1;
      if (outcome === "ignored" || outcome === "paused") results.ignored += 1;
    } catch {
      results.failed += 1;
    }
  }
  return results;
}
