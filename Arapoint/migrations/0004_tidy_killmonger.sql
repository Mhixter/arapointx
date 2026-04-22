CREATE TABLE "agent_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" varchar(30) NOT NULL,
	"agent_id" uuid NOT NULL,
	"admin_user_id" uuid,
	"action" varchar(60) NOT NULL,
	"request_id" uuid,
	"service_type" varchar(80),
	"metadata" jsonb DEFAULT '{}',
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(60) NOT NULL,
	"headline" varchar(200) NOT NULL,
	"highlight_word" varchar(80),
	"body_text" text,
	"subject_preset" varchar(100),
	"photo_prompt" text,
	"feature1_title" varchar(60),
	"feature1_desc" varchar(160),
	"feature2_title" varchar(60),
	"feature2_desc" varchar(160),
	"feature3_title" varchar(60),
	"feature3_desc" varchar(160),
	"aspect_ratio" varchar(10) DEFAULT '16:9',
	"audience" varchar(20) DEFAULT 'main',
	"photo_url" varchar(500),
	"banner_url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'ready',
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rpa_recovery_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"service_type" varchar(100),
	"failed_job_id" uuid,
	"failure_error" text NOT NULL,
	"failure_step" varchar(200),
	"page_html_snippet" text,
	"ai_analysis" text,
	"ai_suggestions" jsonb,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"approved_by_admin_id" uuid,
	"otp_token" varchar(10),
	"otp_expires_at" timestamp,
	"deployed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_activity_logs" ADD CONSTRAINT "agent_activity_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_banners" ADD CONSTRAINT "marketing_banners_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aal_agent_idx" ON "agent_activity_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "aal_type_idx" ON "agent_activity_logs" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "aal_action_idx" ON "agent_activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "aal_created_idx" ON "agent_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mb_audience_idx" ON "marketing_banners" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "mb_category_idx" ON "marketing_banners" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mb_created_idx" ON "marketing_banners" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rrs_status_idx" ON "rpa_recovery_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rrs_provider_idx" ON "rpa_recovery_suggestions" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "rrs_created_idx" ON "rpa_recovery_suggestions" USING btree ("created_at");