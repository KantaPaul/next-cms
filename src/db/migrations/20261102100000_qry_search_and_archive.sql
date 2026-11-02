-- Additive migration for site search, collections/video indexing, search analytics, and search/archive templates (R586–R596 / QRY-16–QRY-26)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

ALTER TABLE "search_documents"
  ALTER COLUMN "kind" TYPE varchar(20),
  ADD COLUMN IF NOT EXISTS "collection_entry_id" text REFERENCES "collection_entries"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "video_id" text REFERENCES "videos"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "thumbnail_url" text;

CREATE UNIQUE INDEX IF NOT EXISTS "search_documents_collection_entry_unique" ON "search_documents" ("collection_entry_id");
CREATE UNIQUE INDEX IF NOT EXISTS "search_documents_video_unique" ON "search_documents" ("video_id");
CREATE INDEX IF NOT EXISTS "search_documents_title_trgm_idx" ON "search_documents" USING gin ("title" gin_trgm_ops);

ALTER TABLE "search_documents" DROP CONSTRAINT IF EXISTS "search_documents_kind_check";
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_kind_check" CHECK ("kind" IN ('page', 'post', 'collection', 'video'));

ALTER TABLE "search_documents" DROP CONSTRAINT IF EXISTS "search_documents_target_check";
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_target_check" CHECK (num_nonnulls("page_id", "post_id", "collection_entry_id", "video_id") = 1);

CREATE TABLE IF NOT EXISTS "search_queries" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text NOT NULL DEFAULT 'default',
  "query" varchar(200) NOT NULL,
  "language" varchar(12) NOT NULL DEFAULT 'en',
  "result_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "search_queries_site_created_index" ON "search_queries" ("site_id", "created_at");
CREATE INDEX IF NOT EXISTS "search_queries_site_results_index" ON "search_queries" ("site_id", "result_count");

ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "search_template_id" text,
  ADD COLUMN IF NOT EXISTS "archive_template_id" text,
  ADD COLUMN IF NOT EXISTS "search_settings" jsonb DEFAULT '{"synonyms":{},"pinnedResults":[]}'::jsonb NOT NULL;
