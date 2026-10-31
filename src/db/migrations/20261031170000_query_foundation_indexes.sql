-- Indexes for query foundation (R574 / QRY-04)
CREATE INDEX IF NOT EXISTS "pages_site_lang_status_pub_idx" ON "pages" ("site_id", "language", "status", "published_at");
CREATE INDEX IF NOT EXISTS "pages_created_by_idx" ON "pages" ("created_by");
CREATE INDEX IF NOT EXISTS "page_categories_category_id_idx" ON "page_categories" ("category_id");
CREATE INDEX IF NOT EXISTS "page_tags_tag_id_idx" ON "page_tags" ("tag_id");
CREATE INDEX IF NOT EXISTS "posts_site_lang_status_pub_idx" ON "posts" ("site_id", "language", "status", "published_at");
CREATE INDEX IF NOT EXISTS "posts_created_by_idx" ON "posts" ("created_by");
CREATE INDEX IF NOT EXISTS "videos_site_status_pub_idx" ON "videos" ("site_id", "status", "published_at");
