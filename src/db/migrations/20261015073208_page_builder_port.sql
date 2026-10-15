CREATE TYPE "public"."content_kind" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."editor_type" AS ENUM('richtext', 'builder');--> statement-breakpoint
CREATE TYPE "public"."menu_location" AS ENUM('header', 'footer', 'sidebar');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'review', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."preview_token_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."revision_kind" AS ENUM('manual', 'autosave', 'published');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."dataset" AS ENUM('pages');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"hashed_key" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_hashed_key_unique" UNIQUE("hashed_key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" text,
	"target_name" varchar(255),
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"description" text,
	"parent_id" text,
	"language" text DEFAULT 'en',
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "global_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(50) DEFAULT 'General' NOT NULL,
	"content" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"title" varchar(255),
	"alt" text,
	"mime" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"folder" varchar(100) DEFAULT 'uploads' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"parent_id" text,
	"label" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"target" varchar(10) DEFAULT '_self' NOT NULL,
	"badge" varchar(30),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(100) NOT NULL,
	"location" "menu_location" DEFAULT 'header' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_categories" (
	"page_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "page_categories_page_id_category_id_pk" PRIMARY KEY("page_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "page_contents" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"kind" "content_kind" DEFAULT 'draft' NOT NULL,
	"content" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"editor_type" "editor_type" NOT NULL,
	"kind" "revision_kind" NOT NULL,
	"title" varchar(255) NOT NULL,
	"label" varchar(255),
	"content" jsonb,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_tags" (
	"page_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "page_tags_page_id_tag_id_pk" PRIMARY KEY("page_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "page_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'Landing' NOT NULL,
	"editor_type" "editor_type" DEFAULT 'builder' NOT NULL,
	"content" jsonb NOT NULL,
	"thumbnail_url" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"editor_type" "editor_type" DEFAULT 'richtext' NOT NULL,
	"is_home" boolean DEFAULT false NOT NULL,
	"is_blog_index" boolean DEFAULT false,
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
CREATE TABLE "preview_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"token" text NOT NULL,
	"status" "preview_token_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "preview_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "seo_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
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
	CONSTRAINT "seo_meta_page_id_unique" UNIQUE("page_id")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"site_name" varchar(100) DEFAULT 'Next CMS' NOT NULL,
	"site_description" text,
	"site_url" varchar(255),
	"logo" text,
	"favicon" text,
	"default_og_image" text,
	"header_menu_id" text,
	"footer_menu_id" text,
	"theme_tokens" jsonb DEFAULT '{"primaryColor":"#4f46e5","accentColor":"#0ea5e9","fontFamily":"Inter","borderRadius":"md","colorMode":"light"}'::jsonb NOT NULL,
	"robots_txt" text,
	"google_analytics_id" varchar(50),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"color" varchar(20) DEFAULT '#6366f1' NOT NULL,
	"language" text DEFAULT 'en',
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personalization" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pathname" varchar(256) NOT NULL,
	"query" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personalized_section" (
	"id" text PRIMARY KEY NOT NULL,
	"personalization_id" text NOT NULL,
	"dataset" "dataset" NOT NULL,
	"visibility" json,
	"limit" integer DEFAULT 10,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "allowed" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "global_blocks" ADD CONSTRAINT "global_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_categories" ADD CONSTRAINT "page_categories_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_categories" ADD CONSTRAINT "page_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_contents" ADD CONSTRAINT "page_contents_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_tags" ADD CONSTRAINT "page_tags_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_tags" ADD CONSTRAINT "page_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_header_menu_id_menus_id_fk" FOREIGN KEY ("header_menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_footer_menu_id_menus_id_fk" FOREIGN KEY ("footer_menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personalized_section" ADD CONSTRAINT "personalized_section_personalization_id_personalization_id_fk" FOREIGN KEY ("personalization_id") REFERENCES "public"."personalization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_index" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_folder_index" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "menu_items_menu_index" ON "menu_items" USING btree ("menu_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "page_contents_page_kind_unique" ON "page_contents" USING btree ("page_id","kind");--> statement-breakpoint
CREATE INDEX "page_revisions_page_index" ON "page_revisions" USING btree ("page_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_language_unique" ON "pages" USING btree ("slug","language") WHERE "pages"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "pages_status_index" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pages_translation_group_index" ON "pages" USING btree ("translation_group_id");--> statement-breakpoint
CREATE INDEX "pages_deleted_at_index" ON "pages" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_role_resource_action_unique" ON "permissions" USING btree ("role_id","resource","action");