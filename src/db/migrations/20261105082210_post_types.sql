-- Post types: extend collections with singular label, icon and description,
-- add a URL field type, and grant the new post_types.manage permission.
ALTER TYPE "public"."collection_field_type" ADD VALUE IF NOT EXISTS 'url';--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "singular_name" varchar(150);--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "icon" varchar(50);--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
INSERT INTO "permissions" ("id", "role_id", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, "id", 'post_types', 'manage', true
FROM "roles"
WHERE "name" IN ('Admin', 'Editor')
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
