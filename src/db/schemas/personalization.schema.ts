import { relations } from 'drizzle-orm';
import { json, pgEnum, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import type { ValueOf } from 'type-fest';
import { z } from 'zod';
import { foreignId } from '@/db/db-utils';
import { baseColumns } from '@/db/helpers/base.columns';

// userId: integer("user_id").references(() => users.id)),
const { id, ...otherColumns } = baseColumns;
export const personalizations = pgTable('personalization', {
  id,
  userId: text('user_id').notNull(),
  pathname: varchar({ length: 256 }).notNull(),
  query: json().$type<Record<string, string>>(),
  ...otherColumns,
});

export const datasetEnum = pgEnum('dataset', ['pages']);

export const personalizationDataset = z.enum(datasetEnum.enumValues).enum;
export type PersonalizationDataset = ValueOf<typeof personalizationDataset>;

export const personalizedSections = pgTable('personalized_section', t => ({
  id,
  personalizationId: foreignId(
    'personalization_id',
    () => personalizations.id
  ).notNull(),
  dataset: datasetEnum('dataset').notNull(),
  visibility: t.json().$type<Record<string, boolean>>(),
  limit: t.integer().default(10),
  ...otherColumns,
}));

export const personalizationsRelations = relations(personalizations, r => ({
  sections: r.many(personalizedSections),
}));
export const personalizedSectionsRelations = relations(
  personalizedSections,
  r => ({
    personalization: r.one(personalizations, {
      fields: [personalizedSections.personalizationId],
      references: [personalizations.id],
    }),
  })
);
