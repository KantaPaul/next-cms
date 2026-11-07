CREATE TABLE "comment_reactions" (
	"comment_id" text NOT NULL,
	"voter_hash" varchar(64) NOT NULL,
	"ip_hash" varchar(64),
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "comment_reactions_comment_id_voter_hash_pk" PRIMARY KEY("comment_id","voter_hash"),
	CONSTRAINT "comment_reactions_value_check" CHECK ("comment_reactions"."value" in (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "voter_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "comment_reactions_comment_ip_index" ON "comment_reactions" USING btree ("comment_id","ip_hash");