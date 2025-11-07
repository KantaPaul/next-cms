import {
  date,
  doublePrecision,
  integer,
  text,
  time,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const baseColumns = {
  id: text()
    .$default(() => createId())
    .primaryKey()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
} as const;

export const relationConfig = {
  cascade: { onDelete: 'cascade', onUpdate: 'cascade' },
  setNull: { onDelete: 'set null', onUpdate: 'cascade' },
  setDefault: { onDelete: 'set default', onUpdate: 'cascade' },
  restrict: { onDelete: 'restrict', onUpdate: 'cascade' },
  noAction: { onDelete: 'no action', onUpdate: 'cascade' },
} as const;

export const skipBaseColumns = {
  createdAt: true,
  updatedAt: true,
} as const;