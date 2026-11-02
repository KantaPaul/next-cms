CREATE TABLE "license_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" varchar(100) NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "license_rate_limits_ident_window_idx" ON "license_rate_limits" USING btree ("identifier","window_start");