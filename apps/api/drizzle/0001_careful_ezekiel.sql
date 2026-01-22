DO $$ BEGIN
 CREATE TYPE "public"."feed_severity" AS ENUM('info', 'low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."feed_type" AS ENUM('news', 'flight', 'maritime', 'civil_unrest', 'fire', 'telegram', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feeds"."feed_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "feed_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"poll_interval" integer DEFAULT 60000 NOT NULL,
	"api_key_encrypted" text,
	"endpoint" text,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_fetch_at" timestamp,
	"last_error" text,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feeds"."feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"feed_config_id" uuid,
	"type" "feed_type" NOT NULL,
	"external_id" varchar(255),
	"title" text NOT NULL,
	"content" text,
	"url" text,
	"timestamp" timestamp NOT NULL,
	"latitude" real,
	"longitude" real,
	"location_name" text,
	"severity" "feed_severity" DEFAULT 'info' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw" jsonb,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feeds"."feed_processing_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_config_id" uuid NOT NULL,
	"job_id" varchar(100),
	"status" varchar(20) NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"items_created" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feeds"."feed_configs" ADD CONSTRAINT "feed_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feeds"."feed_items" ADD CONSTRAINT "feed_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feeds"."feed_items" ADD CONSTRAINT "feed_items_feed_config_id_feed_configs_id_fk" FOREIGN KEY ("feed_config_id") REFERENCES "feeds"."feed_configs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feeds"."feed_processing_log" ADD CONSTRAINT "feed_processing_log_feed_config_id_feed_configs_id_fk" FOREIGN KEY ("feed_config_id") REFERENCES "feeds"."feed_configs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_configs_project_type_idx" ON "feeds"."feed_configs" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_configs_enabled_idx" ON "feeds"."feed_configs" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_project_ts_idx" ON "feeds"."feed_items" USING btree ("project_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_type_idx" ON "feeds"."feed_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_external_id_idx" ON "feeds"."feed_items" USING btree ("feed_config_id","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_location_idx" ON "feeds"."feed_items" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_processing_log_config_idx" ON "feeds"."feed_processing_log" USING btree ("feed_config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_processing_log_started_idx" ON "feeds"."feed_processing_log" USING btree ("started_at");