DROP INDEX "collection_entries_collection_slug_unique";--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "translation_group_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_entries_collection_slug_language_unique" ON "collection_entries" USING btree ("collection_id","slug","language") WHERE "collection_entries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collection_entries_translation_group_index" ON "collection_entries" USING btree ("translation_group_id");--> statement-breakpoint
CREATE INDEX "collection_entries_language_index" ON "collection_entries" USING btree ("language");--> statement-breakpoint
-- Existing entries belong to their site's default language.
UPDATE "collection_entries" AS e SET "language" = s."default_locale"
FROM "sites" AS s
WHERE s."id" = e."site_id" AND s."default_locale" IS NOT NULL AND s."default_locale" <> '';
