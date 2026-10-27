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
ALTER TABLE "page_views" ADD COLUMN "variant" varchar(1);--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "page_experiments" ADD CONSTRAINT "page_experiments_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_locks" ADD CONSTRAINT "editor_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_experiments_site_id_index" ON "page_experiments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "editor_locks_site_id_index" ON "editor_locks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "editor_locks_last_seen_at_index" ON "editor_locks" USING btree ("last_seen_at");