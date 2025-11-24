import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";
import { pages, pageContents } from '@/db/schema';
import { skipBaseColumns } from '@/db/helpers/base.columns';

export const createPageContentsSchema = createInsertSchema(pageContents).omit({
  ...skipBaseColumns,
  pageId: true,
});

export const createPagesSchema = createInsertSchema(pages)
  .omit({
    ...skipBaseColumns,
  })
  .extend({
    content: createPageContentsSchema.shape.content,
  });

export const updatePagesSchema = createPagesSchema
  .partial()
  .required({ id: true });

export type CreatePagesInput = z.infer<typeof createPagesSchema>;
export type UpdatePagesInput = z.infer<typeof updatePagesSchema>;
export type DeletePagesInput = z.infer<typeof updatePagesSchema>;
