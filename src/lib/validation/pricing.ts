import { z } from "zod";

const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100);
const money = z.number().finite().nonnegative().multipleOf(0.01);

/** The space counts that describe a property: "3 bedrooms, 2 bathrooms and a gazebo". */
export const spaceSelectionSchema = z.object({ slug, count: z.number().int().min(0).max(100) });

export const quoteRequestSchema = z.object({
  serviceSlug: slug,
  propertyTypeSlug: slug,
  areaSlug: slug,
  spaces: z.array(spaceSelectionSchema).max(40).default([])
    .refine((spaces) => new Set(spaces.map((space) => space.slug)).size === spaces.length, { message: "Each space may only appear once." }),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type SpaceSelection = z.infer<typeof spaceSelectionSchema>;

export const QUOTE_ITEM_KINDS = ["BASE", "SPACE", "AREA_SURCHARGE", "PROPERTY_MULTIPLIER", "MINIMUM_ADJUSTMENT", "MANUAL_ADJUSTMENT"] as const;

export const quoteItemSchema = z.object({
  kind: z.enum(QUOTE_ITEM_KINDS),
  label: z.string().trim().min(1).max(240),
  spaceTypeSlug: slug.nullable(),
  quantity: z.number().finite(),
  unitAmount: z.number().finite(),
  amount: z.number().finite(),
  sortOrder: z.number().int().min(0),
});

/** Mirrors the jsonb returned by public.calculate_quote; the database owns these numbers. */
export const quoteResultSchema = z.object({
  serviceId: z.uuid(),
  serviceName: z.string().trim().min(1).max(240),
  propertyTypeId: z.uuid(),
  serviceAreaId: z.uuid(),
  durationMinutes: z.number().int().positive(),
  currency: z.string().length(3),
  requiresReview: z.boolean(),
  reviewReasons: z.array(z.string().trim().max(500)).max(20),
  subtotal: money.nullable(),
  total: money.nullable(),
  depositAmount: money.nullable(),
  items: z.array(quoteItemSchema).max(60),
});

export type QuoteResult = z.infer<typeof quoteResultSchema>;
export type QuoteItem = z.infer<typeof quoteItemSchema>;

export const propertyTypeOptionSchema = z.object({ slug, name: z.string(), description: z.string().nullable(), requiresReview: z.boolean() });
export const spaceTypeOptionSchema = z.object({ slug, name: z.string(), description: z.string().nullable(), maxCount: z.number().int().positive(), requiresReview: z.boolean(), unitPrice: money.nullable(), includedCount: z.number().int().min(0) });
export const serviceAreaOptionSchema = z.object({ slug, name: z.string(), requiresReview: z.boolean() });

/** Everything the quote form needs to render one service's property step. */
export const pricingCatalogSchema = z.object({
  propertyTypes: z.array(propertyTypeOptionSchema),
  spaceTypes: z.array(spaceTypeOptionSchema),
  serviceAreas: z.array(serviceAreaOptionSchema),
});

export type PropertyTypeOption = z.infer<typeof propertyTypeOptionSchema>;
export type SpaceTypeOption = z.infer<typeof spaceTypeOptionSchema>;
export type ServiceAreaOption = z.infer<typeof serviceAreaOptionSchema>;
export type PricingCatalog = z.infer<typeof pricingCatalogSchema>;
