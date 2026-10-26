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
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "form_submissions_site_status_created_index" ON "form_submissions" USING btree ("site_id","status","created_at");--> statement-breakpoint
CREATE INDEX "login_tokens_email_index" ON "login_tokens" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_site_from_unique" ON "redirects" USING btree ("site_id","from_path");--> statement-breakpoint
CREATE INDEX "search_documents_site_language_index" ON "search_documents" USING btree ("site_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_page_unique" ON "search_documents" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_post_unique" ON "search_documents" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "search_documents_search_vector_index" ON "search_documents" USING gin ("search_vector");
