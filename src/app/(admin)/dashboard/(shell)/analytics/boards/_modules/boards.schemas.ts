import { z } from 'zod';
import {
  boardLayoutSchema,
  widgetQuerySchema,
} from '@/db/schemas/analytics.schema';

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
});

export const updateBoardSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  layout: boardLayoutSchema.optional(),
});

export const previewWidgetSchema = z.object({
  query: widgetQuerySchema,
  boardRange: z.union([z.literal(7), z.literal(30)]),
});
