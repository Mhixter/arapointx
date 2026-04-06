CREATE TABLE "a2c_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"employee_id" varchar(50),
	"supported_networks" jsonb DEFAULT '["mtn", "airtel", "glo", "9mobile"]',
	"max_active_requests" integer DEFAULT 30,
	"current_active_requests" integer DEFAULT 0,
	"total_completed_requests" integer DEFAULT 0,
	"total_processed_amount" numeric(15, 2) DEFAULT '0',
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "a2c_agents_admin_user_id_unique" UNIQUE("admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "a2c_phone_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"network" varchar(20) NOT NULL,
	"daily_limit" numeric(15, 2) DEFAULT '500000',
	"used_today" numeric(15, 2) DEFAULT '0',
	"last_reset_date" timestamp DEFAULT now(),
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"label" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "a2c_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tracking_id" varchar(20) NOT NULL,
	"network" varchar(20) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"airtime_amount" numeric(10, 2) NOT NULL,
	"conversion_rate" numeric(5, 2) NOT NULL,
	"cash_amount" numeric(10, 2) NOT NULL,
	"inventory_id" uuid,
	"receiving_number" varchar(20) NOT NULL,
	"bank_name" varchar(100),
	"account_number" varchar(20),
	"account_name" varchar(255),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"assigned_agent_id" uuid,
	"assigned_at" timestamp,
	"user_confirmed_at" timestamp,
	"airtime_received_at" timestamp,
	"cash_paid_at" timestamp,
	"customer_notes" text,
	"agent_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "a2c_requests_tracking_id_unique" UNIQUE("tracking_id")
);
--> statement-breakpoint
CREATE TABLE "a2c_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" varchar(100),
	"details" jsonb,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"request_id" varchar(100),
	"user_id" uuid,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role_id" uuid,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "agent_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" varchar(30) NOT NULL,
	"agent_id" uuid NOT NULL,
	"channel_type" varchar(20) DEFAULT 'whatsapp' NOT NULL,
	"channel_value" varchar(50) NOT NULL,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_internal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"from_type" varchar(30) NOT NULL,
	"from_id" varchar(100) NOT NULL,
	"from_name" varchar(100) NOT NULL,
	"to_department" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"linked_order_id" varchar(100),
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" varchar(30) NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid,
	"request_type" varchar(50) NOT NULL,
	"request_id" varchar(100) NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"error_message" text,
	"external_message_id" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"variations" jsonb DEFAULT '[]',
	"answer" text NOT NULL,
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"tags" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"use_count" integer DEFAULT 0,
	"added_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_unresolved_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"conversation_id" uuid,
	"ticket_id" uuid,
	"is_resolved" boolean DEFAULT false,
	"resolved_answer" text,
	"resolved_kb_id" uuid,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bvn_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bvn" varchar(11) NOT NULL,
	"reference" varchar(100) NOT NULL,
	"verification_data" jsonb,
	"pdf_key" varchar(500),
	"status" varchar(50) DEFAULT 'completed',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bvn_verifications_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "cac_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"employee_id" varchar(50),
	"specializations" jsonb DEFAULT '[]',
	"max_active_requests" integer DEFAULT 10,
	"current_active_requests" integer DEFAULT 0,
	"total_completed_requests" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cac_agents_admin_user_id_unique" UNIQUE("admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "cac_business_natures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "cac_business_natures_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cac_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cac_request_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_key" varchar(500) NOT NULL,
	"file_size" integer,
	"is_result" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cac_registration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_type_id" uuid,
	"service_type" varchar(100) NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"business_nature" varchar(255),
	"business_address" text,
	"business_state" varchar(100),
	"business_lga" varchar(100),
	"proprietor_name" varchar(255),
	"proprietor_phone" varchar(20),
	"proprietor_email" varchar(255),
	"proprietor_nin" varchar(11),
	"additional_proprietors" jsonb DEFAULT '[]',
	"share_capital" numeric(15, 2),
	"objectives" text,
	"passport_photo_url" text,
	"signature_url" text,
	"nin_slip_url" text,
	"status" varchar(50) DEFAULT 'submitted',
	"assigned_agent_id" uuid,
	"assigned_at" timestamp,
	"fee" numeric(10, 2) NOT NULL,
	"is_paid" boolean DEFAULT false,
	"payment_reference" varchar(100),
	"cac_registration_number" varchar(100),
	"certificate_url" text,
	"rejection_reason" text,
	"customer_notes" text,
	"agent_notes" text,
	"submitted_to_cac_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cac_request_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50),
	"comment" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cac_request_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"checksum" varchar(64),
	"is_verified" boolean DEFAULT false,
	"verified_by" uuid,
	"verified_at" timestamp,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cac_request_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"sender_id" uuid NOT NULL,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]',
	"file_url" text,
	"file_name" varchar(255),
	"file_type" varchar(100),
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cac_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid,
	"business_name" varchar(255) NOT NULL,
	"business_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"reference" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "cac_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "cac_service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"processing_days" integer DEFAULT 7,
	"required_documents" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cac_service_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "education_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"employee_id" varchar(50),
	"specializations" jsonb DEFAULT '["jamb", "waec", "neco"]',
	"max_active_requests" integer DEFAULT 20,
	"current_active_requests" integer DEFAULT 0,
	"total_completed_requests" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "education_agents_admin_user_id_unique" UNIQUE("admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "education_pin_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"pin_id" uuid,
	"payment_reference" varchar(100),
	"delivered_pin" varchar(100),
	"delivered_serial" varchar(100),
	"failure_reason" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "education_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_type" varchar(20) NOT NULL,
	"pin_code" varchar(100) NOT NULL,
	"serial_number" varchar(100),
	"status" varchar(20) DEFAULT 'unused' NOT NULL,
	"used_by_order_id" uuid,
	"used_by_user_id" uuid,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "education_request_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploader_role" varchar(20) NOT NULL,
	"file_type" varchar(100),
	"file_name" varchar(255),
	"file_key" varchar(500) NOT NULL,
	"is_result" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "education_service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tracking_id" varchar(20) NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"exam_year" varchar(10),
	"registration_number" varchar(50),
	"candidate_name" varchar(255),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"assigned_agent_id" uuid,
	"assigned_at" timestamp,
	"fee" numeric(10, 2) NOT NULL,
	"is_paid" boolean DEFAULT false,
	"payment_reference" varchar(100),
	"result_data" jsonb,
	"result_url" varchar(500),
	"customer_notes" text,
	"agent_notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "education_service_requests_tracking_id_unique" UNIQUE("tracking_id")
);
--> statement-breakpoint
CREATE TABLE "fraud_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"resolved_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "identity_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"employee_id" varchar(50),
	"specializations" jsonb DEFAULT '["nin_validation", "ipe_clearance", "nin_personalization"]',
	"max_active_requests" integer DEFAULT 20,
	"current_active_requests" integer DEFAULT 0,
	"total_completed_requests" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "identity_agents_admin_user_id_unique" UNIQUE("admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "identity_request_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50),
	"comment" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "identity_service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tracking_id" varchar(20) NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"nin" varchar(11),
	"new_tracking_id" varchar(50),
	"update_fields" jsonb,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"assigned_agent_id" uuid,
	"assigned_at" timestamp,
	"fee" numeric(10, 2) NOT NULL,
	"is_paid" boolean DEFAULT false,
	"payment_reference" varchar(100),
	"slip_url" varchar(500),
	"resolved_tracking_id" varchar(100),
	"validated_full_name" varchar(200),
	"validated_date_of_birth" varchar(50),
	"result_data" jsonb,
	"customer_notes" text,
	"agent_notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "identity_service_requests_tracking_id_unique" UNIQUE("tracking_id")
);
--> statement-breakpoint
CREATE TABLE "jamb_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"employee_id" varchar(50),
	"specializations" jsonb DEFAULT '["olevel-upload", "admission-letter", "original-result", "pin-vending", "reprinting-caps"]',
	"max_active_requests" integer DEFAULT 20,
	"current_active_requests" integer DEFAULT 0,
	"total_completed_requests" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "jamb_agents_admin_user_id_unique" UNIQUE("admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "jamb_request_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploader_role" varchar(20) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_key" varchar(500) NOT NULL,
	"file_size" integer,
	"is_result" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jamb_service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tracking_id" varchar(20) NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"registration_number" varchar(50),
	"candidate_name" varchar(255),
	"exam_year" varchar(10),
	"request_data" jsonb,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"assigned_agent_id" uuid,
	"assigned_at" timestamp,
	"fee" numeric(10, 2) NOT NULL,
	"is_paid" boolean DEFAULT false,
	"payment_reference" varchar(100),
	"result_data" jsonb,
	"result_url" varchar(500),
	"customer_notes" text,
	"agent_notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "jamb_service_requests_tracking_id_unique" UNIQUE("tracking_id")
);
--> statement-breakpoint
CREATE TABLE "nbais_schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(100) NOT NULL,
	"school_name" varchar(500) NOT NULL,
	"school_value" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nin_slips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"slip_reference" varchar(100) NOT NULL,
	"slip_type" varchar(50) NOT NULL,
	"nin" varchar(11) NOT NULL,
	"surname" varchar(255) NOT NULL,
	"firstname" varchar(255) NOT NULL,
	"middlename" varchar(255),
	"date_of_birth" varchar(50) NOT NULL,
	"gender" varchar(20),
	"photo" text,
	"tracking_id" varchar(100),
	"verification_reference" varchar(100),
	"verification_status" varchar(50) DEFAULT 'verified',
	"pdf_path" varchar(500),
	"pdf_data" text,
	"qr_code_data" text,
	"is_public" boolean DEFAULT true,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nin_slips_slip_reference_unique" UNIQUE("slip_reference")
);
--> statement-breakpoint
CREATE TABLE "scraped_data_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network" varchar(50) NOT NULL,
	"plan_id" varchar(100) NOT NULL,
	"plan_name" varchar(255) NOT NULL,
	"cost_price" numeric(10, 2) NOT NULL,
	"selling_price" numeric(10, 2) NOT NULL,
	"reseller_price" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"last_scraped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_type" varchar(100) NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"cost_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"markup" numeric(10, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_pricing_service_type_unique" UNIQUE("service_type")
);
--> statement-breakpoint
CREATE TABLE "shared_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by_user_id" uuid,
	"uploaded_by_agent_id" uuid,
	"uploader_role" varchar(20) NOT NULL,
	"file_key" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer,
	"related_request_id" varchar(100),
	"related_request_type" varchar(50),
	"accessible_to" varchar(20) DEFAULT 'all',
	"description" text,
	"share_token" varchar(64),
	"share_token_expires_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shared_files_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true,
	"closed_reason" varchar(50),
	"last_message_at" timestamp DEFAULT now(),
	"summary" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"sender_id" uuid,
	"sender_name" varchar(100),
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"participant_type" varchar(10) NOT NULL,
	"participant_name" varchar(100),
	"is_online" boolean DEFAULT false,
	"is_typing" boolean DEFAULT false,
	"last_seen_at" timestamp DEFAULT now(),
	"typing_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" varchar(20) NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(255) DEFAULT 'General Support' NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"assigned_agent_id" uuid,
	"department_tag" varchar(50),
	"linked_order_id" varchar(100),
	"linked_order_type" varchar(30),
	"escalated_at" timestamp,
	"assigned_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"last_activity_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_tickets_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "virtual_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"paystack_customer_id" varchar(100),
	"paystack_customer_code" varchar(100),
	"dedicated_account_id" varchar(100),
	"bank_name" varchar(100),
	"bank_code" varchar(20),
	"account_number" varchar(20),
	"account_name" varchar(255),
	"provider_slug" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "virtual_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"template_content" text NOT NULL,
	"variables" jsonb DEFAULT '[]',
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"meta_template_id" varchar(100),
	"meta_status" varchar(30),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_templates_template_name_unique" UNIQUE("template_name")
);
--> statement-breakpoint
ALTER TABLE "education_services" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "education_services" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD COLUMN "slip_html" text;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD COLUMN "slip_type" varchar(50);--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD COLUMN "slip_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD COLUMN "reference" varchar(100);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_suspended" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspend_reason" text;--> statement-breakpoint
ALTER TABLE "a2c_agents" ADD CONSTRAINT "a2c_agents_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2c_phone_inventory" ADD CONSTRAINT "a2c_phone_inventory_agent_id_a2c_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."a2c_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2c_requests" ADD CONSTRAINT "a2c_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2c_requests" ADD CONSTRAINT "a2c_requests_inventory_id_a2c_phone_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."a2c_phone_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2c_requests" ADD CONSTRAINT "a2c_requests_assigned_agent_id_a2c_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."a2c_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2c_status_history" ADD CONSTRAINT "a2c_status_history_request_id_a2c_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."a2c_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_internal_messages" ADD CONSTRAINT "agent_internal_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_knowledge_base" ADD CONSTRAINT "ai_knowledge_base_added_by_admin_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_unresolved_queries" ADD CONSTRAINT "ai_unresolved_queries_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bvn_verifications" ADD CONSTRAINT "bvn_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_agents" ADD CONSTRAINT "cac_agents_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_files" ADD CONSTRAINT "cac_files_cac_request_id_cac_requests_id_fk" FOREIGN KEY ("cac_request_id") REFERENCES "public"."cac_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_files" ADD CONSTRAINT "cac_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_registration_requests" ADD CONSTRAINT "cac_registration_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_registration_requests" ADD CONSTRAINT "cac_registration_requests_service_type_id_cac_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."cac_service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_registration_requests" ADD CONSTRAINT "cac_registration_requests_assigned_agent_id_cac_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."cac_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_request_activity" ADD CONSTRAINT "cac_request_activity_request_id_cac_registration_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."cac_registration_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_request_documents" ADD CONSTRAINT "cac_request_documents_request_id_cac_registration_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."cac_registration_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_request_documents" ADD CONSTRAINT "cac_request_documents_verified_by_cac_agents_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."cac_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_request_messages" ADD CONSTRAINT "cac_request_messages_request_id_cac_registration_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."cac_registration_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_requests" ADD CONSTRAINT "cac_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cac_requests" ADD CONSTRAINT "cac_requests_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_agents" ADD CONSTRAINT "education_agents_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_pin_orders" ADD CONSTRAINT "education_pin_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_pin_orders" ADD CONSTRAINT "education_pin_orders_pin_id_education_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."education_pins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_pins" ADD CONSTRAINT "education_pins_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_request_documents" ADD CONSTRAINT "education_request_documents_request_id_education_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."education_service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_service_requests" ADD CONSTRAINT "education_service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_service_requests" ADD CONSTRAINT "education_service_requests_assigned_agent_id_education_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."education_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_agents" ADD CONSTRAINT "identity_agents_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_request_activity" ADD CONSTRAINT "identity_request_activity_request_id_identity_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."identity_service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_service_requests" ADD CONSTRAINT "identity_service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_service_requests" ADD CONSTRAINT "identity_service_requests_assigned_agent_id_identity_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."identity_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jamb_agents" ADD CONSTRAINT "jamb_agents_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jamb_request_documents" ADD CONSTRAINT "jamb_request_documents_request_id_jamb_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."jamb_service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jamb_service_requests" ADD CONSTRAINT "jamb_service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jamb_service_requests" ADD CONSTRAINT "jamb_service_requests_assigned_agent_id_jamb_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."jamb_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nin_slips" ADD CONSTRAINT "nin_slips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_internal_notes" ADD CONSTRAINT "support_internal_notes_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_internal_notes" ADD CONSTRAINT "support_internal_notes_agent_id_admin_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_presence" ADD CONSTRAINT "support_presence_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_agent_id_admin_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_accounts" ADD CONSTRAINT "virtual_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_services" ADD CONSTRAINT "education_services_job_id_rpa_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."rpa_jobs"("id") ON DELETE no action ON UPDATE no action;