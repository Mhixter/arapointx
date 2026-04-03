--
-- PostgreSQL database dump
--

\restrict z7PBbR8sxKOuSe65DiY0v5RASlLz5Ixy67X3yQnneUsrdoOvNjSJcaKXKmhT7iD

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: a2c_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.a2c_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    employee_id character varying(50),
    supported_networks jsonb DEFAULT '["mtn", "airtel", "glo", "9mobile"]'::jsonb,
    max_active_requests integer DEFAULT 30,
    current_active_requests integer DEFAULT 0,
    total_completed_requests integer DEFAULT 0,
    total_processed_amount numeric(15,2) DEFAULT '0'::numeric,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.a2c_agents OWNER TO postgres;

--
-- Name: a2c_phone_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.a2c_phone_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    phone_number character varying(20) NOT NULL,
    network character varying(20) NOT NULL,
    daily_limit numeric(15,2) DEFAULT '500000'::numeric,
    used_today numeric(15,2) DEFAULT '0'::numeric,
    last_reset_date timestamp without time zone DEFAULT now(),
    priority integer DEFAULT 1,
    is_active boolean DEFAULT true,
    label character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.a2c_phone_inventory OWNER TO postgres;

--
-- Name: a2c_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.a2c_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_id character varying(20) NOT NULL,
    network character varying(20) NOT NULL,
    phone_number character varying(20) NOT NULL,
    airtime_amount numeric(10,2) NOT NULL,
    conversion_rate numeric(5,2) NOT NULL,
    cash_amount numeric(10,2) NOT NULL,
    inventory_id uuid,
    receiving_number character varying(20) NOT NULL,
    bank_name character varying(100),
    account_number character varying(20),
    account_name character varying(255),
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_agent_id uuid,
    assigned_at timestamp without time zone,
    user_confirmed_at timestamp without time zone,
    airtime_received_at timestamp without time zone,
    cash_paid_at timestamp without time zone,
    customer_notes text,
    agent_notes text,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.a2c_requests OWNER TO postgres;

--
-- Name: a2c_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.a2c_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id uuid,
    previous_status character varying(30),
    new_status character varying(30) NOT NULL,
    note text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.a2c_status_history OWNER TO postgres;

--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id character varying(100),
    details jsonb,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_activity_logs OWNER TO postgres;

--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    request_id character varying(100),
    user_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_notifications OWNER TO postgres;

--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_roles OWNER TO postgres;

--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying(255) NOT NULL,
    setting_value text,
    description text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_settings OWNER TO postgres;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id uuid,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: agent_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_type character varying(30) NOT NULL,
    agent_id uuid NOT NULL,
    channel_type character varying(20) DEFAULT 'whatsapp'::character varying NOT NULL,
    channel_value character varying(50) NOT NULL,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.agent_channels OWNER TO postgres;

--
-- Name: agent_internal_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_internal_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    from_type character varying(30) NOT NULL,
    from_id character varying(100) NOT NULL,
    from_name character varying(100) NOT NULL,
    to_department character varying(50) NOT NULL,
    message text NOT NULL,
    linked_order_id character varying(100),
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.agent_internal_messages OWNER TO postgres;

--
-- Name: agent_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_type character varying(30) NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid,
    request_type character varying(50) NOT NULL,
    request_id character varying(100) NOT NULL,
    template_name character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    attempts integer DEFAULT 0,
    last_attempt_at timestamp without time zone,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    error_message text,
    external_message_id character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.agent_notifications OWNER TO postgres;

--
-- Name: ai_knowledge_base; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    variations jsonb DEFAULT '[]'::jsonb,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    use_count integer DEFAULT 0,
    added_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_knowledge_base OWNER TO postgres;

--
-- Name: ai_unresolved_queries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_unresolved_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query text NOT NULL,
    conversation_id uuid,
    ticket_id uuid,
    is_resolved boolean DEFAULT false,
    resolved_answer text,
    resolved_kb_id uuid,
    resolved_at timestamp without time zone,
    resolved_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_unresolved_queries OWNER TO postgres;

--
-- Name: airtime_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.airtime_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    network character varying(50),
    phone_number character varying(20),
    amount numeric(10,2),
    type character varying(50),
    transaction_id character varying(100),
    status character varying(50),
    reference character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.airtime_services OWNER TO postgres;

--
-- Name: birth_attestations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.birth_attestations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name character varying(255),
    date_of_birth date,
    registration_number character varying(100),
    status character varying(50),
    certificate_data jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.birth_attestations OWNER TO postgres;

--
-- Name: bot_credentials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bot_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    username character varying(255),
    password_hash character varying(255),
    api_key character varying(500),
    auth_token character varying(1000),
    token_expiry timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bot_credentials OWNER TO postgres;

--
-- Name: bvn_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bvn_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    bvn character varying(11),
    phone character varying(20),
    service_type character varying(50),
    request_id character varying(100),
    status character varying(50),
    response_data jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bvn_services OWNER TO postgres;

--
-- Name: bvn_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bvn_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bvn character varying(11) NOT NULL,
    reference character varying(100) NOT NULL,
    verification_data jsonb,
    pdf_key character varying(500),
    status character varying(50) DEFAULT 'completed'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bvn_verifications OWNER TO postgres;

--
-- Name: cable_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cable_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    provider character varying(100),
    smartcard_number character varying(50),
    package character varying(100),
    amount numeric(10,2),
    transaction_id character varying(100),
    status character varying(50),
    reference character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cable_services OWNER TO postgres;

--
-- Name: cac_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    employee_id character varying(50),
    specializations jsonb DEFAULT '[]'::jsonb,
    max_active_requests integer DEFAULT 10,
    current_active_requests integer DEFAULT 0,
    total_completed_requests integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_agents OWNER TO postgres;

--
-- Name: cac_business_natures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_business_natures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_business_natures OWNER TO postgres;

--
-- Name: cac_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cac_request_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_key character varying(500) NOT NULL,
    file_size integer,
    is_result boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_files OWNER TO postgres;

--
-- Name: cac_registration_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_registration_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    service_type_id uuid,
    service_type character varying(100) NOT NULL,
    business_name character varying(255) NOT NULL,
    business_nature character varying(255),
    business_address text,
    business_state character varying(100),
    business_lga character varying(100),
    proprietor_name character varying(255),
    proprietor_phone character varying(20),
    proprietor_email character varying(255),
    proprietor_nin character varying(11),
    additional_proprietors jsonb DEFAULT '[]'::jsonb,
    share_capital numeric(15,2),
    objectives text,
    passport_photo_url text,
    signature_url text,
    nin_slip_url text,
    status character varying(50) DEFAULT 'submitted'::character varying,
    assigned_agent_id uuid,
    assigned_at timestamp without time zone,
    fee numeric(10,2) NOT NULL,
    is_paid boolean DEFAULT false,
    payment_reference character varying(100),
    cac_registration_number character varying(100),
    certificate_url text,
    rejection_reason text,
    customer_notes text,
    agent_notes text,
    submitted_to_cac_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_registration_requests OWNER TO postgres;

--
-- Name: cac_request_activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_request_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id uuid,
    action character varying(100) NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    comment text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_request_activity OWNER TO postgres;

--
-- Name: cac_request_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_request_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    document_type character varying(100) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    mime_type character varying(100),
    checksum character varying(64),
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp without time zone,
    version integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_request_documents OWNER TO postgres;

