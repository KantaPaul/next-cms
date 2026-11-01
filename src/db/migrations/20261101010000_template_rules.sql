CREATE TABLE IF NOT EXISTS "template_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"template_id" text NOT NULL,
	"area" varchar(20) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"value" varchar(150) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "template_rules" ADD CONSTRAINT "template_rules_template_id_global_blocks_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."global_blocks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "template_rules_site_area_index" ON "template_rules" ("site_id", "area");
CREATE INDEX IF NOT EXISTS "template_rules_template_id_index" ON "template_rules" ("template_id");
