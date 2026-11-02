ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "auth_settings" jsonb DEFAULT '{"loginEnabled":true,"publicRegistrationEnabled":true,"requireEmailVerification":false,"requireAdminApproval":false,"sessionLifetimeHours":720,"maxFailedAttempts":5,"lockoutMinutes":15,"loginDisabledMessage":"Login is currently disabled."}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp;
--> statement-breakpoint
UPDATE "users" SET "approved_at" = "created_at" WHERE "approved_at" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL UNIQUE,
	"count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