--
-- Name: cac_request_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_request_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    sender_type character varying(20) NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    file_url text,
    file_name character varying(255),
    file_type character varying(100),
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_request_messages OWNER TO postgres;

--
-- Name: cac_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agent_id uuid,
    business_name character varying(255) NOT NULL,
    business_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    reference character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


ALTER TABLE public.cac_requests OWNER TO postgres;

--
-- Name: cac_service_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cac_service_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    processing_days integer DEFAULT 7,
    required_documents jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cac_service_types OWNER TO postgres;

--
-- Name: data_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    network character varying(50),
    phone_number character varying(20),
    plan_name character varying(100),
    amount numeric(10,2),
    type character varying(50),
    transaction_id character varying(100),
    status character varying(50),
    reference character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.data_services OWNER TO postgres;

--
-- Name: developer_api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    developer_id uuid NOT NULL,
    key_name character varying(100) NOT NULL,
    api_key character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp without time zone,
    total_requests integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.developer_api_keys OWNER TO postgres;

--
-- Name: developer_api_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    developer_id uuid NOT NULL,
    api_key_id uuid,
    endpoint character varying(255),
    method character varying(10),
    request_body jsonb,
    response_body jsonb,
    status_code integer,
    cost numeric(10,2) DEFAULT 0,
    duration_ms integer,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.developer_api_logs OWNER TO postgres;

--
-- Name: developer_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    developer_id uuid NOT NULL,
    transaction_type character varying(50),
    amount numeric(15,2),
    description text,
    reference_id character varying(100),
    status character varying(50) DEFAULT 'successful'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.developer_transactions OWNER TO postgres;

--
-- Name: developer_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    company character varying(255),
    password_hash character varying(255) NOT NULL,
    wallet_balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    webhook_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    account_type character varying(50) DEFAULT 'individual'::character varying,
    kyc_status character varying(50) DEFAULT 'not_required'::character varying,
    kyc_documents jsonb,
    kyc_submitted_at timestamp without time zone,
    kyc_reviewed_at timestamp without time zone,
    kyc_review_note text
);


ALTER TABLE public.developer_users OWNER TO postgres;

--
-- Name: education_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.education_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    employee_id character varying(50),
    specializations jsonb DEFAULT '["jamb", "waec", "neco"]'::jsonb,
    max_active_requests integer DEFAULT 20,
    current_active_requests integer DEFAULT 0,
    total_completed_requests integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.education_agents OWNER TO postgres;

--
-- Name: education_pin_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.education_pin_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    exam_type character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    pin_id uuid,
    payment_reference character varying(100),
    delivered_pin character varying(100),
    delivered_serial character varying(100),
    failure_reason text,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


ALTER TABLE public.education_pin_orders OWNER TO postgres;

--
-- Name: education_pins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.education_pins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_type character varying(20) NOT NULL,
    pin_code character varying(100) NOT NULL,
    serial_number character varying(100),
    status character varying(20) DEFAULT 'unused'::character varying NOT NULL,
    used_by_order_id uuid,
    used_by_user_id uuid,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.education_pins OWNER TO postgres;

--
-- Name: education_request_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.education_request_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    uploader_role character varying(20) NOT NULL,
    file_type character varying(100),
    file_name character varying(255),
    file_key character varying(500) NOT NULL,
    is_result boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.education_request_documents OWNER TO postgres;

--
-- Name: education_service_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.education_service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_id character varying(20) NOT NULL,
    service_type character varying(50) NOT NULL,
    exam_year character varying(10),
    registration_number character varying(50),
    candidate_name character varying(255),
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_agent_id uuid,
    assigned_at timestamp without time zone,
    fee numeric(10,2) NOT NULL,
    is_paid boolean DEFAULT false,
    payment_reference character varying(100),
    result_data jsonb,
    result_url character varying(500),
    customer_notes text,
    agent_notes text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.education_service_requests OWNER TO postgres;

--
-- Name: education_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.education_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    job_id uuid,
    service_type character varying(100) NOT NULL,
    exam_year integer,
    registration_number character varying(100),
    status character varying(50),
    result_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.education_services OWNER TO postgres;

--
-- Name: electricity_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.electricity_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    disco_name character varying(100),
    meter_number character varying(50),
    amount numeric(10,2),
    transaction_id character varying(100),
    status character varying(50),
    reference character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.electricity_services OWNER TO postgres;

--
-- Name: fraud_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fraud_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    resolved_by_id uuid,
    resolved_at timestamp without time zone,
    resolved_note text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.fraud_alerts OWNER TO postgres;

--
-- Name: identity_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    employee_id character varying(50),
    specializations jsonb DEFAULT '["nin_validation", "ipe_clearance", "nin_personalization"]'::jsonb,
    max_active_requests integer DEFAULT 20,
    current_active_requests integer DEFAULT 0,
    total_completed_requests integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.identity_agents OWNER TO postgres;

--
-- Name: identity_request_activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_request_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id uuid,
    action character varying(100) NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    comment text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.identity_request_activity OWNER TO postgres;

--
-- Name: identity_service_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_id character varying(20) NOT NULL,
    service_type character varying(50) NOT NULL,
    nin character varying(11),
    new_tracking_id character varying(50),
    update_fields jsonb,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_agent_id uuid,
    assigned_at timestamp without time zone,
    fee numeric(10,2) NOT NULL,
    is_paid boolean DEFAULT false,
    payment_reference character varying(100),
    slip_url character varying(500),
    resolved_tracking_id character varying(100),
    result_data jsonb,
    customer_notes text,
    agent_notes text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    validated_full_name character varying(200),
    validated_date_of_birth character varying(50)
);


ALTER TABLE public.identity_service_requests OWNER TO postgres;

--
-- Name: identity_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    verification_type character varying(100),
    nin character varying(11),
    phone character varying(20),
    second_enrollment_id character varying(100),
    status character varying(50),
    verification_data jsonb,
    slip_html text,
    slip_type character varying(50),
    slip_reference character varying(100),
    reference character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.identity_verifications OWNER TO postgres;

--
-- Name: jamb_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jamb_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    employee_id character varying(50),
    specializations jsonb DEFAULT '["olevel-upload", "admission-letter", "original-result", "pin-vending", "reprinting-caps"]'::jsonb,
    max_active_requests integer DEFAULT 20,
    current_active_requests integer DEFAULT 0,
    total_completed_requests integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.jamb_agents OWNER TO postgres;

--
-- Name: jamb_request_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jamb_request_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    uploader_role character varying(20) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_key character varying(500) NOT NULL,
    file_size integer,
    is_result boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.jamb_request_documents OWNER TO postgres;

--
-- Name: jamb_service_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jamb_service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_id character varying(20) NOT NULL,
    service_type character varying(50) NOT NULL,
    registration_number character varying(50),
    candidate_name character varying(255),
    exam_year character varying(10),
    request_data jsonb,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_agent_id uuid,
    assigned_at timestamp without time zone,
    fee numeric(10,2) NOT NULL,
    is_paid boolean DEFAULT false,
    payment_reference character varying(100),
    result_data jsonb,
    result_url character varying(500),
    customer_notes text,
    agent_notes text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.jamb_service_requests OWNER TO postgres;

--
-- Name: nbais_schools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nbais_schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state character varying(100) NOT NULL,
    school_name character varying(500) NOT NULL,
    school_value character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nbais_schools OWNER TO postgres;

