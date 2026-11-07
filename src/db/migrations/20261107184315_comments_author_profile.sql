CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"post_id" text NOT NULL,
	"parent_id" text,
	"author_name" varchar(80) NOT NULL,
	"author_email" varchar(200) NOT NULL,
	"author_url" varchar(300),
	"user_id" text,
	"body" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "comments_status_check" CHECK ("comments"."status" in ('pending', 'approved', 'spam', 'trash'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "allow_comments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "reading_settings" jsonb DEFAULT '{"postNavigation":"auto","comments":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_post_status_created_index" ON "comments" USING btree ("post_id","status","created_at");--> statement-breakpoint
CREATE INDEX "comments_site_status_created_index" ON "comments" USING btree ("site_id","status","created_at");--> statement-breakpoint
CREATE INDEX "comments_ip_created_index" ON "comments" USING btree ("ip_hash","created_at");--> statement-breakpoint
INSERT INTO "permissions" ("id", "role_id", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, "id", 'comments', 'moderate', true
FROM "roles"
WHERE "name" IN ('Admin', 'Editor')
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
