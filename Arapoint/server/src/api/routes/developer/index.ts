import { Router } from 'express';
import { db, sql, logger, runWebhookMigrations, startWebhookRetryProcessor } from './shared';

import authRouter from './auth';
import profileRouter from './profile';
import apikeysRouter from './apikeys';
import billingRouter from './billing';
import verificationRouter from './verification';
import employmentRouter from './employment';
import kybRouter from './kyb';
import adminRouter from './admin';
import webhooksRouter from './webhooks';
import analyticsRouter from './analytics';
import securityRouter from './security';

const router = Router();

(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) UNIQUE NOT NULL,
        name varchar(255) NOT NULL,
        company varchar(255),
        password_hash varchar(255) NOT NULL,
        wallet_balance numeric(15,2) DEFAULT 0,
        sandbox_balance numeric(15,2) DEFAULT 0,
        is_active boolean DEFAULT true,
        email_verified boolean DEFAULT false,
        account_type varchar(50) DEFAULT 'individual',
        kyc_status varchar(50) DEFAULT 'not_required',
        kyc_documents jsonb,
        kyc_submitted_at timestamp,
        kyc_reviewed_at timestamp,
        kyc_review_note text,
        webhook_url varchar(500),
        environment_mode varchar(20) DEFAULT 'sandbox',
        webhook_secret varchar(255),
        webhook_enabled boolean DEFAULT false,
        ip_allowlist jsonb DEFAULT '[]'::jsonb,
        custom_rate_limit integer DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id uuid NOT NULL,
        key_name varchar(100) NOT NULL,
        api_key varchar(150) UNIQUE NOT NULL,
        secret_key_hash varchar(255),
        secret_key_last_four varchar(10),
        environment varchar(20) DEFAULT 'sandbox',
        is_active boolean DEFAULT true,
        last_used_at timestamp,
        total_requests integer DEFAULT 0,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_api_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id uuid NOT NULL,
        api_key_id uuid,
        endpoint varchar(255),
        method varchar(10),
        request_body jsonb,
        response_body jsonb,
        status_code integer,
        cost numeric(10,2) DEFAULT 0,
        duration_ms integer,
        ip_address varchar(50),
        environment varchar(20) DEFAULT 'sandbox',
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id uuid NOT NULL,
        transaction_type varchar(50),
        amount numeric(15,2),
        description text,
        reference_id varchar(100),
        status varchar(50) DEFAULT 'successful',
        environment varchar(20) DEFAULT 'live',
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      ALTER TABLE developer_api_keys
        ADD COLUMN IF NOT EXISTS environment varchar(20) DEFAULT 'sandbox',
        ADD COLUMN IF NOT EXISTS secret_key_hash varchar(255),
        ADD COLUMN IF NOT EXISTS secret_key_last_four varchar(10)
    `);
    await db.execute(sql`
      ALTER TABLE developer_users
        ADD COLUMN IF NOT EXISTS environment_mode varchar(20) DEFAULT 'sandbox'
    `);
    await db.execute(sql`
      ALTER TABLE developer_api_logs
        ADD COLUMN IF NOT EXISTS environment varchar(20) DEFAULT 'sandbox'
    `);
    await db.execute(sql`
      ALTER TABLE developer_transactions
        ADD COLUMN IF NOT EXISTS environment varchar(20) DEFAULT 'live'
    `);
    await db.execute(sql`
      UPDATE developer_users SET is_active = true WHERE is_active IS NULL
    `);
    await db.execute(sql`
      UPDATE developer_api_keys SET is_active = true WHERE is_active IS NULL
    `);
    await db.execute(sql`
      ALTER TABLE developer_users
        ADD COLUMN IF NOT EXISTS webhook_secret varchar(255),
        ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS ip_allowlist jsonb DEFAULT '[]'::jsonb
    `);
    await db.execute(sql`
      ALTER TABLE developer_users
        ADD COLUMN IF NOT EXISTS custom_rate_limit integer DEFAULT 0
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_webhook_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id uuid NOT NULL,
        event_type varchar(100),
        payload jsonb,
        webhook_url varchar(500),
        response_status integer,
        response_body text,
        attempt integer DEFAULT 1,
        success boolean DEFAULT false,
        error_message text,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_paystack_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id uuid NOT NULL,
        reference varchar(100) UNIQUE NOT NULL,
        amount_ngn numeric(15,2) NOT NULL,
        status varchar(50) DEFAULT 'pending',
        paystack_status varchar(50),
        authorization_url text,
        paid_at timestamp,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id varchar(255),
        action varchar(100) NOT NULL,
        target_developer_id uuid,
        details jsonb,
        ip_address varchar(50),
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_employment_requests (
        id varchar(30) PRIMARY KEY,
        developer_id uuid NOT NULL,
        nin varchar(20),
        bvn varchar(20),
        employment_year integer,
        level varchar(20) DEFAULT 'standard',
        consent_given boolean DEFAULT false,
        consent_at timestamp,
        nin_score integer DEFAULT 0,
        bvn_score integer DEFAULT 0,
        name_match_score numeric(6,4) DEFAULT 0,
        dob_match boolean DEFAULT false,
        timeline_valid boolean,
        timeline_score integer DEFAULT 0,
        nin_data jsonb,
        bvn_data jsonb,
        flags jsonb DEFAULT '[]'::jsonb,
        ssce_job_id uuid,
        ssce_provider varchar(20),
        initial_score integer DEFAULT 0,
        final_score integer,
        decision varchar(10),
        queue_status varchar(20) DEFAULT 'queued',
        developer_email varchar(255),
        developer_name varchar(255),
        error_message text,
        completed_at timestamp,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      ALTER TABLE developer_employment_requests
        ADD COLUMN IF NOT EXISTS queue_status varchar(20) DEFAULT 'queued',
        ADD COLUMN IF NOT EXISTS developer_email varchar(255),
        ADD COLUMN IF NOT EXISTS developer_name varchar(255),
        ADD COLUMN IF NOT EXISTS error_message text,
        ADD COLUMN IF NOT EXISTS completed_at timestamp
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS developer_unified_requests (
        id varchar(30) PRIMARY KEY,
        developer_id uuid NOT NULL,
        reference varchar(255),
        callback_url text,
        identity_nin varchar(20),
        identity_bvn varchar(20),
        identity_full_name varchar(255),
        identity_dob varchar(20),
        checks_requested jsonb DEFAULT '{}',
        options jsonb DEFAULT '{}',
        status varchar(20) DEFAULT 'queued',
        checks_status jsonb DEFAULT '{}',
        nin_data jsonb,
        bvn_data jsonb,
        education_results jsonb DEFAULT '[]',
        employment_result jsonb,
        fraud_result jsonb,
        score integer,
        decision varchar(10),
        flags jsonb DEFAULT '[]',
        breakdown jsonb,
        total_cost numeric(10,2) DEFAULT 0,
        environment varchar(20) DEFAULT 'sandbox',
        webhook_delivered boolean DEFAULT false,
        completed_at timestamp,
        created_at timestamp DEFAULT now()
      )
    `);
  } catch (e: any) {
    // Column already exists or minor error — safe to ignore
  }

  // Run webhook-specific migrations and start the DB-backed retry processor
  try {
    await runWebhookMigrations();
    startWebhookRetryProcessor();
  } catch (e: any) {
    logger.warn('Webhook startup warning', { msg: e.message });
  }
})();

router.use(authRouter);
router.use(profileRouter);
router.use(apikeysRouter);
router.use(billingRouter);
router.use(verificationRouter);
router.use(employmentRouter);
router.use(kybRouter);
router.use(adminRouter);
router.use(webhooksRouter);
router.use(analyticsRouter);
router.use(securityRouter);

export default router;
