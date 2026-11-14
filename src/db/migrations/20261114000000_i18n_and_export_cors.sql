ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ui_locale" varchar(16);
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "export_api_base" text;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "export_allowed_origins" text[] NOT NULL DEFAULT '{}'::text[];
