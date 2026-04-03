import crypto from 'crypto';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { sql, eq } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

// ─── Webhook Logs Table (inline schema) ──────────────────────────────────────
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

// ─── Retry schedule (ms) ─────────────────────────────────────────────────────
const RETRY_DELAYS = [
  1 * 60 * 1000,   // 1 minute
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
  60 * 60 * 1000,  // 1 hour
];

// ─── Sign payload with HMAC-SHA256 ───────────────────────────────────────────
export function signPayload(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// ─── Deliver webhook with retries ─────────────────────────────────────────────
export async function deliverWebhook(
  developerId: string,
  webhookUrl: string,
  webhookSecret: string,
  eventType: string,
  data: object,
  attempt = 1
): Promise<void> {
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
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
    responseStatus = null;
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
    return;
  }

  // Schedule retry if attempts remain
  if (attempt <= RETRY_DELAYS.length) {
    const delay = RETRY_DELAYS[attempt - 1];
    logger.warn('Webhook delivery failed, scheduling retry', {
      developerId, eventType, attempt, nextRetryMs: delay, error: errorMessage,
    });
    setTimeout(() => {
      deliverWebhook(developerId, webhookUrl, webhookSecret, eventType, data, attempt + 1).catch(err => {
        logger.error('Webhook retry error', { error: err.message });
      });
    }, delay);
  } else {
    logger.error('Webhook delivery failed after all retries', { developerId, eventType, error: errorMessage });
  }
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

// ─── DB Migration helper — idempotent ────────────────────────────────────────
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
  } catch (e: any) {
    logger.warn('Webhook migration warning (safe to ignore):', { msg: e.message });
  }
}
