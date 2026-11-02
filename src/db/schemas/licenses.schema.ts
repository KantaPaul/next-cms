import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { users } from '@/db/schemas/auth.schema';

const { id, ...timestampColumns } = baseColumns;
const { cascade, setNull } = relationConfig;

export const PRODUCT_ID_NEXT_CMS = 'next-cms';
export const LICENSE_KEY_PREFIX = 'ncms_lic_';

export const LICENSE_STATUS = [
  'pending',
  'active',
  'suspended',
  'expired',
  'revoked',
] as const;

export type LicenseStatus = (typeof LICENSE_STATUS)[number];

export const INSTALLATION_STATUS = [
  'active',
  'inactive',
  'revoked',
] as const;

export type InstallationStatus = (typeof INSTALLATION_STATUS)[number];

/* ---------- Policy Schema for site_settings ---------- */

export const licenseSettingsSchema = z.object({
  heartbeatIntervalSeconds: z.number().int().min(60).default(86400),
  gracePeriodSeconds: z.number().int().min(0).max(604800).default(259200), // Max 7 days
  defaultExpiryDays: z.number().int().min(1).default(365),
  reassignmentCooldownHours: z.number().int().min(0).default(24),
  maxReassignments: z.number().int().min(0).default(5),
  rateLimitMaxAttempts: z.number().int().min(1).default(10),
  rateLimitWindowMinutes: z.number().int().min(1).default(15),
  notifyOnConflict: z.boolean().default(true),
  notifyOnRevocation: z.boolean().default(true),
  notifyOnExpiryWindowDays: z.number().int().min(1).default(14),
  managedLicenseKey: z.string().trim().nullish(),
  authorityUrl: z.string().trim().nullish(),
  managedLicenseStatus: z
    .enum(['active', 'pending', 'expired', 'revoked', 'inactive'])
    .nullish(),
  managedLicenseActivatedAt: z.string().nullish(),
  managedLicenseExpiresAt: z.string().nullish(),
  managedInstallationPublicId: z.string().nullish(),
  managedLastCheckedAt: z.string().nullish(),
});

export type LicenseSettings = z.infer<typeof licenseSettingsSchema>;
export const DEFAULT_LICENSE_SETTINGS: LicenseSettings = licenseSettingsSchema.parse({});

/* ---------- licenses Table (R217 / L1-01) ---------- */

export const licenses = pgTable(
  'licenses',
  {
    id,
    publicId: text('public_id').notNull().unique(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: varchar('key_prefix', { length: 20 }).notNull().default(LICENSE_KEY_PREFIX),
    productId: varchar('product_id', { length: 50 }).notNull().default(PRODUCT_ID_NEXT_CMS),
    ownerUserId: text('owner_user_id').references(() => users.id, setNull),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    issuedAt: timestamp('issued_at', { mode: 'date' }).notNull().defaultNow(),
    activatedAt: timestamp('activated_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    maxInstallations: integer('max_installations').notNull().default(1),
    currentInstallationId: text('current_installation_id'),
    lastValidatedAt: timestamp('last_validated_at', { mode: 'date' }),
    lastValidationResult: text('last_validation_result'),
    reassignmentCount: integer('reassignment_count').notNull().default(0),
    ...timestampColumns,
  },
  t => [
    index('licenses_status_idx').on(t.status),
    index('licenses_owner_idx').on(t.ownerUserId),
    check('licenses_max_installations_check', sql`${t.maxInstallations} = 1`),
    check(
      'licenses_status_check',
      sql`${t.status} in ('pending', 'active', 'suspended', 'expired', 'revoked')`
    ),
  ]
);

export const licensesRelations = relations(licenses, ({ one, many }) => ({
  owner: one(users, {
    fields: [licenses.ownerUserId],
    references: [users.id],
  }),
  installations: many(licenseInstallations),
  events: many(licenseEvents),
}));

/* ---------- license_installations Table (R218 / L1-02) ---------- */

export const licenseInstallations = pgTable(
  'license_installations',
  {
    id,
    publicId: text('public_id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    licenseId: text('license_id')
      .notNull()
      .references(() => licenses.id, cascade),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    lastSeenAt: timestamp('last_seen_at', { mode: 'date' }).notNull().defaultNow(),
    ...timestampColumns,
  },
  t => [
    index('license_installations_license_id_idx').on(t.licenseId),
    index('license_installations_public_key_idx').on(t.publicKey),
    uniqueIndex('license_installations_active_unique_idx')
      .on(t.licenseId)
      .where(sql`${t.status} = 'active'`),
    check(
      'license_installations_status_check',
      sql`${t.status} in ('active', 'inactive', 'revoked')`
    ),
  ]
);

export const licenseInstallationsRelations = relations(licenseInstallations, ({ one }) => ({
  license: one(licenses, {
    fields: [licenseInstallations.licenseId],
    references: [licenses.id],
  }),
}));

/* ---------- license_events Table (R219 / L1-03) ---------- */

export const licenseEvents = pgTable(
  'license_events',
  {
    id,
    licenseId: text('license_id')
      .notNull()
      .references(() => licenses.id, cascade),
    installationPublicId: text('installation_public_id'),
    type: varchar('type', { length: 50 }).notNull(),
    outcome: varchar('outcome', { length: 20 }).notNull(),
    reason: text('reason'),
    actorId: text('actor_id'),
    ipAddress: varchar('ip_address', { length: 45 }),
    timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
  },
  t => [
    index('license_events_license_idx').on(t.licenseId, t.timestamp),
    check('license_events_outcome_check', sql`${t.outcome} in ('success', 'failure')`),
  ]
);

export const licenseEventsRelations = relations(licenseEvents, ({ one }) => ({
  license: one(licenses, {
    fields: [licenseEvents.licenseId],
    references: [licenses.id],
  }),
}));

/* ---------- license_nonces Table (R219 / L1-03) ---------- */

export const licenseNonces = pgTable(
  'license_nonces',
  {
    id,
    nonceHash: text('nonce_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  t => [
    index('license_nonces_expires_at_idx').on(t.expiresAt),
  ]
);

/* ---------- license_rate_limits Table (R232 / L3-05) ---------- */

export const licenseRateLimits = pgTable(
  'license_rate_limits',
  {
    id,
    identifier: varchar('identifier', { length: 100 }).notNull(),
    windowStart: timestamp('window_start', { mode: 'date' }).notNull(),
    count: integer('count').notNull().default(1),
    ...timestampColumns,
  },
  t => [
    index('license_rate_limits_ident_window_idx').on(t.identifier, t.windowStart),
  ]
);
