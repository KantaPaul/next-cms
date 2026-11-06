ALTER TYPE "public"."collection_entry_status" ADD VALUE 'review' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "public"."collection_entry_status" ADD VALUE 'scheduled' BEFORE 'published';--> statement-breakpoint
CREATE TABLE "collection_entry_terms" (
	"entry_id" text NOT NULL,
	"term_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_entry_terms_entry_id_term_id_pk" PRIMARY KEY("entry_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "collection_taxonomies" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"collection_id" text NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"singular_name" varchar(150),
	"hierarchical" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collection_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"collection_id" text NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"content" jsonb,
	"draft_content" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collection_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"taxonomy_id" text NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"description" text,
	"parent_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "excerpt" text;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "featured_image" text;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "author_id" text;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "visibility" "visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "layout" "post_layout" DEFAULT 'template' NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "template_id" text;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "canvas" jsonb;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "draft_canvas" jsonb;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "seo" jsonb;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "supports" jsonb DEFAULT '{"template":true,"taxonomies":true,"featuredImage":true,"excerpt":true,"author":true,"status":true,"seo":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_entry_terms" ADD CONSTRAINT "collection_entry_terms_entry_id_collection_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."collection_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entry_terms" ADD CONSTRAINT "collection_entry_terms_term_id_collection_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."collection_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_taxonomies" ADD CONSTRAINT "collection_taxonomies_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_templates" ADD CONSTRAINT "collection_templates_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_templates" ADD CONSTRAINT "collection_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_terms" ADD CONSTRAINT "collection_terms_taxonomy_id_collection_taxonomies_id_fk" FOREIGN KEY ("taxonomy_id") REFERENCES "public"."collection_taxonomies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_terms" ADD CONSTRAINT "collection_terms_parent_id_collection_terms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collection_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_entry_terms_term_id_index" ON "collection_entry_terms" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "collection_entry_terms_entry_id_index" ON "collection_entry_terms" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_taxonomies_collection_key_unique" ON "collection_taxonomies" USING btree ("collection_id","key");--> statement-breakpoint
CREATE INDEX "collection_taxonomies_collection_id_index" ON "collection_taxonomies" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_taxonomies_site_id_index" ON "collection_taxonomies" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_templates_default_unique" ON "collection_templates" USING btree ("collection_id") WHERE "collection_templates"."is_default" = true;--> statement-breakpoint
CREATE INDEX "collection_templates_collection_id_index" ON "collection_templates" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_templates_site_id_index" ON "collection_templates" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_terms_taxonomy_slug_unique" ON "collection_terms" USING btree ("taxonomy_id","slug") WHERE "collection_terms"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collection_terms_taxonomy_id_index" ON "collection_terms" USING btree ("taxonomy_id");--> statement-breakpoint
CREATE INDEX "collection_terms_parent_id_index" ON "collection_terms" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "collection_terms_site_id_index" ON "collection_terms" USING btree ("site_id");--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_template_id_collection_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."collection_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_entries_template_id_index" ON "collection_entries" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "collection_entries_author_id_index" ON "collection_entries" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "collection_entries_scheduled_at_index" ON "collection_entries" USING btree ("scheduled_at");