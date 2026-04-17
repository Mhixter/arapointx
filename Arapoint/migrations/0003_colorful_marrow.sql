CREATE TABLE "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text,
	"tool_calls" jsonb,
	"tool_call_id" varchar(100),
	"name" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(64) NOT NULL,
	"user_id" uuid,
	"status" varchar(20) DEFAULT 'active',
	"escalated_ticket_id" uuid,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_chat_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "login_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(255),
	"actor_email" varchar(255) NOT NULL,
	"actor_name" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"device" varchar(100),
	"browser" varchar(100),
	"os" varchar(100),
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"last_checked_at" timestamp,
	"last_success_at" timestamp,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_response_preview" text,
	"is_auto_disabled" boolean DEFAULT false NOT NULL,
	"auto_disabled_at" timestamp,
	"total_checks" integer DEFAULT 0 NOT NULL,
	"total_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_health_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "support_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"estimated_wait_minutes" integer DEFAULT 5,
	"accepted_by" uuid,
	"accepted_at" timestamp,
	"removed_at" timestamp,
	"remove_reason" varchar(50),
	CONSTRAINT "support_queue_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_escalated_ticket_id_support_tickets_id_fk" FOREIGN KEY ("escalated_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_queue" ADD CONSTRAINT "support_queue_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_queue" ADD CONSTRAINT "support_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_queue" ADD CONSTRAINT "support_queue_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_queue" ADD CONSTRAINT "support_queue_accepted_by_admin_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acm_session_idx" ON "ai_chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "acs_user_idx" ON "ai_chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "acs_token_idx" ON "ai_chat_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "acs_status_idx" ON "ai_chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "la_actor_type_idx" ON "login_activities" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "la_actor_id_idx" ON "login_activities" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "la_created_idx" ON "login_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "la_status_idx" ON "login_activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ph_provider_idx" ON "provider_health" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ph_status_idx" ON "provider_health" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sq_status_idx" ON "support_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sq_ticket_idx" ON "support_queue" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "sq_joined_idx" ON "support_queue" USING btree ("joined_at");--> statement-breakpoint
CREATE INDEX "sq_priority_idx" ON "support_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "airtime_user_idx" ON "airtime_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "airtime_status_idx" ON "airtime_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bvn_svc_user_idx" ON "bvn_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bvn_svc_status_idx" ON "bvn_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bvn_ver_user_idx" ON "bvn_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bvn_ver_bvn_idx" ON "bvn_verifications" USING btree ("bvn");--> statement-breakpoint
CREATE INDEX "cable_user_idx" ON "cable_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cable_status_idx" ON "cable_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cac_req_user_idx" ON "cac_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cac_req_status_idx" ON "cac_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_svc_user_idx" ON "data_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_svc_status_idx" ON "data_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "elec_user_idx" ON "electricity_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "elec_status_idx" ON "electricity_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "otp_email_idx" ON "otp_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "otp_expires_idx" ON "otp_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "support_conv_ticket_idx" ON "support_conversations" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_conv_active_idx" ON "support_conversations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "support_msg_conv_idx" ON "support_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "support_msg_created_idx" ON "support_messages" USING btree ("created_at");