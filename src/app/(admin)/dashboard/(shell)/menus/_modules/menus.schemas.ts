import { z } from 'zod';
import { MENU_LOCATION } from '@/db/schemas/shared.schema';

export const menuUrlSchema = z
  .string()
  .trim()
  .min(1, 'Link is required')
  .max(500)
  .refine(
    v => /^(\/|#|https?:\/\/|mailto:|tel:)/.test(v),
    'Links must start with /, #, http(s)://, mailto:, or tel:'
  );

export const menuItemSchema = z.object({
  label: z.string().trim().min(1, 'Every item needs a label').max(100),
  url: menuUrlSchema,
  target: z.enum(['_self', '_blank']),
  badge: z.string().trim().max(30).nullish(),
});

export const saveMenuSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Title is required').max(100),
  location: z.enum(MENU_LOCATION),
  language: z.string().trim().min(2).max(12),
});

export const copyMenuSchema = z.object({
  id: z.string().min(1),
  language: z.string().trim().min(2).max(12),
});

export const saveMenuItemsSchema = z.object({
  menuId: z.string().min(1),
  items: z
    .array(
      menuItemSchema.extend({
        megaMenuId: z.string().min(1).nullish(),
        megaMenuWidth: z.enum(['container', 'full', 'auto']).optional(),
        children: z.array(menuItemSchema).max(50).optional(),
      })
    )
    .max(50),
});
