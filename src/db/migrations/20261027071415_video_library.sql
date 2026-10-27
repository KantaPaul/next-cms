CREATE TYPE "public"."collection_entry_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."collection_field_type" AS ENUM('text', 'richtext', 'number', 'boolean', 'date', 'select', 'media', 'relation');--> statement-breakpoint
CREATE TYPE "public"."collection_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."dataset" AS ENUM('pages');--> statement-breakpoint
CREATE TYPE "public"."content_kind" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."editor_type" AS ENUM('richtext', 'builder');--> statement-breakpoint
CREATE TYPE "public"."menu_location" AS ENUM('header', 'footer', 'sidebar');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'review', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."post_layout" AS ENUM('template', 'custom');--> statement-breakpoint
CREATE TYPE "public"."preview_token_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."revision_kind" AS ENUM('manual', 'autosave', 'published');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('Active', 'Inactive');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_event" AS ENUM('content.published', 'content.unpublished', 'form.submitted', 'entry.changed');--> statement-breakpoint
CREATE TABLE "analytics_dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_by" text,
	"layout" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"page_id" text NOT NULL,
	"variant_content" jsonb NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "page_experiments_page_id_unique" UNIQUE("page_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"resource" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"google_id" text,
	"password_hash" text,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"user_status" "user_status" DEFAULT 'Inactive' NOT NULL,
	"role_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "collection_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"collection_id" text NOT NULL,
	"slug" varchar(200) NOT NULL,
	"status" "collection_entry_status" DEFAULT 'draft' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collection_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"key" varchar(100) NOT NULL,
	"label" varchar(150) NOT NULL,
	"type" "collection_field_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"template_page_id" text,
	"status" "collection_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"form_global_id" text,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"spam" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "form_submissions_status_check" CHECK ("form_submissions"."status" in ('new', 'read', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"from_path" varchar(500) NOT NULL,
	"to_path" varchar(500) NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "redirects_status_code_check" CHECK ("redirects"."status_code" in (301, 302))
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"kind" varchar(10) NOT NULL,
	"page_id" text,
	"post_id" text,
	"title" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "search_documents_kind_check" CHECK ("search_documents"."kind" in ('page', 'post')),
	CONSTRAINT "search_documents_target_check" CHECK (num_nonnulls("search_documents"."page_id", "search_documents"."post_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(100) NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"hashed_key" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" text,
	"scopes" text[] DEFAULT '{"content:read"}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_hashed_key_unique" UNIQUE("hashed_key")
);
--> statement-breakpoint
CREATE TABLE "api_rate_windows" (
	"api_key_id" text NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
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
	"site_id" text DEFAULT 'default' NOT NULL,
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
CREATE TABLE "editor_locks" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "editor_locks_target_unique" UNIQUE("target_type","target_id"),
	CONSTRAINT "editor_locks_target_check" CHECK ("editor_locks"."target_type" in ('page', 'post'))
);
--> statement-breakpoint
CREATE TABLE "global_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
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
	"site_id" text DEFAULT 'default' NOT NULL,
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
	"site_id" text DEFAULT 'default' NOT NULL,
	"title" varchar(100) NOT NULL,
	"location" "menu_location" DEFAULT 'header' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
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
	"site_id" text DEFAULT 'default' NOT NULL,
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
	"site_id" text DEFAULT 'default' NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"editor_type" "editor_type" DEFAULT 'richtext' NOT NULL,
	"is_home" boolean DEFAULT false NOT NULL,
	"is_blog_index" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "post_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
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
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"featured_image" text,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"layout" "post_layout" DEFAULT 'template' NOT NULL,
	"template_id" text,
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
	"page_id" text,
	"post_id" text,
	"token" text NOT NULL,
	"status" "preview_token_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "preview_tokens_token_unique" UNIQUE("token"),
	CONSTRAINT "preview_tokens_target_check" CHECK (num_nonnulls("preview_tokens"."page_id", "preview_tokens"."post_id") = 1)
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
	"site_id" text DEFAULT 'default' NOT NULL,
	"site_name" varchar(100) DEFAULT 'Next CMS' NOT NULL,
	"site_description" text,
	"seo_title" varchar(160),
	"seo_description" text,
	"translations" jsonb,
	"site_url" varchar(255),
	"logo" text,
	"favicon" text,
	"default_og_image" text,
	"header_menu_id" text,
	"footer_menu_id" text,
	"theme_tokens" jsonb DEFAULT '{"primaryColor":"#4f46e5","accentColor":"#0ea5e9","fontFamily":"Inter","borderRadius":"md","colorMode":"light"}'::jsonb NOT NULL,
	"video_settings" jsonb DEFAULT '{"providers":{"youtube":true,"vimeo":true,"direct":true}}'::jsonb NOT NULL,
	"robots_txt" text,
	"google_analytics_id" varchar(50),
	"updated_at" timestamp with time zone,
	CONSTRAINT "site_settings_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
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
CREATE TABLE "site_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"site_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"primary_host" varchar(255),
	"extra_domains" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_locale" varchar(12) DEFAULT 'en' NOT NULL,
	"locales" jsonb DEFAULT '[{"code":"en","label":"English"},{"code":"es","label":"Spanish"},{"code":"fr","label":"French"},{"code":"de","label":"German"},{"code":"ja","label":"Japanese"}]'::jsonb NOT NULL,
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
CREATE TABLE "video_playlists" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"video_id" text NOT NULL,
	"user_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"duration" integer,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"playlist_id" text,
	"title" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"url" text NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_id" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"event" "webhook_event" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"response_status" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"url" varchar(500) NOT NULL,
	"secret" text NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "page_views" ALTER COLUMN "page_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "post_id" text;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "variant" varchar(1);--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analytics_dashboards" ADD CONSTRAINT "analytics_dashboards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_experiments" ADD CONSTRAINT "page_experiments_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_fields" ADD CONSTRAINT "collection_fields_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_template_page_id_pages_id_fk" FOREIGN KEY ("template_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "api_rate_windows" ADD CONSTRAINT "api_rate_windows_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "editor_locks" ADD CONSTRAINT "editor_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_contents" ADD CONSTRAINT "post_contents_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_seo" ADD CONSTRAINT "post_seo_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "post_templates" ADD CONSTRAINT "post_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_template_id_post_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."post_templates"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "preview_tokens" ADD CONSTRAINT "preview_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_header_menu_id_menus_id_fk" FOREIGN KEY ("header_menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_footer_menu_id_menus_id_fk" FOREIGN KEY ("footer_menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "personalized_section" ADD CONSTRAINT "personalized_section_personalization_id_personalization_id_fk" FOREIGN KEY ("personalization_id") REFERENCES "public"."personalization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "video_playlists" ADD CONSTRAINT "video_playlists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_playlist_id_video_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."video_playlists"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "analytics_dashboards_updated_at_index" ON "analytics_dashboards" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "analytics_dashboards_site_id_index" ON "analytics_dashboards" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "page_experiments_site_id_index" ON "page_experiments" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_role_resource_action_unique" ON "permissions" USING btree ("role_id","resource","action");--> statement-breakpoint
CREATE INDEX "idx_session_expires_at" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_status_index" ON "users" USING btree ("user_status");--> statement-breakpoint
CREATE INDEX "users_email_index" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_name_index" ON "users" USING btree ("name");--> statement-breakpoint
CREATE INDEX "users_created_at_index" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_deleted_at_index" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_entries_collection_slug_unique" ON "collection_entries" USING btree ("collection_id","slug") WHERE "collection_entries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collection_entries_site_id_index" ON "collection_entries" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "collection_entries_collection_id_index" ON "collection_entries" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_entries_status_index" ON "collection_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "collection_entries_deleted_at_index" ON "collection_entries" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_fields_collection_key_unique" ON "collection_fields" USING btree ("collection_id","key");--> statement-breakpoint
CREATE INDEX "collection_fields_collection_id_index" ON "collection_fields" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_site_slug_unique" ON "collections" USING btree ("site_id","slug") WHERE "collections"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collections_site_id_index" ON "collections" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "collections_template_page_id_index" ON "collections" USING btree ("template_page_id");--> statement-breakpoint
CREATE INDEX "form_submissions_site_status_created_index" ON "form_submissions" USING btree ("site_id","status","created_at");--> statement-breakpoint
CREATE INDEX "login_tokens_email_index" ON "login_tokens" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_site_from_unique" ON "redirects" USING btree ("site_id","from_path");--> statement-breakpoint
CREATE INDEX "search_documents_site_language_index" ON "search_documents" USING btree ("site_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_page_unique" ON "search_documents" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_post_unique" ON "search_documents" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "api_keys_site_id_index" ON "api_keys" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "api_rate_windows_api_key_id_index" ON "api_rate_windows" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_rate_windows_window_start_index" ON "api_rate_windows" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_index" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "categories_site_id_index" ON "categories" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "editor_locks_site_id_index" ON "editor_locks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "editor_locks_last_seen_at_index" ON "editor_locks" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "global_blocks_site_id_index" ON "global_blocks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "media_folder_index" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "media_site_id_index" ON "media" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "menu_items_menu_index" ON "menu_items" USING btree ("menu_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_site_location_language_unique" ON "menus" USING btree ("site_id","location","language") WHERE "menus"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "menus_site_id_index" ON "menus" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_contents_page_kind_unique" ON "page_contents" USING btree ("page_id","kind");--> statement-breakpoint
CREATE INDEX "page_revisions_page_index" ON "page_revisions" USING btree ("page_id","created_at");--> statement-breakpoint
CREATE INDEX "page_templates_site_id_index" ON "page_templates" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_slug_language_unique" ON "pages" USING btree ("site_id","slug","language") WHERE "pages"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "pages_site_id_index" ON "pages" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "pages_status_index" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pages_translation_group_index" ON "pages" USING btree ("translation_group_id");--> statement-breakpoint
CREATE INDEX "pages_deleted_at_index" ON "pages" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "post_categories_category_index" ON "post_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_contents_post_kind_unique" ON "post_contents" USING btree ("post_id","kind");--> statement-breakpoint
CREATE INDEX "post_revisions_post_index" ON "post_revisions" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_tags_tag_index" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_templates_default_unique" ON "post_templates" USING btree ("site_id") WHERE "post_templates"."is_default" = true;--> statement-breakpoint
CREATE INDEX "post_templates_site_id_index" ON "post_templates" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_site_slug_language_unique" ON "posts" USING btree ("site_id","slug","language") WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_site_id_index" ON "posts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "posts_status_published_index" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "posts_deleted_at_index" ON "posts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "tags_site_id_index" ON "tags" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "site_memberships_user_site_unique" ON "site_memberships" USING btree ("user_id","site_id");--> statement-breakpoint
CREATE INDEX "site_memberships_site_index" ON "site_memberships" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_primary_host_unique" ON "sites" USING btree ("primary_host") WHERE "sites"."primary_host" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "video_playlists_site_slug_unique" ON "video_playlists" USING btree ("site_id","slug") WHERE "video_playlists"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "video_playlists_site_id_index" ON "video_playlists" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "video_playlists_deleted_at_index" ON "video_playlists" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "video_progress_video_user_unique" ON "video_progress" USING btree ("video_id","user_id");--> statement-breakpoint
CREATE INDEX "video_progress_user_index" ON "video_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_progress_video_index" ON "video_progress" USING btree ("video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_site_slug_unique" ON "videos" USING btree ("site_id","slug") WHERE "videos"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "videos_site_id_index" ON "videos" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "videos_playlist_index" ON "videos" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX "videos_status_index" ON "videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "videos_deleted_at_index" ON "videos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_subscription_id_index" ON "webhook_deliveries" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_index" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_created_at_index" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_site_id_index" ON "webhook_subscriptions" USING btree ("site_id");--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "page_views_post_created_at_index" ON "page_views" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "page_views_site_id_index" ON "page_views" USING btree ("site_id");--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_target_check" CHECK (num_nonnulls("page_views"."page_id", "page_views"."post_id") = 1);