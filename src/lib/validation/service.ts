import { z } from "zod";
import { SERVICE_PRICING_MODELS, SERVICE_QUESTION_TYPES } from "@/types/domain";
export const serviceSchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(1000).nullable().optional(), pricingModel: z.enum(SERVICE_PRICING_MODELS), isActive: z.boolean().default(true), sortOrder: z.number().int().nonnegative().default(0) });
export const serviceQuestionSchema = z.object({ label: z.string().trim().min(2).max(240), fieldType: z.enum(SERVICE_QUESTION_TYPES), required: z.boolean().default(false), options: z.array(z.string().trim().min(1)).max(30).default([]), sortOrder: z.number().int().nonnegative() });
