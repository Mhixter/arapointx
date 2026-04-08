import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Auto-create table on first use ──────────────────────────────────────────
let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key varchar(512) PRIMARY KEY,
        user_id varchar(255),
        status_code integer NOT NULL,
        response_body jsonb NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        expires_at timestamp NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idempotency_expires_idx ON idempotency_keys(expires_at)
    `);
    tableEnsured = true;
  } catch (e: any) {
    logger.warn('Idempotency table setup warning', { error: e.message });
    tableEnsured = true; // Don't keep retrying if it failed for benign reasons
  }
}

// Periodically clean up expired keys (run once on startup)
let cleanupStarted = false;
function startIdempotencyCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(async () => {
    try {
      await db.execute(sql`DELETE FROM idempotency_keys WHERE expires_at < now()`);
    } catch {}
  }, 60 * 60 * 1000); // every hour
}

// ─── Middleware factory ───────────────────────────────────────────────────────
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return next(); // No key provided — allow through without idempotency protection
  }

  const userId = (req as any).user?.userId || (req as any).user?.id || 'anonymous';
  // Scope key to user so different users can't collide on the same key string
  const scopedKey = `${userId}:${idempotencyKey}`;

  (async () => {
    await ensureTable();
    startIdempotencyCleanup();

    try {
      // Check for existing processed result
      const existing = await db.execute(sql`
        SELECT status_code, response_body FROM idempotency_keys
        WHERE key = ${scopedKey} AND expires_at > now()
        LIMIT 1
      `);

      if (existing.rows.length > 0) {
        const row = existing.rows[0] as { status_code: number; response_body: any };
        logger.info('Idempotent response returned', { scopedKey, statusCode: row.status_code });
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(row.status_code).json(row.response_body);
      }

      // Intercept the response to capture and store it
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        const statusCode = res.statusCode || 200;
        // Only cache successful responses (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
          db.execute(sql`
            INSERT INTO idempotency_keys (key, user_id, status_code, response_body, expires_at)
            VALUES (${scopedKey}, ${userId}, ${statusCode}, ${JSON.stringify(body)}::jsonb, ${expiresAt.toISOString()}::timestamp)
            ON CONFLICT (key) DO NOTHING
          `).catch((err: any) => {
            logger.warn('Failed to store idempotency key', { error: err.message });
          });
        }
        return originalJson(body);
      };

      next();
    } catch (e: any) {
      logger.warn('Idempotency check error, proceeding without protection', { error: e.message });
      next();
    }
  })();
}
