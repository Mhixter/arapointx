import { logger } from './logger';
import { db } from '../config/database';
import { sql } from 'drizzle-orm';

/**
 * Idempotent index creation and table creation that runs at startup.
 * Uses CREATE IF NOT EXISTS — safe to run on every boot.
 */
export async function runStartupMigrations(): Promise<void> {
  const migrations: Array<{ name: string; ddl: string }> = [
    // Create missing tables first
    {
      name: 'webhook_retry_queue_table',
      ddl: `CREATE TABLE IF NOT EXISTS webhook_retry_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_url VARCHAR(500) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        next_retry_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_error TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: 'rate_limits_table',
      ddl: `CREATE TABLE IF NOT EXISTS rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        user_id UUID,
        endpoint VARCHAR(255),
        request_count INTEGER DEFAULT 1,
        window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        window_end TIMESTAMP NOT NULL,
        limit_threshold INTEGER DEFAULT 100,
        is_exceeded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT rate_limits_key_window_start_unique UNIQUE (key, window_start)
      )`,
    },
    {
      name: 'screening_paystack_transactions_table',
      ddl: `CREATE TABLE IF NOT EXISTS screening_paystack_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        reference VARCHAR(100) UNIQUE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        amount_paid DECIMAL(15, 2),
        currency VARCHAR(10) DEFAULT 'NGN',
        status VARCHAR(50) DEFAULT 'pending',
        paystack_access_code VARCHAR(255),
        paystack_authorization_url VARCHAR(500),
        paystack_reference VARCHAR(100),
        payer_email VARCHAR(255),
        description TEXT,
        metadata JSONB,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    // Schema constraints (must run before plain indexes)
    {
      name: 'ai_chat_sessions_session_token_unique',
      ddl: `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'ai_chat_sessions_session_token_unique'
          ) THEN
            -- Remove duplicate session_tokens keeping the most recent row
            DELETE FROM ai_chat_sessions a
            USING ai_chat_sessions b
            WHERE a.session_token = b.session_token
              AND a.created_at < b.created_at;
            ALTER TABLE ai_chat_sessions
              ADD CONSTRAINT ai_chat_sessions_session_token_unique UNIQUE (session_token);
          END IF;
        END $$`,
    },
    // Create indexes for webhook_retry_queue
    {
      name: 'idx_webhook_retry_status',
      ddl: `CREATE INDEX IF NOT EXISTS idx_webhook_retry_status ON webhook_retry_queue(status)`,
    },
    {
      name: 'idx_webhook_retry_next',
      ddl: `CREATE INDEX IF NOT EXISTS idx_webhook_retry_next ON webhook_retry_queue(next_retry_at)`,
    },
    // Create indexes for rate_limits
    {
      name: 'idx_rate_limits_key',
      ddl: `CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key)`,
    },
    {
      name: 'idx_rate_limits_user_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id)`,
    },
    {
      name: 'idx_rate_limits_window_end',
      ddl: `CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end)`,
    },
    // Create indexes for screening_paystack_transactions
    {
      name: 'idx_screening_paystack_org_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_screening_paystack_org_id ON screening_paystack_transactions(org_id)`,
    },
    {
      name: 'idx_screening_paystack_reference',
      ddl: `CREATE INDEX IF NOT EXISTS idx_screening_paystack_reference ON screening_paystack_transactions(reference)`,
    },
    {
      name: 'idx_screening_paystack_status',
      ddl: `CREATE INDEX IF NOT EXISTS idx_screening_paystack_status ON screening_paystack_transactions(status)`,
    },
    {
      name: 'idx_screening_paystack_created',
      ddl: `CREATE INDEX IF NOT EXISTS idx_screening_paystack_created ON screening_paystack_transactions(created_at)`,
    },
    // Other existing indexes
    {
      name: 'idx_transactions_reference_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_transactions_reference_id
              ON transactions (reference_id)`,
    },
    {
      name: 'idx_transactions_user_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_transactions_user_id
              ON transactions (user_id)`,
    },
    {
      name: 'idx_airtime_services_reference',
      ddl: `CREATE INDEX IF NOT EXISTS idx_airtime_services_reference
              ON airtime_services (reference)`,
    },
    {
      name: 'idx_airtime_services_user_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_airtime_services_user_id
              ON airtime_services (user_id)`,
    },
    {
      name: 'idx_data_services_reference',
      ddl: `CREATE INDEX IF NOT EXISTS idx_data_services_reference
              ON data_services (reference)`,
    },
    {
      name: 'idx_data_services_user_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_data_services_user_id
              ON data_services (user_id)`,
    },
    {
      name: 'idx_electricity_services_reference',
      ddl: `CREATE INDEX IF NOT EXISTS idx_electricity_services_reference
              ON electricity_services (reference)`,
    },
    {
      name: 'idx_electricity_services_user_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_electricity_services_user_id
              ON electricity_services (user_id)`,
    },
    {
      name: 'idx_users_phone',
      ddl: `CREATE INDEX IF NOT EXISTS idx_users_phone
              ON users (phone)`,
    },
    {
      name: 'idx_users_email',
      ddl: `CREATE INDEX IF NOT EXISTS idx_users_email
              ON users (email)`,
    },
    {
      name: 'idx_wallets_user_id',
      ddl: `CREATE INDEX IF NOT EXISTS idx_wallets_user_id
              ON wallets (user_id)`,
    },
  ];

  logger.info('Running startup migrations (tables + indexes)...');
  let created = 0;
  for (const { name, ddl } of migrations) {
    try {
      await db.execute(sql.raw(ddl));
      created++;
    } catch (err: any) {
      // Non-fatal: table may not yet exist in some envs
      logger.warn(`Startup migration skipped (${name}): ${err.message}`);
    }
  }
  logger.info(`Startup migrations complete — ${created}/${migrations.length} applied`);
}
