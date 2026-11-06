CREATE TABLE "collection_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"collection_id" text NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"content" jsonb,
	"draft_content" jsonb,
	"published_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "supports" SET DEFAULT '{"template":true,"taxonomies":true,"excerpt":true,"author":true,"status":true,"seo":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "collection_blocks" ADD CONSTRAINT "collection_blocks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_blocks" ADD CONSTRAINT "collection_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_blocks_collection_id_index" ON "collection_blocks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_blocks_site_id_index" ON "collection_blocks" USING btree ("site_id");