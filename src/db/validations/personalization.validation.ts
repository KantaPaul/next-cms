import { createInsertSchema } from "drizzle-zod";
import { personalizations, personalizedSections } from "@/db/schema";
import { z } from 'zod';
import { skipBaseColumns } from "@/db/helpers/base.columns";


export const createPersonalizationSchema = createInsertSchema(personalizations, {
  query: z.record(z.string(), z.string()),
}).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type CreatePersonalizationInput = z.infer<typeof createPersonalizationSchema>;
export type Personalization = typeof personalizations.$inferSelect;

export const createPersonalizedSectionSchema = createInsertSchema(personalizedSections, {
  personalizationId: z.string().optional(),
  visibility: z.record(z.string(), z.boolean()),
})
  .omit(skipBaseColumns)
  .extend({
    pathname: z.string(),
  });
export const updatePersonalizedSectionSchema = createPersonalizedSectionSchema
  .partial()
  .omit({ pathname: true })
  .required({ id: true });
export type CreatePersonalizedSectionInput = z.infer<typeof createPersonalizedSectionSchema>;
export type UpdatePersonalizedSectionInput = z.infer<typeof updatePersonalizedSectionSchema>;
export type PersonalizedSection = typeof personalizedSections.$inferSelect;
