CREATE TABLE "page_views" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"path" varchar(500) NOT NULL,
	"referrer_host" varchar(255),
	"visitor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "page_views_created_at_index" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_views_page_created_at_index" ON "page_views" USING btree ("page_id","created_at");
