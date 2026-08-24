import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidMetaSignature, isValidVerificationRequest, normalizeInstagramWebhook } from "../src/features/instagram/webhook";

describe("Instagram webhook security", () => {
  it("validates verification tokens without accepting the wrong mode or token", () => {
    expect(isValidVerificationRequest("subscribe", "boom-token", "boom-token")).toBe(true);
    expect(isValidVerificationRequest("subscribe", "wrong", "boom-token")).toBe(false);
    expect(isValidVerificationRequest("unsubscribe", "boom-token", "boom-token")).toBe(false);
  });

  it("accepts only a valid sha256 signature for the exact raw body", () => {
    const body = JSON.stringify({ object: "instagram", entry: [] });
    const signature = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect(isValidMetaSignature(body, signature, "app-secret")).toBe(true);
    expect(isValidMetaSignature(`${body} `, signature, "app-secret")).toBe(false);
    expect(isValidMetaSignature(body, null, "app-secret")).toBe(false);
  });
});

describe("Instagram webhook normalization", () => {
  it("normalizes messaging and change events for idempotent storage", () => {
    const events = normalizeInstagramWebhook({ object: "instagram", entry: [{
      id: "ig-account-1",
      messaging: [{ sender: { id: "customer-1" }, message: { mid: "message-1", text: "Hello" } }],
      changes: [{ field: "comments", value: { id: "comment-1", text: "How much?" } }],
    }] });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ external_event_id: "message-1", event_type: "instagram.messaging" });
    expect(events[1]).toMatchObject({ external_event_id: "comment-1", event_type: "instagram.comments" });
  });

  it("ignores non-Instagram and malformed envelopes", () => {
    expect(normalizeInstagramWebhook({ object: "page", entry: [] })).toEqual([]);
    expect(normalizeInstagramWebhook(null)).toEqual([]);
  });
});
