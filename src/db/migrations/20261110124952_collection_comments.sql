ALTER TABLE "collections" ALTER COLUMN "supports" SET DEFAULT '{"template":true,"taxonomies":true,"excerpt":true,"author":true,"status":true,"seo":true,"comments":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "post_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "allow_comments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "collection_entry_id" text;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_collection_entry_id_collection_entries_id_fk" FOREIGN KEY ("collection_entry_id") REFERENCES "public"."collection_entries"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "comments_collection_entry_status_created_index" ON "comments" USING btree ("collection_entry_id","status","created_at");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_target_check" CHECK (num_nonnulls("comments"."post_id", "comments"."collection_entry_id") = 1);