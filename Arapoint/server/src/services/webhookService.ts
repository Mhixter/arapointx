import crypto from 'crypto';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { sql, eq, lte, and } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

// ─── Webhook Logs Table ───────────────────────────────────────────────────────
export const developerWebhookLogs = pgTable('developer_webhook_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull(),
  eventType: varchar('event_type', { length: 100 }),
  payload: jsonb('payload'),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  attempt: integer('attempt').default(1),
  success: boolean('success').default(false),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Webhook Retry Queue Table ────────────────────────────────────────────────
export const webhookRetryQueue = pgTable('webhook_retry_queue', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull(),
  webhookUrl: varchar('webhook_url', { length: 500 }).notNull(),
  webhookSecret: varchar('webhook_secret', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  attempt: integer('attempt').notNull().default(1),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Retry schedule (ms) ──────────────────────────────────────────────────────
const RETRY_DELAYS = [
  1 * 60 * 1000,   // 1 minute
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
  60 * 60 * 1000,  // 1 hour
];

// ─── Sign payload ─────────────────────────────────────────────────────────────
export function signPayload(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// ─── Actually deliver one webhook attempt ─────────────────────────────────────
async function attemptDelivery(
  developerId: string,
  webhookUrl: string,
  webhookSecret: string,
  eventType: string,
  data: object,
  attempt: number
): Promise<boolean> {
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  const signature = signPayload(payload, webhookSecret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Arapoint-Signature': signature,
        'X-Arapoint-Event': eventType,
        'User-Agent': 'Arapoint-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = await res.text().catch(() => '');
    success = res.status >= 200 && res.status < 300;

    if (!success) {
      errorMessage = `HTTP ${res.status}: ${responseBody?.slice(0, 200)}`;
    }
  } catch (e: any) {
    errorMessage = e.message || 'Network error';
  }

  // Log every attempt
  try {
    await db.insert(developerWebhookLogs).values({
      developerId,
      eventType,
      payload,
      webhookUrl,
      responseStatus,
      responseBody: responseBody?.slice(0, 1000),
      attempt,
      success,
      errorMessage,
    });
  } catch (dbErr: any) {
    logger.warn('Failed to log webhook attempt', { error: dbErr.message });
  }

  if (success) {
    logger.info('Webhook delivered successfully', { developerId, eventType, attempt });
  } else {
    logger.warn('Webhook delivery failed', { developerId, eventType, attempt, error: errorMessage });
  }

  return success;
}

// ─── Deliver webhook — schedules DB-persisted retries on failure ──────────────
export async function deliverWebhook(
  developerId: string,
  webhookUrl: string,
  webhookSecret: string,
  eventType: string,
  data: object,
  attempt = 1
): Promise<void> {
  const success = await attemptDelivery(developerId, webhookUrl, webhookSecret, eventType, data, attempt);

  if (!success && attempt <= RETRY_DELAYS.length) {
    const delay = RETRY_DELAYS[attempt - 1];
    const scheduledAt = new Date(Date.now() + delay);

    try {
      await db.execute(sql`
        INSERT INTO webhook_retry_queue (developer_id, webhook_url, webhook_secret, event_type, payload, attempt, scheduled_at, status)
        VALUES (
          ${developerId}::uuid,
          ${webhookUrl},
          ${webhookSecret},
          ${eventType},
          ${JSON.stringify(data)}::jsonb,
          ${attempt + 1},
          ${scheduledAt.toISOString()}::timestamp,
          'pending'
        )
      `);
      logger.info('Webhook retry queued in DB', { developerId, eventType, attempt, scheduledAt });
    } catch (qErr: any) {
      logger.error('Failed to queue webhook retry', { error: qErr.message });
    }
  } else if (!success) {
    logger.error('Webhook delivery failed after all retries', { developerId, eventType });
  }
}

// ─── Background retry processor — call once on server startup ────────────────
let retryProcessorStarted = false;

export function startWebhookRetryProcessor(): void {
  if (retryProcessorStarted) return;
  retryProcessorStarted = true;

  const processDueRetries = async () => {
    try {
      const now = new Date();
      const dueRows = await db.execute(sql`
        SELECT id, developer_id, webhook_url, webhook_secret, event_type, payload, attempt
        FROM webhook_retry_queue
        WHERE status = 'pending' AND scheduled_at <= ${now.toISOString()}::timestamp
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      `);

      const rows = dueRows.rows as Array<{
        id: string;
        developer_id: string;
        webhook_url: string;
        webhook_secret: string;
        event_type: string;
        payload: object;
        attempt: number;
      }>;

      if (rows.length === 0) return;

      logger.info(`Processing ${rows.length} due webhook retries`);

      for (const row of rows) {
        // Mark as processing to prevent double-pick
        await db.execute(sql`
          UPDATE webhook_retry_queue SET status = 'processing' WHERE id = ${row.id}::uuid
        `);

        const success = await attemptDelivery(
          row.developer_id,
          row.webhook_url,
          row.webhook_secret,
          row.event_type,
          row.payload,
          row.attempt
        );

        if (success) {
          await db.execute(sql`
            UPDATE webhook_retry_queue SET status = 'delivered' WHERE id = ${row.id}::uuid
          `);
        } else if (row.attempt <= RETRY_DELAYS.length) {
          // Schedule next retry
          const delay = RETRY_DELAYS[row.attempt - 1];
          const nextScheduledAt = new Date(Date.now() + delay);
          await db.execute(sql`
            INSERT INTO webhook_retry_queue (developer_id, webhook_url, webhook_secret, event_type, payload, attempt, scheduled_at, status)
            VALUES (
              ${row.developer_id}::uuid,
              ${row.webhook_url},
              ${row.webhook_secret},
              ${row.event_type},
              ${JSON.stringify(row.payload)}::jsonb,
              ${row.attempt + 1},
              ${nextScheduledAt.toISOString()}::timestamp,
              'pending'
            )
          `);
          await db.execute(sql`
            UPDATE webhook_retry_queue SET status = 'rescheduled' WHERE id = ${row.id}::uuid
          `);
        } else {
          await db.execute(sql`
            UPDATE webhook_retry_queue SET status = 'failed' WHERE id = ${row.id}::uuid
          `);
          logger.error('Webhook permanently failed after all retries', {
            developerId: row.developer_id,
            eventType: row.event_type,
          });
        }
      }
    } catch (err: any) {
      logger.warn('Webhook retry processor error', { error: err.message });
    }
  };

  // Run every 30 seconds
  setInterval(processDueRetries, 30_000);
  logger.info('Webhook retry processor started (30s interval)');
}

// ─── Fire webhook for a developer if they have it enabled ────────────────────
export async function fireWebhookIfEnabled(
  developer: { id: string; webhookUrl: string | null; webhookSecret?: string | null; webhookEnabled?: boolean | null },
  eventType: string,
  data: object
): Promise<void> {
  if (!developer.webhookUrl || !developer.webhookSecret || !developer.webhookEnabled) return;

  deliverWebhook(
    developer.id,
    developer.webhookUrl,
    developer.webhookSecret,
    eventType,
    data
  ).catch(err => {
    logger.error('Webhook fire error', { developerId: developer.id, error: err.message });
  });
}

// ─── DB Migration — idempotent ────────────────────────────────────────────────
export async function runWebhookMigrations(): Promise<void> {
  try {
    await db.execute(sql`
      ALTER TABLE developer_users
        ADD COLUMN IF NOT EXISTS webhook_secret varchar(255),
        ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT false
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
      CREATE TABLE IF NOT EXISTS webhook_retry_queue (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        developer_id uuid NOT NULL,
        webhook_url varchar(500) NOT NULL,
        webhook_secret varchar(255) NOT NULL,
        event_type varchar(100) NOT NULL,
        payload jsonb NOT NULL,
        attempt integer NOT NULL DEFAULT 1,
        scheduled_at timestamp NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS wrq_status_scheduled_idx ON webhook_retry_queue(status, scheduled_at)
    `);
  } catch (e: any) {
    logger.warn('Webhook migration warning (safe to ignore):', { msg: e.message });
  }
}
