import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface InstagramAutomationEvent {
  source: "instagram";
  external_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function isValidVerificationRequest(mode: string | null, suppliedToken: string | null, expectedToken: string) {
  return mode === "subscribe" && Boolean(suppliedToken && safeEqual(suppliedToken, expectedToken));
}

export function isValidMetaSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return safeEqual(signature, expected);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function eventId(payload: Record<string, unknown>) {
  for (const key of ["mid", "id", "comment_id", "media_id"]) {
    if (typeof payload[key] === "string" && payload[key]) return payload[key];
  }
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function normalizeInstagramWebhook(payload: unknown): InstagramAutomationEvent[] {
  const envelope = asRecord(payload);
  if (!envelope || envelope.object !== "instagram" || !Array.isArray(envelope.entry)) return [];

  const events: InstagramAutomationEvent[] = [];
  for (const rawEntry of envelope.entry) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;

    if (Array.isArray(entry.messaging)) {
      for (const rawMessage of entry.messaging) {
        const message = asRecord(rawMessage);
        if (!message) continue;
        const nestedMessage = asRecord(message.message);
        events.push({
          source: "instagram",
          external_event_id: eventId(nestedMessage ? { ...message, ...nestedMessage } : message),
          event_type: "instagram.messaging",
          payload: { entry_id: entry.id, ...message },
        });
      }
    }

    if (Array.isArray(entry.changes)) {
      for (const rawChange of entry.changes) {
        const change = asRecord(rawChange);
        if (!change || typeof change.field !== "string") continue;
        const value = asRecord(change.value) ?? {};
        const normalizedPayload = { entry_id: entry.id, field: change.field, value };
        events.push({
          source: "instagram",
          external_event_id: eventId(Object.keys(value).length ? value : normalizedPayload),
          event_type: `instagram.${change.field}`,
          payload: normalizedPayload,
        });
      }
    }
  }
  return events;
}
