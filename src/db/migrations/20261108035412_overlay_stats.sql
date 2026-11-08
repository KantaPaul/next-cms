CREATE TABLE "overlay_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"overlay_id" text NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"closes" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "overlay_stats" ADD CONSTRAINT "overlay_stats_overlay_id_global_blocks_id_fk" FOREIGN KEY ("overlay_id") REFERENCES "public"."global_blocks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "overlay_stats_overlay_day_unique" ON "overlay_stats" USING btree ("overlay_id","day");--> statement-breakpoint
CREATE INDEX "overlay_stats_site_id_index" ON "overlay_stats" USING btree ("site_id");