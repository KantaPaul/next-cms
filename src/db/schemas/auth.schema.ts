import { relations } from 'drizzle-orm';
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { UserStatus, userStatusEnum } from '@/db/schemas/shared.schema';

const { id, ...timestampColumns } = baseColumns;

/** Public social profiles on a user's author card (full https URLs). */
export type AuthorSocialLinks = {
  x?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
};
const { cascade, setNull } = relationConfig;

export const users = pgTable(
  'users',
  {
    id,
    name: text('name'),
    email: text('email').unique().notNull(),
    googleId: text('google_id').unique(),
    passwordHash: text('password_hash'),
    totpSecret: text('totp_secret'),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    uiLocale: varchar('ui_locale', { length: 16 }),
    /** Short public bio shown by the Author Bio block on posts. */
    bio: text('bio'),
    /** Public author profile: shown by the Author card block. */
    jobTitle: varchar('job_title', { length: 120 }),
    website: text('website'),
    socialLinks: jsonb('social_links').$type<AuthorSocialLinks>(),
    status: userStatusEnum('user_status')
      .notNull()
      .default(UserStatus.Inactive),
    roleId: text('role_id').references(() => roles.id, setNull),
    approvedAt: timestamp('approved_at'),
    failedLoginCount: integer('failed_login_count').default(0).notNull(),
    lockedUntil: timestamp('locked_until'),
    ...timestampColumns,
  },
  t => [
    index('users_status_index').on(t.status),
    index('users_email_index').on(t.email),
    index('users_name_index').on(t.name),
    index('users_created_at_index').on(t.createdAt),
    index('users_deleted_at_index').on(t.deletedAt),
  ]
);

export const roles = pgTable('roles', {
  id,
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: varchar('description', { length: 255 }),
  ...timestampColumns,
});

export const permissions = pgTable(
  'permissions',
  {
    id,
    roleId: text('role_id')
      .references(() => roles.id, cascade)
      .notNull(),
    resource: varchar('resource', { length: 100 }).notNull(), // e.g. "pages", "media", "settings"
    action: varchar('action', { length: 50 }).notNull(), // e.g. "create" | "edit" | "publish"
    allowed: boolean('allowed').default(true).notNull(),
    ...timestampColumns,
  },
  t => [
    uniqueIndex('permissions_role_resource_action_unique').on(
      t.roleId,
      t.resource,
      t.action
    ),
  ]
);

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(permissions),
  users: many(users),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  role: one(roles, { fields: [permissions.roleId], references: [roles.id] }),
}));

export const sessions = pgTable(
  'session',
  {
    id,
    userId: text('user_id')
      .references(() => users.id, cascade)
      .notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),
    userIp: text('user_ip'),
    userAgent: text('user_agent'),
    ...timestampColumns,
  },
  table => [
    index('idx_session_expires_at').on(table.expiresAt),
    index('idx_session_user_id').on(table.userId),
  ]
);

export const accounts = pgTable(
  'account',
  {
    userId: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text(),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    ...timestampColumns,
  },
  table => [
    primaryKey({
      columns: [table.provider, table.providerAccountId],
      name: 'account_provider_providerAccountId_pk',
    }),
  ]
);

export const userInsertSchema = createInsertSchema(users);
export type User = z.infer<typeof userInsertSchema>;

export const userUpdateSchema = userInsertSchema.partial().omit({
  id: true,
  createdAt: true,
  deletedAt: true,
  updatedAt: true,
});

export type UpdateUser = z.infer<typeof userUpdateSchema>;

export const authAttempts = pgTable('auth_attempts', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AuthAttempt = typeof authAttempts.$inferSelect;
