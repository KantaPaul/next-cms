CREATE TABLE "style_classes" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" varchar(80) NOT NULL,
	"kind" varchar(8) DEFAULT 'class' NOT NULL,
	"tag" varchar(16),
	"combo_of" text,
	"variants" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "style_classes" ADD CONSTRAINT "style_classes_combo_of_style_classes_id_fk" FOREIGN KEY ("combo_of") REFERENCES "public"."style_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "style_classes_site_name_uq" ON "style_classes" USING btree ("site_id","name");--> statement-breakpoint
CREATE INDEX "style_classes_combo_of_index" ON "style_classes" USING btree ("combo_of");
