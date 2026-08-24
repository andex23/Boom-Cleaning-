export const SERVICE_PRICING_MODELS = ["FIXED", "STARTING_FROM", "BEDROOM_BASED", "PROPERTY_SIZE", "QUANTITY_BASED", "LOCATION_BASED", "RULE_BASED", "MANUAL_QUOTE"] as const;
export type ServicePricingModel = (typeof SERVICE_PRICING_MODELS)[number];
export const SERVICE_QUESTION_TYPES = ["text", "number", "boolean", "single_select", "multi_select", "location", "date", "textarea"] as const;
export type ServiceQuestionType = (typeof SERVICE_QUESTION_TYPES)[number];
export type StaffRole = "STAFF" | "ADMIN";
export interface Service { id: string; name: string; slug: string; description: string | null; pricingModel: ServicePricingModel; isActive: boolean; sortOrder: number; }
export interface Customer { id: string; fullName: string | null; phone: string | null; email: string | null; location: string | null; createdAt: string; }
export interface Lead { id: string; customerId: string | null; serviceId: string | null; source: string; status: "NEW" | "QUALIFYING" | "QUALIFIED" | "QUOTE_SENT" | "AWAITING_PAYMENT" | "BOOKED" | "LOST" | "CANCELLED"; }
