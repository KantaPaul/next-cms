ALTER TABLE "menu_items" ADD COLUMN "mega_menu_id" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "mega_menu_width" varchar(20) DEFAULT 'container' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_mega_menu_id_global_blocks_id_fk" FOREIGN KEY ("mega_menu_id") REFERENCES "public"."global_blocks"("id") ON DELETE set null ON UPDATE cascade;