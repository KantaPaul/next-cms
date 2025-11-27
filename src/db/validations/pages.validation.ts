import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";
import { pages, pageContents, pageCategories, pageTags, PAGE_STATUS, VISIBILITY_STATUS } from '@/db/schema';
import { skipBaseColumns } from '@/db/helpers/base.columns';
import { enumValidation, stringRequired } from "@/lib/utils/zod-helper";
import { MESSAGES } from "@/config/messages";

export const createPageContentsSchema = createInsertSchema(pageContents).omit({
  ...skipBaseColumns,
  pageId: true,
});

export const createPageCategoriesSchema = createInsertSchema(pageCategories).omit({
  id: true,
  pageId: true
});

export const createPageTagsSchema = createInsertSchema(pageTags).omit({
  id: true,
  pageId: true,
});

export const createPagesSchema = createInsertSchema(pages)
  .omit({
    ...skipBaseColumns,
    createdBy: true,
  })
  .extend({
    status: enumValidation(PAGE_STATUS, {
      name: MESSAGES.IS_REQUIRED('Status'),
    }),
    visibility: enumValidation(VISIBILITY_STATUS, {
      name: MESSAGES.IS_REQUIRED('visibility'),
    }),
    content: createPageContentsSchema.shape.content,
    // categories: createPageCategoriesSchema.shape.categoryId.array().nullable(),
    // tags: createPageTagsSchema.shape.tagId.array().nullable(),
  });

export const updatePagesSchema = createPagesSchema
  .partial()
  .required({ id: true });

export type CreatePagesInput = z.infer<typeof createPagesSchema>;
export type UpdatePagesInput = z.infer<typeof updatePagesSchema>;
export type DeletePagesInput = z.infer<typeof updatePagesSchema>;
