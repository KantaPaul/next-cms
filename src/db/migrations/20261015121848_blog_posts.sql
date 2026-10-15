CREATE TYPE "public"."post_layout" AS ENUM('template', 'custom');--> statement-breakpoint
CREATE TABLE "post_categories" (
	"post_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "post_contents" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"kind" "content_kind" DEFAULT 'draft' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"canvas" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"kind" "revision_kind" NOT NULL,
	"title" varchar(255) NOT NULL,
	"label" varchar(255),
	"layout" "post_layout" NOT NULL,
	"body" text,
	"canvas" jsonb,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_seo" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"title" varchar(255),
	"description" text,
	"keywords" text,
	"canonical_url" varchar(500),
	"og_title" varchar(255),
	"og_description" text,
	"og_image" varchar(500),
	"og_type" varchar(50),
	"twitter_card" varchar(50),
	"no_index" boolean DEFAULT false NOT NULL,
	"structured_data_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "post_seo_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"featured_image" text,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"layout" "post_layout" DEFAULT 'template' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"translation_group_id" text,
	"published_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
UPDATE "pages" SET "is_blog_index" = false WHERE "is_blog_index" IS NULL;--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "is_blog_index" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "preview_tokens" ALTER COLUMN "page_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD COLUMN "post_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "single_post_template" jsonb;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "single_post_template_draft" jsonb;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_contents" ADD CONSTRAINT "post_contents_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_seo" ADD CONSTRAINT "post_seo_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "post_categories_category_index" ON "post_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_contents_post_kind_unique" ON "post_contents" USING btree ("post_id","kind");--> statement-breakpoint
CREATE INDEX "post_revisions_post_index" ON "post_revisions" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_tags_tag_index" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_language_unique" ON "posts" USING btree ("slug","language") WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_status_published_index" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "posts_deleted_at_index" ON "posts" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_target_check" CHECK (num_nonnulls("preview_tokens"."page_id", "preview_tokens"."post_id") = 1);