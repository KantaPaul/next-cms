CREATE TYPE "public"."collection_entry_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."collection_field_type" AS ENUM('text', 'richtext', 'number', 'boolean', 'date', 'select', 'media', 'relation');--> statement-breakpoint
CREATE TYPE "public"."collection_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_event" AS ENUM('content.published', 'content.unpublished', 'form.submitted', 'entry.changed');--> statement-breakpoint
CREATE TABLE "collection_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"collection_id" text NOT NULL,
	"slug" varchar(200) NOT NULL,
	"status" "collection_entry_status" DEFAULT 'draft' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collection_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"key" varchar(100) NOT NULL,
	"label" varchar(150) NOT NULL,
	"type" "collection_field_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"template_page_id" text,
	"status" "collection_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_rate_windows" (
	"api_key_id" text NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"event" "webhook_event" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"response_status" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"url" varchar(500) NOT NULL,
	"secret" text NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "scopes" text[] DEFAULT '{"content:read"}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_fields" ADD CONSTRAINT "collection_fields_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_template_page_id_pages_id_fk" FOREIGN KEY ("template_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "api_rate_windows" ADD CONSTRAINT "api_rate_windows_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_entries_collection_slug_unique" ON "collection_entries" USING btree ("collection_id","slug") WHERE "collection_entries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collection_entries_site_id_index" ON "collection_entries" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "collection_entries_collection_id_index" ON "collection_entries" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_entries_status_index" ON "collection_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "collection_entries_deleted_at_index" ON "collection_entries" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_fields_collection_key_unique" ON "collection_fields" USING btree ("collection_id","key");--> statement-breakpoint
CREATE INDEX "collection_fields_collection_id_index" ON "collection_fields" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_site_slug_unique" ON "collections" USING btree ("site_id","slug") WHERE "collections"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collections_site_id_index" ON "collections" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "collections_template_page_id_index" ON "collections" USING btree ("template_page_id");--> statement-breakpoint
CREATE INDEX "api_rate_windows_api_key_id_index" ON "api_rate_windows" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_rate_windows_window_start_index" ON "api_rate_windows" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_subscription_id_index" ON "webhook_deliveries" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_index" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_created_at_index" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_site_id_index" ON "webhook_subscriptions" USING btree ("site_id");