import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { sql } from 'drizzle-orm';

let tableReady = false;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key varchar(255) PRIMARY KEY,
        count integer NOT NULL DEFAULT 1,
        reset_time bigint NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits (reset_time)`);
    tableReady = true;
  } catch (e: any) {
    logger.warn('Rate limit table creation warning', { msg: e.message });
  }
}

async function cleanupExpired(): Promise<void> {
  try {
    await db.execute(sql`DELETE FROM rate_limits WHERE reset_time < ${Date.now()}`);
  } catch {}
}

setInterval(() => { cleanupExpired().catch(() => {}); }, 60000);

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, message, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.userId || req.ip || 'anonymous');

    const now = Date.now();
    const resetTime = now + windowMs;

    try {
      await ensureTable();

      const result = await db.execute(sql`
        INSERT INTO rate_limits (key, count, reset_time)
        VALUES (${key}, 1, ${resetTime})
        ON CONFLICT (key) DO UPDATE SET
          count = CASE
            WHEN rate_limits.reset_time < ${now} THEN 1
            ELSE rate_limits.count + 1
          END,
          reset_time = CASE
            WHEN rate_limits.reset_time < ${now} THEN ${resetTime}
            ELSE rate_limits.reset_time
          END
        RETURNING count, reset_time
      `);

      const row = result.rows[0] as { count: number; reset_time: string };
      const count = Number(row.count);
      const storedReset = Number(row.reset_time);

      if (count > max) {
        const retryAfter = Math.ceil((storedReset - now) / 1000);
        logger.warn('Rate limit exceeded', { key, count, max });

        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.ceil(storedReset / 1000)));

        return res.status(429).json({
          status: 'error',
          code: 429,
          message: message || 'Too many requests, please try again later',
          retryAfter,
        });
      }

      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(max - count));
      res.set('X-RateLimit-Reset', String(Math.ceil(storedReset / 1000)));

      next();
    } catch (e: any) {
      logger.warn('Rate limiter DB error, allowing request', { error: e.message });
      next();
    }
  };
};

export const publicRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests from this IP, please try again after a minute',
  keyGenerator: (req) => req.ip || 'unknown',
});

export const authenticatedRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again after a minute',
  keyGenerator: (req) => req.userId || req.ip || 'unknown',
});

export const rpaRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'RPA query limit reached, please try again after a minute',
  keyGenerator: (req) => `rpa_${req.userId || req.ip || 'unknown'}`,
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again in 15 minutes',
  keyGenerator: (req) => `auth_${req.ip || 'unknown'}`,
});
