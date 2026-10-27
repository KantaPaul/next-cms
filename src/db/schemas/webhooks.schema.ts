import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns, relationConfig } from '@/db/helpers/base.columns';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';

const { id, ...timestampColumns } = baseColumns;

export const webhookEventEnum = pgEnum('webhook_event', [
  'content.published',
  'content.unpublished',
  'form.submitted',
  'entry.changed',
]);
export type WebhookEvent = (typeof webhookEventEnum.enumValues)[number];

export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'delivered',
  'failed',
]);
export type WebhookDeliveryStatus = (typeof webhookDeliveryStatusEnum.enumValues)[number];

/** Outbound webhook subscription, one per site. */
export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id,
    siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
    url: varchar('url', { length: 500 }).notNull(),
    /** Signing key, shown once at creation. */
    secret: text('secret').notNull(),
    events: text('events')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    ...timestampColumns,
  },
  t => [
    index('webhook_subscriptions_site_id_index').on(t.siteId),
  ]
);

/** Delivery log for webhook attempts. */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id,
    subscriptionId: text('subscription_id')
      .references(() => webhookSubscriptions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      })
      .notNull(),
    event: webhookEventEnum('event').notNull(),
    payload: jsonb('payload').notNull().default({}),
    status: webhookDeliveryStatusEnum('status').default('pending').notNull(),
    responseStatus: integer('response_status'),
    error: text('error'),
    createdAt: baseColumns.createdAt,
  },
  t => [
    index('webhook_deliveries_subscription_id_index').on(t.subscriptionId),
    index('webhook_deliveries_status_index').on(t.status),
    index('webhook_deliveries_created_at_index').on(t.createdAt),
  ]
);

export const webhookSubscriptionsRelations = relations(
  webhookSubscriptions,
  ({ many }) => ({
    deliveries: many(webhookDeliveries),
  })
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    subscription: one(webhookSubscriptions, {
      fields: [webhookDeliveries.subscriptionId],
      references: [webhookSubscriptions.id],
    }),
  })
);
