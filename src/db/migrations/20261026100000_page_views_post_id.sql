-- Follow-up to 20261022070000_page_views.sql.
-- Do not journal this file. R123 journals the original create script unchanged.
-- Existing databases: run this after page_views exists, or apply the schema with `pnpm db:push`.
ALTER TABLE "page_views" ALTER COLUMN "page_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "post_id" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "page_views" ADD CONSTRAINT "page_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_post_created_at_index" ON "page_views" USING btree ("post_id","created_at");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "page_views" ADD CONSTRAINT "page_views_target_check" CHECK (num_nonnulls("page_id", "post_id") = 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
