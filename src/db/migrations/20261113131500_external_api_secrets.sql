ALTER TABLE "external_apis" ADD COLUMN IF NOT EXISTS "secrets" jsonb DEFAULT '{}'::jsonb NOT NULL;
