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
DROP INDEX "pages_slug_language_unique";--> statement-breakpoint
DROP INDEX "posts_slug_language_unique";--> statement-breakpoint
DROP INDEX "post_templates_default_unique";--> statement-breakpoint
ALTER TABLE "analytics_dashboards" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_blocks" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "page_templates" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "page_views" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_templates" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "seo_title" varchar(160);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "translations" jsonb;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "site_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_memberships" ADD CONSTRAINT "site_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "site_memberships_user_site_unique" ON "site_memberships" USING btree ("user_id","site_id");--> statement-breakpoint
CREATE INDEX "site_memberships_site_index" ON "site_memberships" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_primary_host_unique" ON "sites" USING btree ("primary_host") WHERE "sites"."primary_host" is not null;--> statement-breakpoint
CREATE INDEX "analytics_dashboards_site_id_index" ON "analytics_dashboards" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "api_keys_site_id_index" ON "api_keys" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "categories_site_id_index" ON "categories" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "global_blocks_site_id_index" ON "global_blocks" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "media_site_id_index" ON "media" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_site_location_language_unique" ON "menus" USING btree ("site_id","location","language") WHERE "menus"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "menus_site_id_index" ON "menus" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "page_templates_site_id_index" ON "page_templates" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "page_views_site_id_index" ON "page_views" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_slug_language_unique" ON "pages" USING btree ("site_id","slug","language") WHERE "pages"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "pages_site_id_index" ON "pages" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "post_templates_site_id_index" ON "post_templates" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_site_slug_language_unique" ON "posts" USING btree ("site_id","slug","language") WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_site_id_index" ON "posts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "tags_site_id_index" ON "tags" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_templates_default_unique" ON "post_templates" USING btree ("site_id") WHERE "post_templates"."is_default" = true;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_id_unique" UNIQUE("site_id");--> statement-breakpoint
INSERT INTO "sites" ("id", "name", "extra_domains", "default_locale", "locales")
VALUES (
  'default',
  COALESCE((SELECT "site_name" FROM "site_settings" WHERE "id" = 'default'), 'Next CMS'),
  '{}',
  'en',
  '[{"code":"en","label":"English"},{"code":"es","label":"Spanish"},{"code":"fr","label":"French"},{"code":"de","label":"German"},{"code":"ja","label":"Japanese"}]'::jsonb
)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "site_memberships" ("id", "user_id", "site_id", "role_id")
SELECT 'mbr_' || u."id", u."id", 'default', u."role_id"
FROM "users" u
WHERE u."role_id" IS NOT NULL AND u."deleted_at" IS NULL
ON CONFLICT ("user_id", "site_id") DO NOTHING;