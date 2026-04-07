import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { db } from '../../../config/database';
import { config } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { sql, eq, ne, desc, and, count } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal
} from 'drizzle-orm/pg-core';
import { otpService } from '../../../services/otpService';
import { rpaJobs } from '../../../db/schema';
import { runWebhookMigrations, developerWebhookLogs, fireWebhookIfEnabled } from '../../../services/webhookService';
import * as paystackService from '../../../services/paystackService';
import { objectStorageService, ObjectNotFoundError } from '../../../services/objectStorage';

export { db, config, logger, sql, eq, ne, desc, and, count, crypto, bcrypt, jwt, multer };
export { otpService, rpaJobs, runWebhookMigrations, developerWebhookLogs, fireWebhookIfEnabled };
export { paystackService, objectStorageService, ObjectNotFoundError };
export type { Request, Response };

export const kybUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const developerUsers = pgTable('developer_users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  walletBalance: decimal('wallet_balance', { precision: 15, scale: 2 }).default('0'),
  sandboxBalance: decimal('sandbox_balance', { precision: 15, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  accountType: varchar('account_type', { length: 50 }).default('individual'),
  kycStatus: varchar('kyc_status', { length: 50 }).default('not_required'),
  kycDocuments: jsonb('kyc_documents'),
  kycSubmittedAt: timestamp('kyc_submitted_at'),
  kycReviewedAt: timestamp('kyc_reviewed_at'),
  kycReviewNote: text('kyc_review_note'),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  environmentMode: varchar('environment_mode', { length: 20 }).default('sandbox'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const developerApiKeys = pgTable('developer_api_keys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull(),
  keyName: varchar('key_name', { length: 100 }).notNull(),
  apiKey: varchar('api_key', { length: 150 }).unique().notNull(),
  secretKeyHash: varchar('secret_key_hash', { length: 255 }),
  secretKeyLastFour: varchar('secret_key_last_four', { length: 10 }),
  environment: varchar('environment', { length: 20 }).default('sandbox'),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  totalRequests: integer('total_requests').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const developerApiLogs = pgTable('developer_api_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull(),
  apiKeyId: uuid('api_key_id'),
  endpoint: varchar('endpoint', { length: 255 }),
  method: varchar('method', { length: 10 }),
  requestBody: jsonb('request_body'),
  responseBody: jsonb('response_body'),
  statusCode: integer('status_code'),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0'),
  durationMs: integer('duration_ms'),
  ipAddress: varchar('ip_address', { length: 50 }),
  environment: varchar('environment', { length: 20 }).default('sandbox'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const developerTransactions = pgTable('developer_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull(),
  transactionType: varchar('transaction_type', { length: 50 }),
  amount: decimal('amount', { precision: 15, scale: 2 }),
  description: text('description'),
  referenceId: varchar('reference_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('successful'),
  environment: varchar('environment', { length: 20 }).default('live'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const API_PRICES: Record<string, number> = {
  'nin': 130,
  'bvn': 80,
  'education': 250,
  'unified': 400,
  'employment_standard': 350,
  'employment_higher': 450,
  'fraud_score': 50,
};

export const RATE_LIMITS: Record<string, number> = { sandbox: 100, live: 10000 };

export async function checkRateLimit(apiKey: string, environment: string, developerId?: string): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }> {
  const windowMs = 24 * 60 * 60 * 1000;
  let limit = RATE_LIMITS[environment] || 100;

  if (developerId) {
    try {
      const devRow = (await db.execute(sql`
        SELECT custom_rate_limit FROM developer_users WHERE id = ${developerId} LIMIT 1
      `)).rows[0] as any;
      if (devRow?.custom_rate_limit && Number(devRow.custom_rate_limit) > 0) {
        limit = Number(devRow.custom_rate_limit);
      }
    } catch {}
  }

  const now = Date.now();
  const resetTime = now + windowMs;
  const key = `dev_api_${apiKey}`;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key varchar(255) PRIMARY KEY,
        count integer NOT NULL DEFAULT 1,
        reset_time bigint NOT NULL
      )
    `);

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
    const cnt = Number(row.count);
    const storedReset = Number(row.reset_time);

    return {
      allowed: cnt <= limit,
      remaining: Math.max(0, limit - cnt),
      resetAt: storedReset,
      limit,
    };
  } catch (e: any) {
    logger.warn('Developer rate limit DB error, allowing request', { error: e.message });
    return { allowed: true, remaining: limit, resetAt: now + windowMs, limit };
  }
}

const verificationCache = new Map<string, { data: any; expiresAt: number }>();
export const CACHE_TTL: Record<string, number> = { nin: 24 * 3600_000, bvn: 24 * 3600_000 };

export function getCached(key: string): any | null {
  const entry = verificationCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { verificationCache.delete(key); return null; }
  return entry.data;
}
export function setCache(key: string, data: any, ttlMs: number) {
  verificationCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function sandboxNIN(nin: string) {
  return {
    success: true,
    source: 'sandbox',
    data: {
      nin, firstName: 'Arapoint', lastName: 'Test', middleName: 'Sandbox',
      dateOfBirth: '1990-06-15', gender: 'Male',
      phone: '08012345678', email: 'sandbox@arapoint.com.ng',
      address: '1 Sandbox Street, Lagos', photo: null,
      state: 'Lagos', lga: 'Ikeja',
    },
  };
}

export function sandboxBVN(bvn: string) {
  return {
    success: true,
    source: 'sandbox',
    data: {
      bvn, firstName: 'Arapoint', lastName: 'Test', middleName: 'Sandbox',
      dateOfBirth: '1990-06-15', gender: 'Male',
      phone: '08012345678', email: 'sandbox@arapoint.com.ng',
      bankName: 'GTBank', enrollmentBranch: 'Ikeja Main Branch',
      state: 'Lagos', lga: 'Ikeja',
    },
  };
}

export function sandboxEducation(provider: string, registrationNumber: string, examYear: string) {
  return {
    success: true,
    source: 'sandbox',
    data: {
      provider: provider.toUpperCase(),
      registrationNumber,
      examYear,
      candidateName: 'ARAPOINT TEST SANDBOX',
      subjects: [
        { name: 'Mathematics', grade: 'A1' },
        { name: 'English Language', grade: 'B2' },
        { name: 'Physics', grade: 'A1' },
        { name: 'Chemistry', grade: 'B3' },
        { name: 'Biology', grade: 'C4' },
      ],
    },
  };
}

export function sandboxFraudScore(nin: string) {
  return {
    riskScore: 12,
    riskLevel: 'low',
    signals: { multipleAccounts: false, flaggedDevice: false, recentFraudReport: false },
    recommendation: 'Identity appears clean.',
  };
}

export function generateApiKey(env: 'sandbox' | 'live' = 'sandbox'): string {
  const prefix = env === 'live' ? 'ara_live_' : 'ara_sand_';
  return prefix + crypto.randomBytes(24).toString('hex');
}
export function generateSecretKey(env: 'sandbox' | 'live' = 'sandbox'): string {
  const prefix = env === 'live' ? 'ara_sk_live_' : 'ara_sk_sand_';
  return prefix + crypto.randomBytes(32).toString('hex');
}

export async function logApiCall(
  developerId: string,
  apiKeyId: string | null,
  endpoint: string,
  method: string,
  requestBody: any,
  responseBody: any,
  statusCode: number,
  cost: number,
  durationMs: number,
  ipAddress: string,
  environment: string = 'sandbox'
) {
  try {
    await db.insert(developerApiLogs).values({
      developerId,
      apiKeyId,
      endpoint,
      method,
      requestBody,
      responseBody,
      statusCode,
      cost: cost.toFixed(2),
      durationMs,
      ipAddress,
      environment,
    });
  } catch (e) {
    logger.warn('Failed to insert API log', { error: (e as Error).message });
  }
}

export async function apiKeyAuth(req: Request, res: Response, next: Function) {
  const apiKey = (req.headers['x-api-key'] as string) || req.query.api_key as string;
  if (!apiKey) {
    return res.status(401).json({ status: 'error', code: 401, message: 'API key required. Pass X-API-Key header.' });
  }

  const [keyRecord] = await db.select().from(developerApiKeys)
    .where(and(eq(developerApiKeys.apiKey, apiKey), eq(developerApiKeys.isActive, true)))
    .limit(1);

  if (!keyRecord) {
    return res.status(401).json({ status: 'error', code: 401, message: 'Invalid or revoked API key.' });
  }

  const [dev] = await db.select().from(developerUsers)
    .where(and(eq(developerUsers.id, keyRecord.developerId), eq(developerUsers.isActive, true)))
    .limit(1);

  if (!dev) {
    return res.status(401).json({ status: 'error', code: 401, message: 'Developer account not found or inactive.' });
  }

  const allowlist: string[] = (dev as any).ipAllowlist || [];
  if (allowlist.length > 0) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] as string || '';
    const ipOk = allowlist.some(ip => clientIp.includes(ip));
    if (!ipOk) {
      return res.status(403).json({ status: 'error', code: 403, message: 'IP address not on allowlist.' });
    }
  }

  const env = keyRecord.environment || 'sandbox';
  const rateCheck = await checkRateLimit(apiKey, env, dev.id);
  res.setHeader('X-RateLimit-Limit', rateCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  res.setHeader('X-RateLimit-Reset', Math.floor(rateCheck.resetAt / 1000));
  if (!rateCheck.allowed) {
    return res.status(429).json({
      status: 'error', code: 429, message: 'Rate limit exceeded',
      retry_after: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
    });
  }

  await db.update(developerApiKeys)
    .set({ lastUsedAt: new Date(), totalRequests: sql`${developerApiKeys.totalRequests} + 1` })
    .where(eq(developerApiKeys.id, keyRecord.id));

  (req as any).developer = dev;
  (req as any).apiKeyId = keyRecord.id;
  (req as any).apiKeyEnv = env;
  next();
}

export async function devJwtAuth(req: Request, res: Response, next: Function) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', code: 401, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), config.JWT_SECRET) as any;
    if (!decoded.developerId) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid developer token' });
    }
    const [dev] = await db.select().from(developerUsers)
      .where(eq(developerUsers.id, decoded.developerId))
      .limit(1);
    if (!dev || dev.isActive === false) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Account not found' });
    }
    (req as any).developer = dev;
    next();
  } catch {
    res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
  }
}

export async function adminAuth(req: Request, res: Response, next: Function) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', code: 401, message: 'Admin auth required' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), config.JWT_SECRET) as any;
    if (!decoded.adminId && !decoded.id) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid admin token' });
    }
    next();
  } catch {
    res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
  }
}

export function devBalance(dev: any): number {
  const mode = dev.environmentMode || 'sandbox';
  return mode === 'sandbox'
    ? parseFloat(dev.sandboxBalance || '0')
    : parseFloat(dev.walletBalance || '0');
}

export async function deductDeveloperBalance(
  developerId: string,
  amount: number,
  description: string,
  environmentMode: string = 'live'
) {
  const isSandbox = environmentMode === 'sandbox';
  const amtStr = parseFloat(amount.toFixed(2));

  const result = isSandbox
    ? await db.execute(sql`
        UPDATE developer_users
        SET sandbox_balance = sandbox_balance - ${amtStr}, updated_at = now()
        WHERE id = ${developerId} AND sandbox_balance >= ${amtStr}
        RETURNING sandbox_balance AS balance
      `)
    : await db.execute(sql`
        UPDATE developer_users
        SET wallet_balance = wallet_balance - ${amtStr}, updated_at = now()
        WHERE id = ${developerId} AND wallet_balance >= ${amtStr}
        RETURNING wallet_balance AS balance
      `);

  if (!result.rows[0]) throw new Error('Insufficient wallet balance');

  await db.insert(developerTransactions).values({
    developerId,
    transactionType: 'api_charge',
    amount: (-amount).toFixed(2),
    description,
    referenceId: 'DEV-' + crypto.randomBytes(8).toString('hex'),
    status: 'successful',
    environment: environmentMode,
  });

  return parseFloat((result.rows[0] as any).balance || '0');
}