--
-- Name: nin_slips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nin_slips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    slip_reference character varying(100) NOT NULL,
    slip_type character varying(50) NOT NULL,
    nin character varying(11) NOT NULL,
    surname character varying(255) NOT NULL,
    firstname character varying(255) NOT NULL,
    middlename character varying(255),
    date_of_birth character varying(50) NOT NULL,
    gender character varying(20),
    photo text,
    tracking_id character varying(100),
    verification_reference character varying(100),
    verification_status character varying(50) DEFAULT 'verified'::character varying,
    pdf_path character varying(500),
    pdf_data text,
    qr_code_data text,
    is_public boolean DEFAULT true,
    download_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nin_slips OWNER TO postgres;

--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    otp_code character varying(6) NOT NULL,
    purpose character varying(50) DEFAULT 'registration'::character varying,
    is_used boolean DEFAULT false,
    attempts integer DEFAULT 0,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.otp_verifications OWNER TO postgres;

--
-- Name: rpa_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rpa_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    service_type character varying(100) NOT NULL,
    query_data jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    result jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    priority integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.rpa_jobs OWNER TO postgres;

--
-- Name: scraped_data_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scraped_data_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    network character varying(50) NOT NULL,
    plan_id character varying(100) NOT NULL,
    plan_name character varying(255) NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    reseller_price numeric(10,2) DEFAULT '0'::numeric,
    is_active boolean DEFAULT true,
    last_scraped_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.scraped_data_plans OWNER TO postgres;

--
-- Name: service_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_type character varying(100) NOT NULL,
    service_name character varying(255) NOT NULL,
    cost_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    price numeric(10,2) NOT NULL,
    markup numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.service_pricing OWNER TO postgres;

--
-- Name: shared_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shared_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by_user_id uuid,
    uploaded_by_agent_id uuid,
    uploader_role character varying(20) NOT NULL,
    file_key character varying(500) NOT NULL,
    file_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer,
    related_request_id character varying(100),
    related_request_type character varying(50),
    accessible_to character varying(20) DEFAULT 'all'::character varying,
    description text,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    share_token character varying(64),
    share_token_expires_at timestamp without time zone
);


ALTER TABLE public.shared_files OWNER TO postgres;

--
-- Name: support_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    closed_reason character varying(50),
    last_message_at timestamp without time zone DEFAULT now(),
    summary text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_conversations OWNER TO postgres;

--
-- Name: support_internal_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_internal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_internal_notes OWNER TO postgres;

--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_type character varying(20) NOT NULL,
    sender_id uuid,
    sender_name character varying(100),
    content text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_messages OWNER TO postgres;

--
-- Name: support_presence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    participant_type character varying(10) NOT NULL,
    participant_name character varying(100),
    is_online boolean DEFAULT false,
    is_typing boolean DEFAULT false,
    last_seen_at timestamp without time zone DEFAULT now(),
    typing_at timestamp without time zone
);


ALTER TABLE public.support_presence OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_id character varying(20) NOT NULL,
    user_id uuid NOT NULL,
    subject character varying(255) DEFAULT 'General Support'::character varying NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    assigned_agent_id uuid,
    department_tag character varying(50),
    linked_order_id character varying(100),
    linked_order_type character varying(30),
    escalated_at timestamp without time zone,
    assigned_at timestamp without time zone,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    last_activity_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    transaction_type character varying(50),
    amount numeric(15,2),
    payment_method character varying(50),
    reference_id character varying(100),
    status character varying(50),
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    password_hash character varying(255),
    wallet_balance numeric(15,2) DEFAULT '0'::numeric,
    bvn character varying(11),
    nin character varying(11),
    kyc_status character varying(50) DEFAULT 'pending'::character varying,
    email_verified boolean DEFAULT false,
    is_suspended boolean DEFAULT false,
    suspended_at timestamp without time zone,
    suspend_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: virtual_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.virtual_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    paystack_customer_id character varying(100),
    paystack_customer_code character varying(100),
    dedicated_account_id character varying(100),
    bank_name character varying(100),
    bank_code character varying(20),
    account_number character varying(20),
    account_name character varying(255),
    provider_slug character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.virtual_accounts OWNER TO postgres;

--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    template_content text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    category character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    meta_template_id character varying(100),
    meta_status character varying(30),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_templates OWNER TO postgres;

