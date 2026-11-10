ALTER TABLE "api_rate_windows" DROP CONSTRAINT "api_rate_windows_api_key_id_api_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "source" jsonb;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "files" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD COLUMN "action_log" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "integrations" jsonb DEFAULT '{}'::jsonb NOT NULL;