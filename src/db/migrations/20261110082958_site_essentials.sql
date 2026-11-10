CREATE TABLE "backups" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"kind" varchar(20) DEFAULT 'manual' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"include_media" boolean DEFAULT true NOT NULL,
	"storage_key" text,
	"manifest" jsonb,
	"progress" jsonb,
	"created_by" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "backups_kind_check" CHECK ("backups"."kind" in ('manual', 'scheduled', 'pre-restore')),
	CONSTRAINT "backups_status_check" CHECK ("backups"."status" in ('pending', 'running', 'ready', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "consent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"categories" jsonb NOT NULL,
	"version" integer NOT NULL,
	"mode" varchar(20) DEFAULT 'opt-in' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"email" varchar(200) NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(30) DEFAULT 'confirmed' NOT NULL,
	"token_hash" text,
	"visitor_id" text,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"export_key" text,
	"export_token_hash" text,
	"export_expires_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "privacy_requests_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "privacy_requests_type_check" CHECK ("privacy_requests"."type" in ('export', 'erase')),
	CONSTRAINT "privacy_requests_status_check" CHECK ("privacy_requests"."status" in ('pending_confirmation', 'confirmed', 'completed', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "site_mode" jsonb DEFAULT '{"mode":"live","pageBlockId":null,"bypassToken":null,"excludePaths":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "consent" jsonb DEFAULT '{"enabled":true,"mode":"opt-in","version":1,"title":"We value your privacy","description":"We use cookies to enhance your browsing experience, measure site traffic, and load third-party embeds.","acceptAllLabel":"Accept all","rejectAllLabel":"Reject all","customizeLabel":"Customize","saveLabel":"Save preferences","privacyPolicyUrl":"/privacy","privacyPolicyLabel":"Privacy Policy","position":"bottom-bar","customCodeCategories":{"headHtml":"marketing","bodyStartHtml":"marketing","bodyEndHtml":"marketing"}}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "backup_settings" jsonb DEFAULT '{"frequency":"off","includeMedia":true,"keepLast":7,"lastRunAt":null,"lastStatus":null,"lastError":null}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "backups_site_created_index" ON "backups" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "backups_site_kind_status_index" ON "backups" USING btree ("site_id","kind","status");--> statement-breakpoint
CREATE INDEX "consent_logs_site_created_index" ON "consent_logs" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "consent_logs_site_visitor_index" ON "consent_logs" USING btree ("site_id","visitor_hash");--> statement-breakpoint
CREATE INDEX "privacy_requests_site_status_index" ON "privacy_requests" USING btree ("site_id","status","created_at");--> statement-breakpoint
CREATE INDEX "privacy_requests_site_email_index" ON "privacy_requests" USING btree ("site_id","email");