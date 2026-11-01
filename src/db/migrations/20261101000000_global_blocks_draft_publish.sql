ALTER TABLE "global_blocks" ADD COLUMN IF NOT EXISTS "published_content" jsonb;
ALTER TABLE "global_blocks" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
UPDATE "global_blocks" SET "published_content" = "content", "published_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "published_content" IS NULL;
