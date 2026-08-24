export const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"] as const;
export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export const PAYMENT_STATUSES = ["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"] as const;
export const JOB_STATUSES = ["UNASSIGNED", "ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const CONVERSATION_CHANNELS = ["WEBSITE", "INSTAGRAM", "WHATSAPP", "FACEBOOK", "PHONE", "EMAIL"] as const;
export const MESSAGE_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export const OUTBOX_STATUSES = ["PENDING", "PROCESSING", "DELIVERED", "FAILED", "CANCELLED"] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface QuoteDraft { leadId: string; customerId: string; serviceId: string; currency: string; subtotal: number; discount: number; expiresAt?: string; answerIds?: string[]; }
export interface BookingDraft { leadId: string; customerId: string; serviceId: string; quoteId?: string; scheduledStartAt: string; scheduledEndAt: string; address: string; locationNote?: string; currency: string; total: number; }
export interface PaymentIntentDraft { bookingId: string; provider: string; currency: string; amount: number; idempotencyKey: string; }
export interface AvailabilityRule { staffId?: string; weekday: number; startsAt: string; endsAt: string; timezone: string; isActive: boolean; }
export interface AvailabilityBlackout { staffId?: string; startsAt: string; endsAt: string; reason: string; }
export interface ConversationMessage { conversationId: string; direction: MessageDirection; body: string; externalMessageId?: string; sentByStaffId?: string; }
export interface OutboxEvent { eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, JsonValue>; idempotencyKey: string; }
