import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const CACHE_TABLE = 'server_cache';

async function runCacheMigration(): Promise<void> {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS ${CACHE_TABLE} (
      cache_key   TEXT PRIMARY KEY,
      cache_value TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_server_cache_expires ON ${CACHE_TABLE} (expires_at);
  `));
  logger.info('DB cache table ready');
}

class CacheService {
  private initialized = false;

  async ensureInit(): Promise<void> {
    if (this.initialized) return;
    await runCacheMigration();
    this.initialized = true;
    this.scheduleEviction();
  }

  private scheduleEviction(): void {
    setInterval(async () => {
      try {
        await db.execute(sql.raw(
          `DELETE FROM ${CACHE_TABLE} WHERE expires_at < NOW()`
        ));
      } catch {
        // silently skip — eviction is best-effort
      }
    }, 5 * 60 * 1000); // every 5 minutes
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      await this.ensureInit();
      const rows = await db.execute(sql.raw(
        `SELECT cache_value FROM ${CACHE_TABLE}
         WHERE cache_key = '${key.replace(/'/g, "''")}' AND expires_at > NOW()
         LIMIT 1`
      ));
      const row = (rows as any).rows?.[0] ?? (rows as any)[0];
      if (!row) return null;
      return JSON.parse(row.cache_value) as T;
    } catch (err) {
      logger.warn('CacheService.get error', { key, err: (err as Error).message });
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.ensureInit();
      const escaped = JSON.stringify(value).replace(/'/g, "''");
      const safeKey = key.replace(/'/g, "''");
      await db.execute(sql.raw(
        `INSERT INTO ${CACHE_TABLE} (cache_key, cache_value, expires_at)
         VALUES ('${safeKey}', '${escaped}', NOW() + INTERVAL '${ttlSeconds} seconds')
         ON CONFLICT (cache_key) DO UPDATE
           SET cache_value = EXCLUDED.cache_value,
               expires_at  = EXCLUDED.expires_at`
      ));
    } catch (err) {
      logger.warn('CacheService.set error', { key, err: (err as Error).message });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.ensureInit();
      const safeKey = key.replace(/'/g, "''");
      await db.execute(sql.raw(
        `DELETE FROM ${CACHE_TABLE} WHERE cache_key = '${safeKey}'`
      ));
    } catch (err) {
      logger.warn('CacheService.del error', { key, err: (err as Error).message });
    }
  }

  async flush(prefix?: string): Promise<void> {
    try {
      await this.ensureInit();
      if (prefix) {
        const safePrefix = prefix.replace(/'/g, "''");
        await db.execute(sql.raw(
          `DELETE FROM ${CACHE_TABLE} WHERE cache_key LIKE '${safePrefix}%'`
        ));
      } else {
        await db.execute(sql.raw(`DELETE FROM ${CACHE_TABLE}`));
      }
    } catch (err) {
      logger.warn('CacheService.flush error', { prefix, err: (err as Error).message });
    }
  }

  async stats(): Promise<{ total: number; expired: number }> {
    try {
      await this.ensureInit();
      const rows = await db.execute(sql.raw(
        `SELECT
           COUNT(*)                                        AS total,
           COUNT(*) FILTER (WHERE expires_at < NOW())     AS expired
         FROM ${CACHE_TABLE}`
      ));
      const row = (rows as any).rows?.[0] ?? (rows as any)[0];
      return {
        total:   Number(row?.total ?? 0),
        expired: Number(row?.expired ?? 0),
      };
    } catch {
      return { total: 0, expired: 0 };
    }
  }
}

export const cacheService = new CacheService();
