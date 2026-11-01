import { z } from 'zod';
import { BLOCK_ICONS } from '../icons';
import { safeUrlSchema } from './style.schema';

export const text = (max = 400) => z.string().max(max);
export const optText = (max = 400) => z.string().max(max).optional();

export const richText = (max = 50000) => z.string().max(max);

export const mediaUrl = safeUrlSchema.optional();

export const iconName = z
  .string()
  .optional()
  .transform(v => (v && v in BLOCK_ICONS ? v : 'Sparkles'));

export function list<T extends z.ZodTypeAny>(itemSchema: T, max = 50) {
  return z.array(itemSchema).max(max);
}
