import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns } from '@/db/helpers/base.columns';
import { users } from '@/db/schemas/auth.schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import type { ConsentCategory } from '@/lib/site-essentials-types';

const { id, ...timestampColumns } = baseColumns;

/** Proof-of-consent record (no IP address stored). */
export const consentLogs = pgTable(
  'consent_logs',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    visitorHash: varchar('visitor_hash', { length: 64 }).notNull(),
    categories: jsonb('categories')
      .$type<Record<ConsentCategory, boolean>>()
      .notNull(),
    version: integer('version').notNull(),
    mode: varchar('mode', { length: 20 }).notNull().default('opt-in'),
    createdAt: baseColumns.createdAt,
  },
  t => [
    index('consent_logs_site_created_index').on(t.siteId, t.createdAt),
    index('consent_logs_site_visitor_index').on(t.siteId, t.visitorHash),
  ]
);

export const PRIVACY_REQUEST_TYPES = ['export', 'erase'] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'completed',
  'rejected',
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

/** Visitor GDPR data export / erasure requests (inserted once confirmed). */
export const privacyRequests = pgTable(
  'privacy_requests',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    email: varchar('email', { length: 200 }).notNull(),
    type: varchar('type', { length: 20 })
      .$type<PrivacyRequestType>()
      .notNull(),
    status: varchar('status', { length: 30 })
      .$type<PrivacyRequestStatus>()
      .notNull()
      .default('confirmed'),
    tokenHash: text('token_hash').unique(),
    /** Captured from `cms_vid` cookie when submitted from the visitor's own browser. */
    visitorId: text('visitor_id'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: text('completed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    exportKey: text('export_key'),
    exportTokenHash: text('export_token_hash'),
    exportExpiresAt: timestamp('export_expires_at', { withTimezone: true }),
    notes: text('notes'),
    ...timestampColumns,
  },
  t => [
    index('privacy_requests_site_status_index').on(
      t.siteId,
      t.status,
      t.createdAt
    ),
    index('privacy_requests_site_email_index').on(t.siteId, t.email),
    check(
      'privacy_requests_type_check',
      sql`${t.type} in ('export', 'erase')`
    ),
    check(
      'privacy_requests_status_check',
      sql`${t.status} in ('pending_confirmation', 'confirmed', 'completed', 'rejected')`
    ),
  ]
);

export const BACKUP_KINDS = ['manual', 'scheduled', 'pre-restore'] as const;
export type BackupKind = (typeof BACKUP_KINDS)[number];

export const BACKUP_STATUSES = ['pending', 'running', 'ready', 'failed'] as const;
export type BackupStatus = (typeof BACKUP_STATUSES)[number];

export type BackupManifest = {
  formatVersion: 1;
  appVersion: string;
  migrationTag: string;
  migrationIdx: number;
  createdAt: string;
  siteId: string;
  siteName: string;
  includeMedia: boolean;
  excludedSecrets: string[];
  counts: Record<string, number>;
  checksums: Record<string, string>;
};

export type BackupProgress = {
  phase: 'tables' | 'files' | 'packaging' | 'done';
  tableIndex: number;
  totalTables: number;
  fileIndex: number;
  totalFiles: number;
  processedRows: number;
  currentItem?: string;
};

/** Site-scoped full backups stored in private object storage (`backups/<id>.zip`). */
export const backups = pgTable(
  'backups',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    kind: varchar('kind', { length: 20 })
      .$type<BackupKind>()
      .notNull()
      .default('manual'),
    status: varchar('status', { length: 20 })
      .$type<BackupStatus>()
      .notNull()
      .default('pending'),
    size: bigint('size', { mode: 'number' }).notNull().default(0),
    includeMedia: boolean('include_media').notNull().default(true),
    storageKey: text('storage_key'),
    manifest: jsonb('manifest').$type<BackupManifest | null>(),
    progress: jsonb('progress').$type<BackupProgress | null>(),
    createdBy: text('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    error: text('error'),
    ...timestampColumns,
  },
  t => [
    index('backups_site_created_index').on(t.siteId, t.createdAt),
    index('backups_site_kind_status_index').on(t.siteId, t.kind, t.status),
    check(
      'backups_kind_check',
      sql`${t.kind} in ('manual', 'scheduled', 'pre-restore')`
    ),
    check(
      'backups_status_check',
      sql`${t.status} in ('pending', 'running', 'ready', 'failed')`
    ),
  ]
);
