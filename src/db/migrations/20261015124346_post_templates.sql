CREATE TABLE "post_templates" (
	"id" text PRIMARY KEY NOT NULL,
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
ALTER TABLE "posts" ADD COLUMN "template_id" text;--> statement-breakpoint
ALTER TABLE "post_templates" ADD CONSTRAINT "post_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "post_templates_default_unique" ON "post_templates" USING btree ("is_default") WHERE "post_templates"."is_default" = true;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_template_id_post_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."post_templates"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
INSERT INTO "post_templates" ("id", "name", "description", "content", "draft_content", "is_default")
SELECT substr(md5(random()::text), 1, 24), 'Default', 'The original single-post layout.', s."single_post_template", s."single_post_template_draft", true
FROM (SELECT 1) AS one
LEFT JOIN "site_settings" s ON true
LIMIT 1;--> statement-breakpoint
ALTER TABLE "site_settings" DROP COLUMN "single_post_template";--> statement-breakpoint
ALTER TABLE "site_settings" DROP COLUMN "single_post_template_draft";