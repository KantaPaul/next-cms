import { z } from 'zod';

export const createHeaderFooterSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category: z.enum(['Header', 'Footer', 'Search', 'Archive', 'MegaMenu']),
  starter: z.string().optional(),
});

export const duplicateHeaderFooterSchema = z.object({
  id: z.string().min(1),
});

export const renameHeaderFooterSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(150),
});

export const deleteHeaderFooterSchema = z.object({
  id: z.string().min(1),
});

export const getDisplayRulesSchema = z.object({
  templateId: z.string().min(1),
});

export const saveDisplayRulesSchema = z.object({
  templateId: z.string().min(1),
  area: z.enum(['header', 'footer', 'search', 'archive']),
  rules: z.array(
    z.object({
      kind: z.enum([
        'post-type',
        'category',
        'tag',
        'user-state',
        'role',
        'archive-type',
        'search-kind',
      ]),
      value: z.string().min(1),
      priority: z.number().default(0),
    })
  ),
});
