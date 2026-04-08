import { logger } from './logger';
import { db } from '../config/database';
import { sql } from 'drizzle-orm';

/**
 * Idempotent index creation that runs at startup.
 * Uses CREATE INDEX IF NOT EXISTS — safe to run on every boot.
 */
export async function runStartupMigrations(): Promise<void> {
  const indexes: Array<{ name: string; ddl: string }> = [
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

  logger.info('Running startup index migrations...');
  let created = 0;
  for (const { name, ddl } of indexes) {
    try {
      await db.execute(sql.raw(ddl));
      created++;
    } catch (err: any) {
      // Non-fatal: table may not yet exist in some envs
      logger.warn(`Startup migration skipped (${name}): ${err.message}`);
    }
  }
  logger.info(`Startup index migrations complete — ${created}/${indexes.length} applied`);
}
