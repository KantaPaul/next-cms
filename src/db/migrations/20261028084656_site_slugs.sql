ALTER TABLE "sites" ADD COLUMN "slug" varchar(40);--> statement-breakpoint
-- Backfill existing sites from their name; the default site gets the slug "main".
UPDATE "sites"
SET "slug" = CASE
  WHEN "id" = 'default' THEN 'main'
  ELSE lower(regexp_replace("name", '[^a-z0-9]+', '-', 'g'))
END
WHERE "slug" IS NULL;--> statement-breakpoint
-- Trim any leading/trailing hyphens and clamp to 40 chars produced by backfill.
UPDATE "sites"
SET "slug" = CASE
  WHEN "slug" IS NULL THEN NULL
  ELSE left(regexp_replace("slug", '^-+|-+$', '', 'g'), 40)
END
WHERE "slug" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sites_slug_unique" ON "sites" USING btree ("slug") WHERE "sites"."slug" is not null;--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "slug" SET NOT NULL;
