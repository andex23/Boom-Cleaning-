import { describe, expect, it } from "vitest";
import { buildDmAgentInstructions, dmAgentTurnSchema } from "../src/features/instagram/dm-agent";
import { extractInboundInstagramDm } from "../src/features/instagram/dm-event";

const catalog = {
  services: [{ slug: "deep-cleaning", name: "Deep cleaning", priceFrom: 45000 }, { slug: "fumigation", name: "Fumigation", priceFrom: null }],
  propertyTypes: [{ slug: "penthouse", name: "Penthouse" }, { slug: "apartment", name: "Apartment" }],
  spaceTypes: [{ slug: "bedroom", name: "Bedroom" }, { slug: "gazebo", name: "Gazebo" }, { slug: "boys-quarters", name: "Boys' quarters" }],
};

describe("Instagram conversational agent", () => {
  it("keeps invented pricing and unsafe conversations outside the AI boundary", () => {
    const instructions = buildDmAgentInstructions(catalog);
    expect(instructions).toContain("Never invent prices");
    expect(instructions).toContain("Hand off immediately");
    expect(instructions).toContain("ask at most one focused question");
  });

  it("offers the agent only the bookable vocabulary and forbids inventing slugs", () => {
    const instructions = buildDmAgentInstructions(catalog);
    expect(instructions).toContain("deep-cleaning: Deep cleaning; starts from NGN 45000");
    expect(instructions).toContain("fumigation: Fumigation; manual review");
    expect(instructions).toContain("penthouse: Penthouse");
    expect(instructions).toContain("gazebo: Gazebo");
    expect(instructions).toContain("Never invent a slug that is not listed");
  });

  it("captures a property described as rooms plus extras, not a bedroom count", () => {
    const turn = dmAgentTurnSchema.parse({
      reply: "Certainly. What area in Abuja is the property located?",
      intent: "service_enquiry",
      stage: "qualifying",
      shouldHandoff: false,
      handoffReason: null,
      collected: {
        customerName: null, serviceSlug: "deep-cleaning", propertyTypeSlug: "penthouse",
        spaces: [{ slug: "bedroom", count: 3 }, { slug: "gazebo", count: 1 }, { slug: "boys-quarters", count: 1 }],
        location: null, preferredDate: null, phone: null,
      },
    });
    expect(turn.collected.propertyTypeSlug).toBe("penthouse");
    expect(turn.collected.spaces).toEqual([{ slug: "bedroom", count: 3 }, { slug: "gazebo", count: 1 }, { slug: "boys-quarters", count: 1 }]);
  });

  it("extracts text DMs and ignores echoes or unsupported message types", () => {
    expect(extractInboundInstagramDm({ sender: { id: "ig-user" }, message: { mid: "m1", text: "I need a cleaner" } })).toEqual({ externalUserId: "ig-user", externalThreadId: "ig-user", text: "I need a cleaner" });
    expect(extractInboundInstagramDm({ sender: { id: "ig-user" }, message: { is_echo: true, text: "Our reply" } })).toBeNull();
    expect(extractInboundInstagramDm({ sender: { id: "ig-user" }, message: { attachments: [] } })).toBeNull();
  });
});
