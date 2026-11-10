CREATE TABLE "import_items" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"kind" varchar(30) NOT NULL,
	"wp_id" varchar(200) NOT NULL,
	"wp_slug" varchar(300),
	"title" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"new_id" text,
	"new_url" text,
	"old_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"message" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "import_items_status_check" CHECK ("import_items"."status" in ('pending', 'done', 'skipped', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"created_by" text,
	"source_kind" varchar(24) DEFAULT 'wxr' NOT NULL,
	"source_filename" varchar(255),
	"source_key" text NOT NULL,
	"status" varchar(20) DEFAULT 'parsed' NOT NULL,
	"options" jsonb DEFAULT '{"downloadMedia":true,"importAsDrafts":false,"createRedirects":true,"importComments":true,"importAuthors":true}'::jsonb NOT NULL,
	"counts" jsonb NOT NULL,
	"progress" jsonb DEFAULT '{"processed":0,"total":0,"imported":0,"skipped":0,"failed":0}'::jsonb NOT NULL,
	"report" jsonb DEFAULT '{"renames":[],"warnings":[],"redirectsCreated":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "import_jobs_status_check" CHECK ("import_jobs"."status" in ('parsed', 'running', 'done', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_items_job_status_order_index" ON "import_items" USING btree ("job_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "import_items_site_kind_wpid_index" ON "import_items" USING btree ("site_id","kind","wp_id");--> statement-breakpoint
CREATE INDEX "import_jobs_site_created_index" ON "import_jobs" USING btree ("site_id","created_at");