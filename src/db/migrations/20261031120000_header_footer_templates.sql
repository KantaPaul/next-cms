ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "header_template_id" text;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "footer_template_id" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "header_template_id" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "footer_template_id" text;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "header_template_id" text;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "footer_template_id" text;

DO $$ BEGIN
 ALTER TABLE "pages" ADD CONSTRAINT "pages_header_template_id_global_blocks_id_fk" FOREIGN KEY ("header_template_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pages" ADD CONSTRAINT "pages_footer_template_id_global_blocks_id_fk" FOREIGN KEY ("footer_template_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_header_template_id_global_blocks_id_fk" FOREIGN KEY ("header_template_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_footer_template_id_global_blocks_id_fk" FOREIGN KEY ("footer_template_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_header_template_id_global_blocks_id_fk" FOREIGN KEY ("header_template_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_footer_template_id_global_blocks_id_fk" FOREIGN KEY ("footer_template_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
