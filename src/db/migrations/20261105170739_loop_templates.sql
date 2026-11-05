CREATE TYPE "public"."loop_template_source" AS ENUM('posts', 'collection');--> statement-breakpoint
CREATE TABLE "loop_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(150) NOT NULL,
	"source_type" "loop_template_source" DEFAULT 'posts' NOT NULL,
	"collection_id" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_content" jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "loop_templates" ADD CONSTRAINT "loop_templates_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "loop_templates_site_id_index" ON "loop_templates" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "loop_templates_collection_id_index" ON "loop_templates" USING btree ("collection_id");