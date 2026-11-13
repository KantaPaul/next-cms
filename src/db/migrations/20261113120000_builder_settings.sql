ALTER TABLE "site_settings" ADD COLUMN "builder_settings" jsonb DEFAULT '{"styleClasses":false}'::jsonb NOT NULL;
