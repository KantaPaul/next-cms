CREATE TABLE "plugin_kv" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"plugin_id" varchar(120) NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"plugin_id" varchar(120) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" varchar(40),
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"last_cron_run_at" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_kv_site_plugin_key_unique" ON "plugin_kv" USING btree ("site_id","plugin_id","key");--> statement-breakpoint
CREATE INDEX "plugin_kv_site_plugin_index" ON "plugin_kv" USING btree ("site_id","plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plugins_site_plugin_unique" ON "plugins" USING btree ("site_id","plugin_id");--> statement-breakpoint
CREATE INDEX "plugins_site_enabled_index" ON "plugins" USING btree ("site_id","enabled");