--
-- Data for Name: a2c_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.a2c_agents (id, admin_user_id, employee_id, supported_networks, max_active_requests, current_active_requests, total_completed_requests, total_processed_amount, is_available, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: a2c_phone_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.a2c_phone_inventory (id, agent_id, phone_number, network, daily_limit, used_today, last_reset_date, priority, is_active, label, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: a2c_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.a2c_requests (id, user_id, tracking_id, network, phone_number, airtime_amount, conversion_rate, cash_amount, inventory_id, receiving_number, bank_name, account_number, account_name, status, assigned_agent_id, assigned_at, user_confirmed_at, airtime_received_at, cash_paid_at, customer_notes, agent_notes, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: a2c_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.a2c_status_history (id, request_id, actor_type, actor_id, previous_status, new_status, note, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: admin_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_activity_logs (id, admin_id, action, resource_type, resource_id, details, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: admin_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_notifications (id, type, title, message, request_id, user_id, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_roles (id, name, description, permissions, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_settings (id, setting_key, setting_value, description, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, email, name, password_hash, role_id, is_active, last_login, created_at, updated_at) FROM stdin;
fd3a5e2f-95b2-47da-b382-71f8770e977c	saidumuhammed664@gmail.com	Super Admin	$2b$12$qaSOupdNhwy0r/h36CN1VuAgDFADKguOqxoo8g2Xw0jS5w6tcUyzy	\N	t	\N	2026-03-29 01:36:59.270369	2026-03-29 01:36:59.270369
\.


--
-- Data for Name: agent_channels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_channels (id, agent_type, agent_id, channel_type, channel_value, is_verified, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agent_internal_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_internal_messages (id, ticket_id, from_type, from_id, from_name, to_department, message, linked_order_id, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: agent_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_notifications (id, agent_type, agent_id, user_id, request_type, request_id, template_name, payload, status, attempts, last_attempt_at, sent_at, delivered_at, read_at, error_message, external_message_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_knowledge_base; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_knowledge_base (id, question, variations, answer, category, tags, is_active, use_count, added_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_unresolved_queries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_unresolved_queries (id, query, conversation_id, ticket_id, is_resolved, resolved_answer, resolved_kb_id, resolved_at, resolved_by, created_at) FROM stdin;
\.


--
-- Data for Name: airtime_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.airtime_services (id, user_id, network, phone_number, amount, type, transaction_id, status, reference, created_at) FROM stdin;
\.


--
-- Data for Name: birth_attestations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.birth_attestations (id, user_id, full_name, date_of_birth, registration_number, status, certificate_data, created_at) FROM stdin;
\.


--
-- Data for Name: bot_credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bot_credentials (id, service_name, username, password_hash, api_key, auth_token, token_expiry, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bvn_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bvn_services (id, user_id, bvn, phone, service_type, request_id, status, response_data, created_at) FROM stdin;
\.


--
-- Data for Name: bvn_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bvn_verifications (id, user_id, bvn, reference, verification_data, pdf_key, status, created_at) FROM stdin;
\.


--
-- Data for Name: cable_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cable_services (id, user_id, provider, smartcard_number, package, amount, transaction_id, status, reference, created_at) FROM stdin;
\.


--
-- Data for Name: cac_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_agents (id, admin_user_id, employee_id, specializations, max_active_requests, current_active_requests, total_completed_requests, is_available, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cac_business_natures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_business_natures (id, code, name, category, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: cac_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_files (id, cac_request_id, uploaded_by, file_type, file_name, file_key, file_size, is_result, created_at) FROM stdin;
\.


--
-- Data for Name: cac_registration_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_registration_requests (id, user_id, service_type_id, service_type, business_name, business_nature, business_address, business_state, business_lga, proprietor_name, proprietor_phone, proprietor_email, proprietor_nin, additional_proprietors, share_capital, objectives, passport_photo_url, signature_url, nin_slip_url, status, assigned_agent_id, assigned_at, fee, is_paid, payment_reference, cac_registration_number, certificate_url, rejection_reason, customer_notes, agent_notes, submitted_to_cac_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cac_request_activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_request_activity (id, request_id, actor_type, actor_id, action, previous_status, new_status, comment, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: cac_request_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_request_documents (id, request_id, document_type, file_name, file_url, file_size, mime_type, checksum, is_verified, verified_by, verified_at, version, created_at) FROM stdin;
\.


--
-- Data for Name: cac_request_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_request_messages (id, request_id, sender_type, sender_id, message, attachments, file_url, file_name, file_type, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: cac_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_requests (id, user_id, agent_id, business_name, business_type, status, reference, created_at, updated_at, completed_at) FROM stdin;
\.


--
-- Data for Name: cac_service_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cac_service_types (id, code, name, description, price, processing_days, required_documents, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: data_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_services (id, user_id, network, phone_number, plan_name, amount, type, transaction_id, status, reference, created_at) FROM stdin;
\.


--
-- Data for Name: developer_api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.developer_api_keys (id, developer_id, key_name, api_key, is_active, last_used_at, total_requests, created_at) FROM stdin;
\.


--
-- Data for Name: developer_api_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.developer_api_logs (id, developer_id, api_key_id, endpoint, method, request_body, response_body, status_code, cost, duration_ms, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: developer_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.developer_transactions (id, developer_id, transaction_type, amount, description, reference_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: developer_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.developer_users (id, email, name, company, password_hash, wallet_balance, is_active, email_verified, webhook_url, created_at, updated_at, account_type, kyc_status, kyc_documents, kyc_submitted_at, kyc_reviewed_at, kyc_review_note) FROM stdin;
c885bc94-90e7-4d43-8bdd-4c3b4caa72df	test@arapoint.dev	Test Dev	TestCo	$2b$10$dSxWo.NxP5IwKyoHKpuQEO.X.YrwpgUGQ0eAqXxbsFGt.TXG/Rtvu	0.00	t	f	\N	2026-04-02 23:28:18.071771	2026-04-02 23:28:18.071771	individual	not_required	\N	\N	\N	\N
\.


--
-- Data for Name: education_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.education_agents (id, admin_user_id, employee_id, specializations, max_active_requests, current_active_requests, total_completed_requests, is_available, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: education_pin_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.education_pin_orders (id, user_id, exam_type, amount, status, pin_id, payment_reference, delivered_pin, delivered_serial, failure_reason, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: education_pins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.education_pins (id, exam_type, pin_code, serial_number, status, used_by_order_id, used_by_user_id, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: education_request_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.education_request_documents (id, request_id, uploaded_by, uploader_role, file_type, file_name, file_key, is_result, created_at) FROM stdin;
\.


--
-- Data for Name: education_service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.education_service_requests (id, user_id, tracking_id, service_type, exam_year, registration_number, candidate_name, status, assigned_agent_id, assigned_at, fee, is_paid, payment_reference, result_data, result_url, customer_notes, agent_notes, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: education_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.education_services (id, user_id, job_id, service_type, exam_year, registration_number, status, result_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: electricity_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.electricity_services (id, user_id, disco_name, meter_number, amount, transaction_id, status, reference, created_at) FROM stdin;
\.


--
-- Data for Name: fraud_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fraud_alerts (id, user_id, alert_type, severity, description, metadata, status, resolved_by_id, resolved_at, resolved_note, created_at) FROM stdin;
\.


--
-- Data for Name: identity_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.identity_agents (id, admin_user_id, employee_id, specializations, max_active_requests, current_active_requests, total_completed_requests, is_available, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: identity_request_activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.identity_request_activity (id, request_id, actor_type, actor_id, action, previous_status, new_status, comment, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: identity_service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.identity_service_requests (id, user_id, tracking_id, service_type, nin, new_tracking_id, update_fields, status, assigned_agent_id, assigned_at, fee, is_paid, payment_reference, slip_url, resolved_tracking_id, result_data, customer_notes, agent_notes, completed_at, created_at, updated_at, validated_full_name, validated_date_of_birth) FROM stdin;
\.


--
-- Data for Name: identity_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.identity_verifications (id, user_id, verification_type, nin, phone, second_enrollment_id, status, verification_data, slip_html, slip_type, slip_reference, reference, created_at) FROM stdin;
\.


--
-- Data for Name: jamb_agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jamb_agents (id, admin_user_id, employee_id, specializations, max_active_requests, current_active_requests, total_completed_requests, is_available, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jamb_request_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jamb_request_documents (id, request_id, uploaded_by, uploader_role, file_type, file_name, file_key, file_size, is_result, created_at) FROM stdin;
\.


--
-- Data for Name: jamb_service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jamb_service_requests (id, user_id, tracking_id, service_type, registration_number, candidate_name, exam_year, request_data, status, assigned_agent_id, assigned_at, fee, is_paid, payment_reference, result_data, result_url, customer_notes, agent_notes, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nbais_schools; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nbais_schools (id, state, school_name, school_value, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nin_slips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nin_slips (id, user_id, slip_reference, slip_type, nin, surname, firstname, middlename, date_of_birth, gender, photo, tracking_id, verification_reference, verification_status, pdf_path, pdf_data, qr_code_data, is_public, download_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: otp_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otp_verifications (id, email, otp_code, purpose, is_used, attempts, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: rpa_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rpa_jobs (id, user_id, service_type, query_data, status, result, error_message, retry_count, max_retries, priority, created_at, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: scraped_data_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scraped_data_plans (id, network, plan_id, plan_name, cost_price, selling_price, reseller_price, is_active, last_scraped_at) FROM stdin;
\.


--
-- Data for Name: service_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_pricing (id, service_type, service_name, cost_price, price, markup, description, is_active, created_at, updated_at) FROM stdin;
21211768-342a-4d4f-83a7-cb9cd67ab623	nin_slip_information	NIN Slip Information	0.00	150.00	0.00	Get NIN slip information only	t	2026-03-29 01:36:58.858084	2026-03-29 01:36:58.858084
5417f77c-5162-4c6c-bcc6-3f26a9c42ca5	nin_slip_regular	NIN Slip Regular	0.00	180.00	0.00	Regular NIN slip printing	t	2026-03-29 01:36:58.863252	2026-03-29 01:36:58.863252
e17dad0d-40be-4dba-9c9f-0595338efe02	nin_slip_standard	NIN Slip Standard	0.00	180.00	0.00	Standard NIN slip with enhanced features	t	2026-03-29 01:36:58.865959	2026-03-29 01:36:58.865959
2d46c2b4-f940-401a-a04a-5d8680a9c231	nin_slip_premium	NIN Slip Premium	0.00	200.00	0.00	Premium NIN slip with all features	t	2026-03-29 01:36:58.869179	2026-03-29 01:36:58.869179
4a683cbd-5508-4905-a595-baf38275a043	nin_phone	NIN By Phone	0.00	180.00	0.00	Retrieve NIN using phone number	t	2026-03-29 01:36:58.872138	2026-03-29 01:36:58.872138
4d6bf607-e765-42e8-a03d-91ef3e9a5c3c	nin_tracking	NIN With Tracking ID	0.00	250.00	0.00	Verify NIN using NIMC tracking ID	t	2026-03-29 01:36:58.874771	2026-03-29 01:36:58.874771
58d5e290-579b-4442-8061-748196c5624c	bvn_verification	BVN Verification	0.00	200.00	0.00	Download your BVN slip	t	2026-03-29 01:36:58.877554	2026-03-29 01:36:58.877554
a540b75c-9607-4c9d-81d3-8f79c4b0ba43	ipe_clearance	IPE Clearance	0.00	1000.00	0.00	Clear IPE errors and enrollment issues	t	2026-03-29 01:36:58.880034	2026-03-29 01:36:58.880034
b49fe12e-62b1-4062-9938-4bb19ec21d45	validation_nin	NIN Validation	0.00	1000.00	0.00	Record validation and corrections	t	2026-03-29 01:36:58.882643	2026-03-29 01:36:58.882643
fdede6e6-8393-4857-95d1-de756c93af65	jamb_result	JAMB Result	0.00	500.00	0.00	Check JAMB examination results	t	2026-03-29 01:36:58.885598	2026-03-29 01:36:58.885598
915a9b44-b771-46d2-9865-08c4527cbebb	waec_result	WAEC Result	0.00	500.00	0.00	Check WAEC examination results	t	2026-03-29 01:36:58.888724	2026-03-29 01:36:58.888724
3a07fc03-7018-44f6-93d2-8fd8c8d1dfe1	waec_scratch_card	WAEC Scratch Card	0.00	4000.00	0.00	Buy WAEC result checker scratch card	t	2026-03-29 01:36:58.891442	2026-03-29 01:36:58.891442
6d057732-1635-481b-8b8a-1d32ceb0e559	neco_result	NECO Result	0.00	500.00	0.00	Check NECO examination results	t	2026-03-29 01:36:58.893856	2026-03-29 01:36:58.893856
4c374680-0112-4359-81c2-2849c038d0f5	neco_scratch_card	NECO Scratch Card	0.00	1500.00	0.00	Buy NECO result checker scratch card	t	2026-03-29 01:36:58.896447	2026-03-29 01:36:58.896447
92530357-0655-4b00-af89-6e73c0863e97	nabteb_result	NABTEB Result	0.00	500.00	0.00	Check NABTEB examination results	t	2026-03-29 01:36:58.898922	2026-03-29 01:36:58.898922
ee86f3d7-62f9-4787-9f73-6cdd11299f74	nbais_result	NBAIS Result	0.00	500.00	0.00	Check NBAIS examination results	t	2026-03-29 01:36:58.901412	2026-03-29 01:36:58.901412
5b13f580-73ba-4c72-a4cc-f3615b71ca28	cac_business_name	CAC Business Name	0.00	25000.00	0.00	Register business name with CAC	t	2026-03-29 01:36:58.904096	2026-03-29 01:36:58.904096
632e3544-8942-4c91-a7ac-5c77c3d9b254	cac_limited_company	CAC Limited Company	0.00	35000.00	0.00	Register limited liability company	t	2026-03-29 01:36:58.906608	2026-03-29 01:36:58.906608
920b0341-8be6-4c50-9d40-3a9c6d5d03f6	cac_incorporated_trustees	CAC Incorporated Trustees	0.00	55000.00	0.00	Register incorporated trustees/NGO	t	2026-03-29 01:36:58.909682	2026-03-29 01:36:58.909682
71a14c41-ca20-423d-9e9d-77edc2904ab4	airtime_to_cash	Airtime to Cash	0.00	0.00	0.00	Convert airtime to wallet balance	t	2026-03-29 01:36:58.912231	2026-03-29 01:36:58.912231
a0b7368e-01d1-46a8-aeb5-49aa6f957d48	nin_personalization	NIN Personalization	0.00	1500.00	0.00	Customize NIN identity data	t	2026-03-29 01:36:58.914711	2026-03-29 01:36:58.914711
73ffe03b-1557-47ce-9c7e-8d80fbf75538	birth_attestation	Birth Attestation	0.00	2000.00	0.00	NPC Birth Certificate attestation	t	2026-03-29 01:36:58.91745	2026-03-29 01:36:58.91745
c553cfa5-b7a2-4ddd-8733-13ca56b0be15	waec_pin	WAEC PIN	0.00	4000.00	0.00	WAEC examination PIN - Instant Delivery	t	2026-03-29 01:36:58.920044	2026-03-29 01:36:58.920044
a307d0b8-e663-4364-886a-b55b92b50b3b	neco_pin	NECO PIN	0.00	1500.00	0.00	NECO examination PIN - Instant Delivery	t	2026-03-29 01:36:58.922701	2026-03-29 01:36:58.922701
1a0cbab0-eef5-4e07-8b06-a3453f6f0549	nabteb_pin	NABTEB PIN	0.00	3000.00	0.00	NABTEB examination PIN - Instant Delivery	t	2026-03-29 01:36:58.925262	2026-03-29 01:36:58.925262
e390917a-cc02-4fda-898e-bb826ad4b3ce	nbais_pin	NBAIS PIN	0.00	2500.00	0.00	NBAIS examination PIN - Instant Delivery	t	2026-03-29 01:36:58.927788	2026-03-29 01:36:58.927788
\.


--
-- Data for Name: shared_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shared_files (id, uploaded_by_user_id, uploaded_by_agent_id, uploader_role, file_key, file_name, mime_type, file_size, related_request_id, related_request_type, accessible_to, description, is_deleted, created_at, share_token, share_token_expires_at) FROM stdin;
\.


--
-- Data for Name: support_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_conversations (id, ticket_id, is_active, closed_reason, last_message_at, summary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: support_internal_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_internal_notes (id, ticket_id, agent_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_messages (id, conversation_id, sender_type, sender_id, sender_name, content, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: support_presence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_presence (id, ticket_id, participant_id, participant_type, participant_name, is_online, is_typing, last_seen_at, typing_at) FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, reference_id, user_id, subject, category, status, priority, assigned_agent_id, department_tag, linked_order_id, linked_order_type, escalated_at, assigned_at, resolved_at, closed_at, last_activity_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, transaction_type, amount, payment_method, reference_id, status, description, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, name, phone, password_hash, wallet_balance, bvn, nin, kyc_status, email_verified, is_suspended, suspended_at, suspend_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: virtual_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.virtual_accounts (id, user_id, paystack_customer_id, paystack_customer_code, dedicated_account_id, bank_name, bank_code, account_number, account_name, provider_slug, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: whatsapp_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.whatsapp_templates (id, template_name, display_name, description, template_content, variables, category, is_active, meta_template_id, meta_status, created_at, updated_at) FROM stdin;
\.


--
-- Name: a2c_agents a2c_agents_admin_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_agents
    ADD CONSTRAINT a2c_agents_admin_user_id_unique UNIQUE (admin_user_id);


--
-- Name: a2c_agents a2c_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_agents
    ADD CONSTRAINT a2c_agents_pkey PRIMARY KEY (id);


--
-- Name: a2c_phone_inventory a2c_phone_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_phone_inventory
    ADD CONSTRAINT a2c_phone_inventory_pkey PRIMARY KEY (id);


--
-- Name: a2c_requests a2c_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_requests
    ADD CONSTRAINT a2c_requests_pkey PRIMARY KEY (id);


--
-- Name: a2c_requests a2c_requests_tracking_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_requests
    ADD CONSTRAINT a2c_requests_tracking_id_unique UNIQUE (tracking_id);


--
-- Name: a2c_status_history a2c_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_status_history
    ADD CONSTRAINT a2c_status_history_pkey PRIMARY KEY (id);


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_name_unique UNIQUE (name);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_setting_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_setting_key_unique UNIQUE (setting_key);


--
-- Name: admin_users admin_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_unique UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: agent_channels agent_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_channels
    ADD CONSTRAINT agent_channels_pkey PRIMARY KEY (id);


--
-- Name: agent_internal_messages agent_internal_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_internal_messages
    ADD CONSTRAINT agent_internal_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_notifications agent_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_notifications
    ADD CONSTRAINT agent_notifications_pkey PRIMARY KEY (id);


--
-- Name: ai_knowledge_base ai_knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_knowledge_base
    ADD CONSTRAINT ai_knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: ai_unresolved_queries ai_unresolved_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_unresolved_queries
    ADD CONSTRAINT ai_unresolved_queries_pkey PRIMARY KEY (id);


--
-- Name: airtime_services airtime_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airtime_services
    ADD CONSTRAINT airtime_services_pkey PRIMARY KEY (id);


--
-- Name: airtime_services airtime_services_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airtime_services
    ADD CONSTRAINT airtime_services_transaction_id_unique UNIQUE (transaction_id);


--
-- Name: birth_attestations birth_attestations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.birth_attestations
    ADD CONSTRAINT birth_attestations_pkey PRIMARY KEY (id);


--
-- Name: bot_credentials bot_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_credentials
    ADD CONSTRAINT bot_credentials_pkey PRIMARY KEY (id);


--
-- Name: bot_credentials bot_credentials_service_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_credentials
    ADD CONSTRAINT bot_credentials_service_name_unique UNIQUE (service_name);


--
-- Name: bvn_services bvn_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bvn_services
    ADD CONSTRAINT bvn_services_pkey PRIMARY KEY (id);


--
-- Name: bvn_services bvn_services_request_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bvn_services
    ADD CONSTRAINT bvn_services_request_id_unique UNIQUE (request_id);


--
-- Name: bvn_verifications bvn_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bvn_verifications
    ADD CONSTRAINT bvn_verifications_pkey PRIMARY KEY (id);


--
-- Name: bvn_verifications bvn_verifications_reference_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bvn_verifications
    ADD CONSTRAINT bvn_verifications_reference_unique UNIQUE (reference);


--
-- Name: cable_services cable_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cable_services
    ADD CONSTRAINT cable_services_pkey PRIMARY KEY (id);


--
-- Name: cable_services cable_services_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cable_services
    ADD CONSTRAINT cable_services_transaction_id_unique UNIQUE (transaction_id);


--
-- Name: cac_agents cac_agents_admin_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_agents
    ADD CONSTRAINT cac_agents_admin_user_id_unique UNIQUE (admin_user_id);


--
-- Name: cac_agents cac_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_agents
    ADD CONSTRAINT cac_agents_pkey PRIMARY KEY (id);


--
-- Name: cac_business_natures cac_business_natures_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_business_natures
    ADD CONSTRAINT cac_business_natures_code_unique UNIQUE (code);


--
-- Name: cac_business_natures cac_business_natures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_business_natures
    ADD CONSTRAINT cac_business_natures_pkey PRIMARY KEY (id);


--
-- Name: cac_files cac_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_files
    ADD CONSTRAINT cac_files_pkey PRIMARY KEY (id);


--
-- Name: cac_registration_requests cac_registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_registration_requests
    ADD CONSTRAINT cac_registration_requests_pkey PRIMARY KEY (id);


--
-- Name: cac_request_activity cac_request_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_activity
    ADD CONSTRAINT cac_request_activity_pkey PRIMARY KEY (id);


--
-- Name: cac_request_documents cac_request_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_documents
    ADD CONSTRAINT cac_request_documents_pkey PRIMARY KEY (id);


--
-- Name: cac_request_messages cac_request_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_messages
    ADD CONSTRAINT cac_request_messages_pkey PRIMARY KEY (id);


--
-- Name: cac_requests cac_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_requests
    ADD CONSTRAINT cac_requests_pkey PRIMARY KEY (id);


--
-- Name: cac_requests cac_requests_reference_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_requests
    ADD CONSTRAINT cac_requests_reference_unique UNIQUE (reference);


--
-- Name: cac_service_types cac_service_types_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_service_types
    ADD CONSTRAINT cac_service_types_code_unique UNIQUE (code);


--
-- Name: cac_service_types cac_service_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_service_types
    ADD CONSTRAINT cac_service_types_pkey PRIMARY KEY (id);


--
-- Name: data_services data_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_services
    ADD CONSTRAINT data_services_pkey PRIMARY KEY (id);


--
-- Name: data_services data_services_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_services
    ADD CONSTRAINT data_services_transaction_id_unique UNIQUE (transaction_id);


--
-- Name: developer_api_keys developer_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_keys
    ADD CONSTRAINT developer_api_keys_api_key_key UNIQUE (api_key);


--
-- Name: developer_api_keys developer_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_keys
    ADD CONSTRAINT developer_api_keys_pkey PRIMARY KEY (id);


--
-- Name: developer_api_logs developer_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_logs
    ADD CONSTRAINT developer_api_logs_pkey PRIMARY KEY (id);


--
-- Name: developer_transactions developer_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_transactions
    ADD CONSTRAINT developer_transactions_pkey PRIMARY KEY (id);


--
-- Name: developer_users developer_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_users
    ADD CONSTRAINT developer_users_email_key UNIQUE (email);


--
-- Name: developer_users developer_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_users
    ADD CONSTRAINT developer_users_pkey PRIMARY KEY (id);


--
-- Name: education_agents education_agents_admin_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_agents
    ADD CONSTRAINT education_agents_admin_user_id_unique UNIQUE (admin_user_id);


--
-- Name: education_agents education_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_agents
    ADD CONSTRAINT education_agents_pkey PRIMARY KEY (id);


--
-- Name: education_pin_orders education_pin_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_pin_orders
    ADD CONSTRAINT education_pin_orders_pkey PRIMARY KEY (id);


--
-- Name: education_pins education_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_pins
    ADD CONSTRAINT education_pins_pkey PRIMARY KEY (id);


--
-- Name: education_request_documents education_request_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_request_documents
    ADD CONSTRAINT education_request_documents_pkey PRIMARY KEY (id);


--
-- Name: education_service_requests education_service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_service_requests
    ADD CONSTRAINT education_service_requests_pkey PRIMARY KEY (id);


--
-- Name: education_service_requests education_service_requests_tracking_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_service_requests
    ADD CONSTRAINT education_service_requests_tracking_id_unique UNIQUE (tracking_id);


--
-- Name: education_services education_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_services
    ADD CONSTRAINT education_services_pkey PRIMARY KEY (id);


--
-- Name: electricity_services electricity_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_services
    ADD CONSTRAINT electricity_services_pkey PRIMARY KEY (id);


--
-- Name: electricity_services electricity_services_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_services
    ADD CONSTRAINT electricity_services_transaction_id_unique UNIQUE (transaction_id);


--
-- Name: fraud_alerts fraud_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fraud_alerts
    ADD CONSTRAINT fraud_alerts_pkey PRIMARY KEY (id);


--
-- Name: identity_agents identity_agents_admin_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_agents
    ADD CONSTRAINT identity_agents_admin_user_id_unique UNIQUE (admin_user_id);


--
-- Name: identity_agents identity_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_agents
    ADD CONSTRAINT identity_agents_pkey PRIMARY KEY (id);


--
-- Name: identity_request_activity identity_request_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_request_activity
    ADD CONSTRAINT identity_request_activity_pkey PRIMARY KEY (id);


--
-- Name: identity_service_requests identity_service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_requests
    ADD CONSTRAINT identity_service_requests_pkey PRIMARY KEY (id);


--
-- Name: identity_service_requests identity_service_requests_tracking_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_requests
    ADD CONSTRAINT identity_service_requests_tracking_id_unique UNIQUE (tracking_id);


--
-- Name: identity_verifications identity_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_pkey PRIMARY KEY (id);


--
-- Name: jamb_agents jamb_agents_admin_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_agents
    ADD CONSTRAINT jamb_agents_admin_user_id_unique UNIQUE (admin_user_id);


--
-- Name: jamb_agents jamb_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_agents
    ADD CONSTRAINT jamb_agents_pkey PRIMARY KEY (id);


--
-- Name: jamb_request_documents jamb_request_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_request_documents
    ADD CONSTRAINT jamb_request_documents_pkey PRIMARY KEY (id);


--
-- Name: jamb_service_requests jamb_service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_service_requests
    ADD CONSTRAINT jamb_service_requests_pkey PRIMARY KEY (id);


--
-- Name: jamb_service_requests jamb_service_requests_tracking_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_service_requests
    ADD CONSTRAINT jamb_service_requests_tracking_id_unique UNIQUE (tracking_id);


--
-- Name: nbais_schools nbais_schools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nbais_schools
    ADD CONSTRAINT nbais_schools_pkey PRIMARY KEY (id);


--
-- Name: nin_slips nin_slips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nin_slips
    ADD CONSTRAINT nin_slips_pkey PRIMARY KEY (id);


--
-- Name: nin_slips nin_slips_slip_reference_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nin_slips
    ADD CONSTRAINT nin_slips_slip_reference_unique UNIQUE (slip_reference);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: rpa_jobs rpa_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rpa_jobs
    ADD CONSTRAINT rpa_jobs_pkey PRIMARY KEY (id);


--
-- Name: scraped_data_plans scraped_data_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraped_data_plans
    ADD CONSTRAINT scraped_data_plans_pkey PRIMARY KEY (id);


--
-- Name: service_pricing service_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_pricing
    ADD CONSTRAINT service_pricing_pkey PRIMARY KEY (id);


--
-- Name: service_pricing service_pricing_service_type_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_pricing
    ADD CONSTRAINT service_pricing_service_type_unique UNIQUE (service_type);


--
-- Name: shared_files shared_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_files
    ADD CONSTRAINT shared_files_pkey PRIMARY KEY (id);


--
-- Name: shared_files shared_files_share_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_files
    ADD CONSTRAINT shared_files_share_token_key UNIQUE (share_token);


--
-- Name: support_conversations support_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_pkey PRIMARY KEY (id);


--
-- Name: support_internal_notes support_internal_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_internal_notes
    ADD CONSTRAINT support_internal_notes_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_presence support_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_presence
    ADD CONSTRAINT support_presence_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_reference_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_reference_id_unique UNIQUE (reference_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: virtual_accounts virtual_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.virtual_accounts
    ADD CONSTRAINT virtual_accounts_pkey PRIMARY KEY (id);


--
-- Name: virtual_accounts virtual_accounts_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.virtual_accounts
    ADD CONSTRAINT virtual_accounts_user_id_unique UNIQUE (user_id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_template_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_template_name_unique UNIQUE (template_name);


--
-- Name: a2c_agents a2c_agents_admin_user_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_agents
    ADD CONSTRAINT a2c_agents_admin_user_id_admin_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: a2c_phone_inventory a2c_phone_inventory_agent_id_a2c_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_phone_inventory
    ADD CONSTRAINT a2c_phone_inventory_agent_id_a2c_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.a2c_agents(id);


--
-- Name: a2c_requests a2c_requests_assigned_agent_id_a2c_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_requests
    ADD CONSTRAINT a2c_requests_assigned_agent_id_a2c_agents_id_fk FOREIGN KEY (assigned_agent_id) REFERENCES public.a2c_agents(id);


--
-- Name: a2c_requests a2c_requests_inventory_id_a2c_phone_inventory_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_requests
    ADD CONSTRAINT a2c_requests_inventory_id_a2c_phone_inventory_id_fk FOREIGN KEY (inventory_id) REFERENCES public.a2c_phone_inventory(id);


--
-- Name: a2c_requests a2c_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_requests
    ADD CONSTRAINT a2c_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: a2c_status_history a2c_status_history_request_id_a2c_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.a2c_status_history
    ADD CONSTRAINT a2c_status_history_request_id_a2c_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.a2c_requests(id);


--
-- Name: admin_activity_logs admin_activity_logs_admin_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_admin_id_admin_users_id_fk FOREIGN KEY (admin_id) REFERENCES public.admin_users(id);


--
-- Name: admin_notifications admin_notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: admin_users admin_users_role_id_admin_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_role_id_admin_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.admin_roles(id);


--
-- Name: agent_internal_messages agent_internal_messages_ticket_id_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_internal_messages
    ADD CONSTRAINT agent_internal_messages_ticket_id_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);


--
-- Name: agent_notifications agent_notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_notifications
    ADD CONSTRAINT agent_notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_knowledge_base ai_knowledge_base_added_by_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_knowledge_base
    ADD CONSTRAINT ai_knowledge_base_added_by_admin_users_id_fk FOREIGN KEY (added_by) REFERENCES public.admin_users(id);


--
-- Name: ai_unresolved_queries ai_unresolved_queries_resolved_by_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_unresolved_queries
    ADD CONSTRAINT ai_unresolved_queries_resolved_by_admin_users_id_fk FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id);


--
-- Name: airtime_services airtime_services_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airtime_services
    ADD CONSTRAINT airtime_services_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: birth_attestations birth_attestations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.birth_attestations
    ADD CONSTRAINT birth_attestations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bvn_services bvn_services_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bvn_services
    ADD CONSTRAINT bvn_services_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bvn_verifications bvn_verifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bvn_verifications
    ADD CONSTRAINT bvn_verifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cable_services cable_services_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cable_services
    ADD CONSTRAINT cable_services_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cac_agents cac_agents_admin_user_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_agents
    ADD CONSTRAINT cac_agents_admin_user_id_admin_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: cac_files cac_files_cac_request_id_cac_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_files
    ADD CONSTRAINT cac_files_cac_request_id_cac_requests_id_fk FOREIGN KEY (cac_request_id) REFERENCES public.cac_requests(id);


--
-- Name: cac_files cac_files_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_files
    ADD CONSTRAINT cac_files_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: cac_registration_requests cac_registration_requests_assigned_agent_id_cac_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_registration_requests
    ADD CONSTRAINT cac_registration_requests_assigned_agent_id_cac_agents_id_fk FOREIGN KEY (assigned_agent_id) REFERENCES public.cac_agents(id);


--
-- Name: cac_registration_requests cac_registration_requests_service_type_id_cac_service_types_id_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_registration_requests
    ADD CONSTRAINT cac_registration_requests_service_type_id_cac_service_types_id_ FOREIGN KEY (service_type_id) REFERENCES public.cac_service_types(id);


--
-- Name: cac_registration_requests cac_registration_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_registration_requests
    ADD CONSTRAINT cac_registration_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cac_request_activity cac_request_activity_request_id_cac_registration_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_activity
    ADD CONSTRAINT cac_request_activity_request_id_cac_registration_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.cac_registration_requests(id);


--
-- Name: cac_request_documents cac_request_documents_request_id_cac_registration_requests_id_f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_documents
    ADD CONSTRAINT cac_request_documents_request_id_cac_registration_requests_id_f FOREIGN KEY (request_id) REFERENCES public.cac_registration_requests(id);


--
-- Name: cac_request_documents cac_request_documents_verified_by_cac_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_documents
    ADD CONSTRAINT cac_request_documents_verified_by_cac_agents_id_fk FOREIGN KEY (verified_by) REFERENCES public.cac_agents(id);


--
-- Name: cac_request_messages cac_request_messages_request_id_cac_registration_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_request_messages
    ADD CONSTRAINT cac_request_messages_request_id_cac_registration_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.cac_registration_requests(id);


--
-- Name: cac_requests cac_requests_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_requests
    ADD CONSTRAINT cac_requests_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: cac_requests cac_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cac_requests
    ADD CONSTRAINT cac_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: data_services data_services_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_services
    ADD CONSTRAINT data_services_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: developer_api_keys developer_api_keys_developer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_keys
    ADD CONSTRAINT developer_api_keys_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.developer_users(id) ON DELETE CASCADE;


--
-- Name: developer_api_logs developer_api_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_logs
    ADD CONSTRAINT developer_api_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.developer_api_keys(id);


--
-- Name: developer_api_logs developer_api_logs_developer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_logs
    ADD CONSTRAINT developer_api_logs_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.developer_users(id) ON DELETE CASCADE;


--
-- Name: developer_transactions developer_transactions_developer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_transactions
    ADD CONSTRAINT developer_transactions_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.developer_users(id) ON DELETE CASCADE;


--
-- Name: education_agents education_agents_admin_user_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_agents
    ADD CONSTRAINT education_agents_admin_user_id_admin_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: education_pin_orders education_pin_orders_pin_id_education_pins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_pin_orders
    ADD CONSTRAINT education_pin_orders_pin_id_education_pins_id_fk FOREIGN KEY (pin_id) REFERENCES public.education_pins(id);


--
-- Name: education_pin_orders education_pin_orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_pin_orders
    ADD CONSTRAINT education_pin_orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: education_pins education_pins_used_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_pins
    ADD CONSTRAINT education_pins_used_by_user_id_users_id_fk FOREIGN KEY (used_by_user_id) REFERENCES public.users(id);


--
-- Name: education_request_documents education_request_documents_request_id_education_service_reques; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_request_documents
    ADD CONSTRAINT education_request_documents_request_id_education_service_reques FOREIGN KEY (request_id) REFERENCES public.education_service_requests(id);


--
-- Name: education_service_requests education_service_requests_assigned_agent_id_education_agents_i; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_service_requests
    ADD CONSTRAINT education_service_requests_assigned_agent_id_education_agents_i FOREIGN KEY (assigned_agent_id) REFERENCES public.education_agents(id);


--
-- Name: education_service_requests education_service_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_service_requests
    ADD CONSTRAINT education_service_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: education_services education_services_job_id_rpa_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_services
    ADD CONSTRAINT education_services_job_id_rpa_jobs_id_fk FOREIGN KEY (job_id) REFERENCES public.rpa_jobs(id);


--
-- Name: education_services education_services_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.education_services
    ADD CONSTRAINT education_services_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: electricity_services electricity_services_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_services
    ADD CONSTRAINT electricity_services_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: fraud_alerts fraud_alerts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fraud_alerts
    ADD CONSTRAINT fraud_alerts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: identity_agents identity_agents_admin_user_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_agents
    ADD CONSTRAINT identity_agents_admin_user_id_admin_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: identity_request_activity identity_request_activity_request_id_identity_service_requests_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_request_activity
    ADD CONSTRAINT identity_request_activity_request_id_identity_service_requests_ FOREIGN KEY (request_id) REFERENCES public.identity_service_requests(id);


--
-- Name: identity_service_requests identity_service_requests_assigned_agent_id_identity_agents_id_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_requests
    ADD CONSTRAINT identity_service_requests_assigned_agent_id_identity_agents_id_ FOREIGN KEY (assigned_agent_id) REFERENCES public.identity_agents(id);


--
-- Name: identity_service_requests identity_service_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_requests
    ADD CONSTRAINT identity_service_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: identity_verifications identity_verifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: jamb_agents jamb_agents_admin_user_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_agents
    ADD CONSTRAINT jamb_agents_admin_user_id_admin_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);


--
-- Name: jamb_request_documents jamb_request_documents_request_id_jamb_service_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_request_documents
    ADD CONSTRAINT jamb_request_documents_request_id_jamb_service_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.jamb_service_requests(id);


--
-- Name: jamb_service_requests jamb_service_requests_assigned_agent_id_jamb_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_service_requests
    ADD CONSTRAINT jamb_service_requests_assigned_agent_id_jamb_agents_id_fk FOREIGN KEY (assigned_agent_id) REFERENCES public.jamb_agents(id);


--
-- Name: jamb_service_requests jamb_service_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jamb_service_requests
    ADD CONSTRAINT jamb_service_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: nin_slips nin_slips_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nin_slips
    ADD CONSTRAINT nin_slips_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rpa_jobs rpa_jobs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rpa_jobs
    ADD CONSTRAINT rpa_jobs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: shared_files shared_files_uploaded_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_files
    ADD CONSTRAINT shared_files_uploaded_by_user_id_users_id_fk FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id);


--
-- Name: support_conversations support_conversations_ticket_id_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_conversations
    ADD CONSTRAINT support_conversations_ticket_id_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);


--
-- Name: support_internal_notes support_internal_notes_agent_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_internal_notes
    ADD CONSTRAINT support_internal_notes_agent_id_admin_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.admin_users(id);


--
-- Name: support_internal_notes support_internal_notes_ticket_id_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_internal_notes
    ADD CONSTRAINT support_internal_notes_ticket_id_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);


--
-- Name: support_messages support_messages_conversation_id_support_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_conversation_id_support_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.support_conversations(id);


--
-- Name: support_presence support_presence_ticket_id_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_presence
    ADD CONSTRAINT support_presence_ticket_id_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);


--
-- Name: support_tickets support_tickets_assigned_agent_id_admin_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_agent_id_admin_users_id_fk FOREIGN KEY (assigned_agent_id) REFERENCES public.admin_users(id);


--
-- Name: support_tickets support_tickets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: virtual_accounts virtual_accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.virtual_accounts
    ADD CONSTRAINT virtual_accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict z7PBbR8sxKOuSe65DiY0v5RASlLz5Ixy67X3yQnneUsrdoOvNjSJcaKXKmhT7iD

