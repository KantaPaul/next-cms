CREATE TABLE "search_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"query" varchar(200) NOT NULL,
	"language" varchar(12) DEFAULT 'en' NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"template_id" text NOT NULL,
	"area" varchar(20) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"value" varchar(150) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "license_events" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"installation_public_id" text,
	"type" varchar(50) NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"reason" text,
	"actor_id" text,
	"ip_address" varchar(45),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "license_events_outcome_check" CHECK ("license_events"."outcome" in ('success', 'failure'))
);
--> statement-breakpoint
CREATE TABLE "license_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"public_key" text NOT NULL,
	"license_id" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "license_installations_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "license_installations_status_check" CHECK ("license_installations"."status" in ('active', 'inactive', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "license_nonces" (
	"id" text PRIMARY KEY NOT NULL,
	"nonce_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "license_nonces_nonce_hash_unique" UNIQUE("nonce_hash")
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" varchar(20) DEFAULT 'ncms_lic_' NOT NULL,
	"product_id" varchar(50) DEFAULT 'next-cms' NOT NULL,
	"owner_user_id" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"max_installations" integer DEFAULT 1 NOT NULL,
	"current_installation_id" text,
	"last_validated_at" timestamp,
	"last_validation_result" text,
	"reassignment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "licenses_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "licenses_key_hash_unique" UNIQUE("key_hash"),
	CONSTRAINT "licenses_max_installations_check" CHECK ("licenses"."max_installations" = 1),
	CONSTRAINT "licenses_status_check" CHECK ("licenses"."status" in ('pending', 'active', 'suspended', 'expired', 'revoked'))
);
--> statement-breakpoint
ALTER TABLE "search_documents" DROP CONSTRAINT "search_documents_kind_check";--> statement-breakpoint
ALTER TABLE "search_documents" DROP CONSTRAINT "search_documents_target_check";--> statement-breakpoint
ALTER TABLE "search_documents" ALTER COLUMN "kind" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "search_documents" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(body, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "theme_tokens" SET DEFAULT '{"primaryColor":"#4f46e5","accentColor":"#0ea5e9","fontFamily":"Inter","borderRadius":"md","colorMode":"light","colors":{"primary":"#4f46e5","secondary":"#64748b","text":"#0f172a","textMuted":"#64748b","accent":"#0ea5e9","background":"#ffffff","surface":"#f8fafc","border":"#e2e8f0","custom":[]},"typography":[{"id":"h1","name":"Heading 1","fontFamily":"Inter","fontSize":{"desktop":"2.5rem","tablet":"2rem","mobile":"1.75rem"},"fontWeight":"700","lineHeight":"1.2","letterSpacing":"-0.02em"},{"id":"h2","name":"Heading 2","fontFamily":"Inter","fontSize":{"desktop":"2rem","tablet":"1.75rem","mobile":"1.5rem"},"fontWeight":"600","lineHeight":"1.25","letterSpacing":"-0.01em"},{"id":"h3","name":"Heading 3","fontFamily":"Inter","fontSize":{"desktop":"1.5rem","tablet":"1.35rem","mobile":"1.25rem"},"fontWeight":"600","lineHeight":"1.3"},{"id":"body","name":"Body","fontFamily":"Inter","fontSize":"1rem","fontWeight":"400","lineHeight":"1.5"},{"id":"caption","name":"Caption","fontFamily":"Inter","fontSize":"0.875rem","fontWeight":"400","lineHeight":"1.4"},{"id":"button","name":"Button","fontFamily":"Inter","fontSize":"0.875rem","fontWeight":"500","lineHeight":"1"}]}'::jsonb;--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "collection_entry_id" text;--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "video_id" text;--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "global_blocks" ADD COLUMN "published_content" jsonb;--> statement-breakpoint
ALTER TABLE "global_blocks" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "header_template_id" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "footer_template_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "header_template_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "footer_template_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "header_template_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_template_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "search_template_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "archive_template_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "search_settings" jsonb DEFAULT '{"synonyms":{},"pinnedResults":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "license_settings" jsonb DEFAULT '{"heartbeatIntervalSeconds":86400,"gracePeriodSeconds":259200,"defaultExpiryDays":365,"reassignmentCooldownHours":24,"maxReassignments":5,"rateLimitMaxAttempts":10,"rateLimitWindowMinutes":15,"notifyOnConflict":true,"notifyOnRevocation":true,"notifyOnExpiryWindowDays":14}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "template_rules" ADD CONSTRAINT "template_rules_template_id_global_blocks_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."global_blocks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "license_events" ADD CONSTRAINT "license_events_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "license_installations" ADD CONSTRAINT "license_installations_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "search_queries_site_created_index" ON "search_queries" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "search_queries_site_results_index" ON "search_queries" USING btree ("site_id","result_count");--> statement-breakpoint
CREATE INDEX "template_rules_site_area_index" ON "template_rules" USING btree ("site_id","area");--> statement-breakpoint
CREATE INDEX "template_rules_template_id_index" ON "template_rules" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "license_events_license_idx" ON "license_events" USING btree ("license_id","timestamp");--> statement-breakpoint
CREATE INDEX "license_installations_license_id_idx" ON "license_installations" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "license_installations_public_key_idx" ON "license_installations" USING btree ("public_key");--> statement-breakpoint
CREATE UNIQUE INDEX "license_installations_active_unique_idx" ON "license_installations" USING btree ("license_id") WHERE "license_installations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "license_nonces_expires_at_idx" ON "license_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "licenses_status_idx" ON "licenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "licenses_owner_idx" ON "licenses" USING btree ("owner_user_id");--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_collection_entry_id_collection_entries_id_fk" FOREIGN KEY ("collection_entry_id") REFERENCES "public"."collection_entries"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_collection_entry_unique" ON "search_documents" USING btree ("collection_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_video_unique" ON "search_documents" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "page_categories_category_id_idx" ON "page_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "page_tags_tag_id_idx" ON "page_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "pages_site_lang_status_pub_idx" ON "pages" USING btree ("site_id","language","status","published_at");--> statement-breakpoint
CREATE INDEX "pages_created_by_idx" ON "pages" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "posts_site_lang_status_pub_idx" ON "posts" USING btree ("site_id","language","status","published_at");--> statement-breakpoint
CREATE INDEX "posts_created_by_idx" ON "posts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "videos_site_status_pub_idx" ON "videos" USING btree ("site_id","status","published_at");--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "render_engine";--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_kind_check" CHECK ("search_documents"."kind" in ('page', 'post', 'collection', 'video'));--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_target_check" CHECK (num_nonnulls("search_documents"."page_id", "search_documents"."post_id", "search_documents"."collection_entry_id", "search_documents"."video_id") = 1);