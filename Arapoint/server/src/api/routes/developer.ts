import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { db } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { sql, eq, ne, desc, and, count } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal
} from 'drizzle-orm/pg-core';
import { otpService } from '../../services/otpService';
import { rpaJobs } from '../../db/schema';
import { runWebhookMigrations, developerWebhookLogs, fireWebhookIfEnabled } from '../../services/webhookService';
import * as paystackService from '../../services/paystackService';
import { objectStorageService, ObjectNotFoundError } from '../../services/objectStorage';

const kybUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// ─── Inline schema (raw SQL tables, not in Drizzle schema.ts) ────────────────
const developerUsers = pgTable('developer_users', {
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

const developerApiKeys = pgTable('developer_api_keys', {
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

const developerApiLogs = pgTable('developer_api_logs', {
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

const developerTransactions = pgTable('developer_transactions', {
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

// ─── Schema migration (idempotent) ───────────────────────────────────────────
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
    // Patch any null is_active rows — these should default to active
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
    // Idempotent column additions for existing tables
    await db.execute(sql`
      ALTER TABLE developer_employment_requests
        ADD COLUMN IF NOT EXISTS queue_status varchar(20) DEFAULT 'queued',
        ADD COLUMN IF NOT EXISTS developer_email varchar(255),
        ADD COLUMN IF NOT EXISTS developer_name varchar(255),
        ADD COLUMN IF NOT EXISTS error_message text,
        ADD COLUMN IF NOT EXISTS completed_at timestamp
    `);
  } catch (e: any) {
    // Column already exists or minor error — safe to ignore
  }
})();

// ─── Developer API Pricing (NGN) ──────────────────────────────────────────────
const API_PRICES: Record<string, number> = {
  'nin': 130,
  'bvn': 80,
  'education': 250,
  'unified': 400,
  'employment_standard': 350,
  'employment_higher': 450,
  'fraud_score': 50,
};

// ─── In-Memory Rate Limiter (sliding 24-hour window) ─────────────────────────
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMITS: Record<string, number> = { sandbox: 100, live: 10000 };

function checkRateLimit(apiKey: string, environment: string): { allowed: boolean; remaining: number; resetAt: number } {
  const windowMs = 24 * 60 * 60 * 1000;
  const limit = RATE_LIMITS[environment] || 100;
  const now = Date.now();
  const entry = rateLimitStore.get(apiKey);

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(apiKey, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.windowStart + windowMs };
}

// ─── In-Memory NIN/BVN Cache (TTL-based) ──────────────────────────────────────
const verificationCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL: Record<string, number> = { nin: 24 * 3600_000, bvn: 24 * 3600_000 };

function getCached(key: string): any | null {
  const entry = verificationCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { verificationCache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: any, ttlMs: number) {
  verificationCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Sandbox Mock Responses ───────────────────────────────────────────────────
function sandboxNIN(nin: string) {
  return {
    success: true,
    source: 'sandbox',
    data: {
      nin, firstName: 'Arapoint', lastName: 'Test', middleName: 'Sandbox',
      dateOfBirth: '1990-06-15', gender: 'Male',
      phone: '08012345678', address: '12 Sandbox Street, Lagos', state: 'Lagos',
    }
  };
}
function sandboxBVN(bvn: string) {
  return {
    success: true,
    source: 'sandbox',
    data: {
      bvn, firstName: 'Arapoint', lastName: 'Test', middleName: 'Sandbox',
      dateOfBirth: '1990-06-15', phone: '08012345678',
      enrollmentBank: 'First Bank', enrollmentBranch: 'Victoria Island',
    }
  };
}
function sandboxEducation(provider: string, registrationNumber: string, examYear: string) {
  return {
    success: true, source: 'sandbox',
    data: {
      provider: provider.toUpperCase(), registrationNumber, examYear,
      candidateName: 'Arapoint Test',
      subjects: [
        { name: 'Mathematics', grade: 'A1', score: 95 },
        { name: 'English Language', grade: 'B2', score: 82 },
        { name: 'Physics', grade: 'B3', score: 76 },
        { name: 'Chemistry', grade: 'C4', score: 68 },
        { name: 'Biology', grade: 'C5', score: 65 },
      ],
      overallResult: 'PASSED',
    }
  };
}
function sandboxFraudScore(nin: string) {
  return {
    success: true, source: 'sandbox',
    nin, riskScore: 12, riskLevel: 'Low',
    signals: { multipleAccounts: false, flaggedDevice: false, recentFraudReport: false },
  };
}

// ─── Helper: generate API key / Secret key ───────────────────────────────────
function generateApiKey(env: 'sandbox' | 'live' = 'sandbox'): string {
  const prefix = env === 'live' ? 'ara_live_' : 'ara_sand_';
  return prefix + crypto.randomBytes(24).toString('hex');
}
function generateSecretKey(env: 'sandbox' | 'live' = 'sandbox'): string {
  const prefix = env === 'live' ? 'ara_sk_live_' : 'ara_sk_sand_';
  return prefix + crypto.randomBytes(32).toString('hex');
}

// ─── Helper: log API call ─────────────────────────────────────────────────────
async function logApiCall(
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

// ─── Middleware: API Key Auth ─────────────────────────────────────────────────
async function apiKeyAuth(req: Request, res: Response, next: Function) {
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

  // ── IP Allowlist check ───────────────────────────────────────────────────
  const allowlist: string[] = (dev as any).ipAllowlist || [];
  if (allowlist.length > 0) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] as string || '';
    const ipOk = allowlist.some(ip => clientIp.includes(ip));
    if (!ipOk) {
      return res.status(403).json({ status: 'error', code: 403, message: 'IP address not on allowlist.' });
    }
  }

  // ── Rate limiting ────────────────────────────────────────────────────────
  const env = keyRecord.environment || 'sandbox';
  const rateCheck = checkRateLimit(apiKey, env);
  res.setHeader('X-RateLimit-Limit', RATE_LIMITS[env] || 100);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  res.setHeader('X-RateLimit-Reset', Math.floor(rateCheck.resetAt / 1000));
  if (!rateCheck.allowed) {
    return res.status(429).json({
      status: 'error', code: 429, message: 'Rate limit exceeded',
      retry_after: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
    });
  }

  // Update last used
  await db.update(developerApiKeys)
    .set({ lastUsedAt: new Date(), totalRequests: sql`${developerApiKeys.totalRequests} + 1` })
    .where(eq(developerApiKeys.id, keyRecord.id));

  (req as any).developer = dev;
  (req as any).apiKeyId = keyRecord.id;
  (req as any).apiKeyEnv = env;
  next();
}

// ─── Middleware: JWT Auth for dashboard ──────────────────────────────────────
async function devJwtAuth(req: Request, res: Response, next: Function) {
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

// ─── Balance helper — returns the active balance for the current mode ──────────
function devBalance(dev: any): number {
  const mode = dev.environmentMode || 'sandbox';
  return mode === 'sandbox'
    ? parseFloat(dev.sandboxBalance || '0')
    : parseFloat(dev.walletBalance || '0');
}

// ─── Wallet deduction helper (mode-aware) ─────────────────────────────────────
async function deductDeveloperBalance(
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

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email required' });
    }
    const existing = await db.select({ id: developerUsers.id }).from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      return res.status(409).json({ status: 'error', code: 409, message: 'Email already registered' });
    }
    await otpService.sendOTP(email.toLowerCase(), 'dev_registration');
    res.json({ status: 'success', code: 200, message: 'OTP sent to your email. Valid for 10 minutes.' });
  } catch (e: any) {
    logger.error('Dev send-otp error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to send OTP' });
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name, company, password, otpCode } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email, name and password required' });
    }
    if (!otpCode) {
      return res.status(400).json({ status: 'error', code: 400, message: 'OTP verification code required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Password must be at least 8 characters' });
    }
    const existing = await db.select({ id: developerUsers.id }).from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      return res.status(409).json({ status: 'error', code: 409, message: 'Email already registered' });
    }
    const otpValid = await otpService.verifyOTP(email.toLowerCase(), otpCode, 'dev_registration');
    if (!otpValid) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Invalid or expired OTP code' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [dev] = await db.insert(developerUsers).values({
      email: email.toLowerCase(),
      name,
      company: company || null,
      passwordHash,
      emailVerified: true,
      environmentMode: 'sandbox',
    }).returning();

    // Auto-create sandbox API keypair on registration
    const sandboxApiKey = generateApiKey('sandbox');
    const sandboxSecretRaw = generateSecretKey('sandbox');
    const sandboxSecretHash = await bcrypt.hash(sandboxSecretRaw, 10);
    await db.insert(developerApiKeys).values({
      developerId: dev.id,
      keyName: 'Sandbox Key',
      apiKey: sandboxApiKey,
      secretKeyHash: sandboxSecretHash,
      secretKeyLastFour: sandboxSecretRaw.slice(-4),
      environment: 'sandbox',
    });

    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      status: 'success', code: 201, message: 'Developer account created',
      data: {
        token,
        developer: { id: dev.id, email: dev.email, name: dev.name, company: dev.company, walletBalance: 0 },
        sandboxCredentials: {
          accountId: dev.id,
          apiKey: sandboxApiKey,
          secretKey: sandboxSecretRaw,
          environment: 'sandbox',
          note: 'Save your Secret Key now — it will not be shown again.',
        },
      }
    });
  } catch (e: any) {
    logger.error('Dev register error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Registration failed' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email and password required' });
    }
    const [dev] = await db.select().from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (!dev || !dev.isActive) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, dev.passwordHash);
    if (!valid) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      status: 'success', code: 200, message: 'Login successful',
      data: {
        token,
        developer: {
          id: dev.id, email: dev.email, name: dev.name,
          company: dev.company, walletBalance: devBalance(dev),
          webhookUrl: dev.webhookUrl,
        }
      }
    });
  } catch (e: any) {
    logger.error('Dev login error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Login failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD ROUTES (JWT protected)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/profile', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  res.json({
    status: 'success', code: 200, message: 'Profile retrieved',
    data: {
      id: dev.id, accountId: dev.id, email: dev.email, name: dev.name,
      company: dev.company, walletBalance: devBalance(dev),
      webhookUrl: dev.webhookUrl, createdAt: dev.createdAt,
      accountType: dev.accountType || 'individual',
      kycStatus: dev.kycStatus || 'not_required',
      emailVerified: dev.emailVerified,
      environmentMode: (dev as any).environmentMode || 'sandbox',
    }
  });
});

router.put('/profile', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { name, company, webhookUrl } = req.body;
    await db.update(developerUsers).set({
      name: name || dev.name,
      company: company !== undefined ? company : dev.company,
      webhookUrl: webhookUrl !== undefined ? webhookUrl : dev.webhookUrl,
      updatedAt: new Date(),
    }).where(eq(developerUsers.id, dev.id));
    res.json({ status: 'success', code: 200, message: 'Profile updated' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update profile' });
  }
});

router.put('/profile/password', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Current and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Password must be at least 8 characters' });
    }
    const valid = await bcrypt.compare(currentPassword, dev.passwordHash);
    if (!valid) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(developerUsers).set({ passwordHash, updatedAt: new Date() })
      .where(eq(developerUsers.id, dev.id));
    res.json({ status: 'success', code: 200, message: 'Password updated successfully' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update password' });
  }
});

// ─── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/dashboard/stats', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const envFilter = (req.query.environment as string) || null;

    const sandboxStats = ((await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_count,
        COALESCE(SUM(cost), 0)::numeric AS total_spent,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS requests_this_month
      FROM developer_api_logs
      WHERE developer_id = ${dev.id} AND environment = 'sandbox'
    `)).rows[0] || {}) as any;

    const liveStats = ((await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_count,
        COALESCE(SUM(cost), 0)::numeric AS total_spent,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS requests_this_month
      FROM developer_api_logs
      WHERE developer_id = ${dev.id} AND environment = 'live'
    `)).rows[0] || {}) as any;

    const activeStats = envFilter === 'live' ? liveStats : envFilter === 'sandbox' ? sandboxStats : (
      (dev as any).environmentMode === 'live' ? liveStats : sandboxStats
    );

    const keyCount = ((await db.execute(sql`
      SELECT COUNT(*)::int AS active_keys FROM developer_api_keys
      WHERE developer_id = ${dev.id} AND is_active = true
    `)).rows[0] || {}) as any;

    const recentLogs = await db.select().from(developerApiLogs)
      .where(and(
        eq(developerApiLogs.developerId, dev.id),
        eq(developerApiLogs.environment, envFilter || (dev as any).environmentMode || 'sandbox')
      ))
      .orderBy(desc(developerApiLogs.createdAt))
      .limit(5);

    res.json({
      status: 'success', code: 200, message: 'Stats retrieved',
      data: {
        walletBalance: devBalance(dev),
        sandboxBalance: parseFloat((dev as any).sandboxBalance || '0'),
        totalRequests: activeStats.total_requests || 0,
        successCount: activeStats.success_count || 0,
        totalSpent: parseFloat(activeStats.total_spent || '0'),
        requestsThisMonth: activeStats.requests_this_month || 0,
        successRate: activeStats.total_requests > 0
          ? Math.round((activeStats.success_count / activeStats.total_requests) * 100)
          : 0,
        activeApiKeys: keyCount.active_keys || 0,
        recentLogs,
        kycStatus: dev.kycStatus || 'not_required',
        environmentMode: (dev as any).environmentMode || 'sandbox',
        accountType: dev.accountType || 'individual',
        sandbox: {
          totalRequests: sandboxStats.total_requests || 0,
          successCount: sandboxStats.success_count || 0,
          totalSpent: parseFloat(sandboxStats.total_spent || '0'),
          requestsThisMonth: sandboxStats.requests_this_month || 0,
        },
        live: {
          totalRequests: liveStats.total_requests || 0,
          successCount: liveStats.success_count || 0,
          totalSpent: parseFloat(liveStats.total_spent || '0'),
          requestsThisMonth: liveStats.requests_this_month || 0,
        },
      }
    });
  } catch (e: any) {
    logger.error('Dev stats error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get stats' });
  }
});

// ─── API Keys ─────────────────────────────────────────────────────────────────
router.get('/api-keys', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const keys = await db.select().from(developerApiKeys)
    .where(eq(developerApiKeys.developerId, dev.id))
    .orderBy(desc(developerApiKeys.createdAt));
  res.json({ status: 'success', code: 200, message: 'API keys retrieved', data: { keys } });
});

router.post('/api-keys', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { keyName, environment = 'sandbox' } = req.body;
    if (!keyName) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Key name required' });
    }
    if (!['sandbox', 'live'].includes(environment)) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Environment must be sandbox or live' });
    }
    // Live keys require approved KYB
    if (environment === 'live' && dev.kycStatus !== 'approved') {
      return res.status(403).json({ status: 'error', code: 403, message: 'Live API keys require approved business verification (KYB)' });
    }
    const existing = await db.select({ id: developerApiKeys.id }).from(developerApiKeys)
      .where(and(eq(developerApiKeys.developerId, dev.id), eq(developerApiKeys.isActive, true)));
    if (existing.length >= 10) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Maximum 10 active API keys allowed' });
    }
    const apiKey = generateApiKey(environment as 'sandbox' | 'live');
    const secretRaw = generateSecretKey(environment as 'sandbox' | 'live');
    const secretHash = await bcrypt.hash(secretRaw, 10);
    const [key] = await db.insert(developerApiKeys).values({
      developerId: dev.id,
      keyName,
      apiKey,
      secretKeyHash: secretHash,
      secretKeyLastFour: secretRaw.slice(-4),
      environment,
    }).returning();
    res.status(201).json({
      status: 'success', code: 201, message: 'API key created',
      data: {
        key: { ...key, secretKey: secretRaw },
        note: 'Save your Secret Key now — it will not be shown again.',
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to create API key' });
  }
});

router.delete('/api-keys/:id', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const [key] = await db.select().from(developerApiKeys)
      .where(and(eq(developerApiKeys.id, req.params.id), eq(developerApiKeys.developerId, dev.id)))
      .limit(1);
    if (!key) {
      return res.status(404).json({ status: 'error', code: 404, message: 'API key not found' });
    }
    await db.update(developerApiKeys).set({ isActive: false })
      .where(eq(developerApiKeys.id, req.params.id));
    res.json({ status: 'success', code: 200, message: 'API key revoked' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to revoke key' });
  }
});

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const environment = (req.query.environment as string) || null;
  const whereClause = environment
    ? and(eq(developerTransactions.developerId, dev.id), eq(developerTransactions.environment, environment))
    : eq(developerTransactions.developerId, dev.id);
  const txs = await db.select().from(developerTransactions)
    .where(whereClause)
    .orderBy(desc(developerTransactions.createdAt))
    .limit(limit).offset(offset);
  res.json({ status: 'success', code: 200, message: 'Transactions retrieved', data: { transactions: txs, page, limit, environment: environment || 'all' } });
});

// ─── Admin-only: directly credit a developer wallet (sandbox top-up) ──────────
// This route is protected by adminAuth — developers cannot call it directly.
// Use POST /admin/developers/:id/credit-sandbox for the admin portal action.
router.post('/wallet/fund', adminAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { amount } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Minimum fund amount is ₦100' });
    }
    if (amount > 1000000) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Maximum fund amount is ₦1,000,000' });
    }
    const [updated] = await db.update(developerUsers)
      .set({ walletBalance: sql`wallet_balance + ${parseFloat(amount).toFixed(2)}` })
      .where(eq(developerUsers.id, dev.id))
      .returning({ walletBalance: developerUsers.walletBalance });

    await db.insert(developerTransactions).values({
      developerId: dev.id,
      transactionType: 'wallet_funding',
      amount: parseFloat(amount).toFixed(2),
      description: 'Wallet funded',
      referenceId: 'FUND-' + crypto.randomBytes(8).toString('hex'),
      status: 'successful',
      environment: 'live',
    });

    // Email notification for wallet funding
    try {
      const { sendEmail } = await import('../../services/emailService');
      const newBal = parseFloat(updated.walletBalance || '0');
      await sendEmail(dev.email,
        `Wallet Funded — ₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} Added`,
        `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px">
          <div style="margin-bottom:20px"><span style="background:#059669;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600">Wallet Funded</span></div>
          <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 12px">Hi ${dev.name}, your wallet has been topped up!</h1>
          <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:16px;margin-bottom:20px">
            <p style="margin:0 0 8px;color:#6b7280;font-size:12px">AMOUNT ADDED</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#34d399">₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">New balance: <strong style="color:#fff">₦${newBal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></p>
          </div>
          <a href="https://arapoint.com.ng/developer/billing" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">View Billing</a>
          <p style="margin-top:24px;color:#475569;font-size:12px">Arapoint Developer Portal · arapoint.com.ng</p>
        </div>`
      );
    } catch {}

    res.json({
      status: 'success', code: 200, message: 'Wallet funded successfully',
      data: { newBalance: parseFloat(updated.walletBalance || '0'), amount }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fund wallet' });
  }
});

// ─── GET /billing/gateway-status — developer polls before showing Fund button ──
// Returns whether Paystack is configured (admin_settings or env var) + dev mode
router.get('/billing/gateway-status', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  try {
    // Check admin_settings table for paystack key (admin-configured), fall back to env
    const settingRow = (await db.execute(sql`
      SELECT setting_value FROM admin_settings WHERE setting_key = 'paystack_secret_key' LIMIT 1
    `)).rows[0] as any;
    const paystackConfigured = !!(process.env.PAYSTACK_SECRET_KEY || settingRow?.setting_value);
    res.json({
      status: 'success', code: 200,
      data: {
        paystackConfigured,
        developerMode: (dev as any).environmentMode || 'sandbox',
        sandboxFundingAvailable: false, // sandbox funding is admin-only credit
      },
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to check gateway status' });
  }
});

// ─── Admin: credit a developer sandbox wallet ─────────────────────────────────
router.post('/admin/developers/:id/credit-sandbox', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Amount must be greater than 0' });
  }
  if (amt > 5000000) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Maximum credit per operation is ₦5,000,000' });
  }
  try {
    // Resolve developer
    const devRow = (await db.execute(sql`
      SELECT id, email, name, environment_mode FROM developer_users WHERE id = ${id} LIMIT 1
    `)).rows[0] as any;
    if (!devRow) return res.status(404).json({ status: 'error', code: 404, message: 'Developer not found' });

    const [updated] = await db.update(developerUsers)
      .set({ sandboxBalance: sql`sandbox_balance + ${amt.toFixed(2)}`, updatedAt: new Date() })
      .where(eq(developerUsers.id, id))
      .returning({ sandboxBalance: developerUsers.sandboxBalance });

    const reference = 'ADMIN-SANDBOX-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const desc = reason?.trim()
      ? `Admin sandbox credit — ${reason.trim()}`
      : 'Admin sandbox wallet credit';

    await db.insert(developerTransactions).values({
      developerId: id,
      transactionType: 'wallet_funding',
      amount: amt.toFixed(2),
      description: desc,
      referenceId: reference,
      status: 'successful',
      environment: 'sandbox',
    });

    // Email developer
    try {
      const { sendEmail } = await import('../../services/emailService');
      const newBal = parseFloat(updated.sandboxBalance || '0');
      await sendEmail(
        devRow.email,
        `Sandbox Wallet Credited — ₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })} Added`,
        `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px">
          <div style="margin-bottom:20px"><span style="background:#059669;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600">Sandbox Credit</span></div>
          <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 12px">Hi ${devRow.name}, your sandbox wallet has been credited!</h1>
          <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:16px;margin-bottom:16px">
            <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Amount Credited</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#34d399">₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">New balance: <strong style="color:#fff">₦${newBal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></p>
          </div>
          ${reason?.trim() ? `<p style="color:#94a3b8;font-size:13px;margin:0 0 16px">Note: ${reason.trim()}</p>` : ''}
          <p style="color:#6b7280;font-size:12px;margin:0 0 4px">Reference: <span style="color:#9ca3af;font-family:monospace">${reference}</span></p>
          <p style="margin-top:24px;color:#475569;font-size:12px">Arapoint Developer Portal · developers.arapoint.com.ng</p>
        </div>`
      );
    } catch {}

    logger.info('Admin credited developer sandbox wallet', { developerId: id, amt, reference });
    res.json({
      status: 'success', code: 200,
      message: `Sandbox wallet credited ₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })} successfully`,
      data: { developerId: id, amount: amt, newSandboxBalance: parseFloat(updated.sandboxBalance || '0'), reference },
    });
  } catch (e: any) {
    logger.error('Admin credit sandbox error', { error: e.message, developerId: id });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to credit wallet' });
  }
});

// ─── Switch environment mode (sandbox / live) ─────────────────────────────────
router.patch('/mode', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { mode } = req.body;
    if (!['sandbox', 'live'].includes(mode)) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Mode must be sandbox or live' });
    }
    if (mode === 'live' && dev.kycStatus !== 'approved') {
      return res.status(403).json({ status: 'error', code: 403, message: 'KYB approval required to switch to live mode' });
    }
    await db.update(developerUsers).set({ environmentMode: mode, updatedAt: new Date() })
      .where(eq(developerUsers.id, dev.id));
    const newBalance = mode === 'sandbox'
      ? parseFloat((dev as any).sandboxBalance || '0')
      : parseFloat(dev.walletBalance || '0');
    res.json({ status: 'success', code: 200, message: `Switched to ${mode} mode`, data: { mode, walletBalance: newBalance } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to switch mode' });
  }
});

// ─── API Logs ─────────────────────────────────────────────────────────────────
router.get('/logs', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const environment = (req.query.environment as string) || (dev as any).environmentMode || 'sandbox';
  const logs = await db.select().from(developerApiLogs)
    .where(and(
      eq(developerApiLogs.developerId, dev.id),
      eq(developerApiLogs.environment, environment)
    ))
    .orderBy(desc(developerApiLogs.createdAt))
    .limit(limit).offset(offset);
  res.json({ status: 'success', code: 200, message: 'Logs retrieved', data: { logs, page, limit, environment } });
});

// ─── Pricing info ─────────────────────────────────────────────────────────────
router.get('/pricing', async (req: Request, res: Response) => {
  res.json({
    status: 'success', code: 200, message: 'Developer API pricing',
    data: {
      pricing: [
        { service: 'NIN Verification', endpoint: 'POST /api/v1/developer/verify/nin', price: API_PRICES.nin, currency: 'NGN' },
        { service: 'BVN Verification', endpoint: 'POST /api/v1/developer/verify/bvn', price: API_PRICES.bvn, currency: 'NGN' },
        { service: 'Education Verification', endpoint: 'POST /api/v1/developer/verify/education', price: API_PRICES.education, currency: 'NGN' },
        { service: 'Unified Verification', endpoint: 'POST /api/v1/developer/verify/unified', price: API_PRICES.unified, currency: 'NGN' },
      ]
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION API ENDPOINTS (API Key auth)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/verify/nin', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, phone } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!nin && !phone) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'NIN or phone number required' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.nin, `NIN verification - ${nin || phone}`, (dev as any).environmentMode);

    // ── Sandbox mock ────────────────────────────────────────────────────────
    if ((dev as any).environmentMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'NIN verification completed (sandbox)',
        data: { verification: sandboxNIN(nin || phone) }
      };
      return res.json(responseData);
    }

    // ── Cache check ─────────────────────────────────────────────────────────
    const cacheKey = `nin:${nin || phone}`;
    const cached = getCached(cacheKey);
    if (cached) {
      responseData = { status: 'success', code: 200, message: 'NIN verification completed (cached)', data: { verification: cached } };
      return res.json(responseData);
    }

    // Call internal NIN service
    const { premblyService } = await import('../../services/premblyService');
    let result;
    try {
      if (nin) {
        result = await premblyService.verifyNIN(nin);
      } else {
        result = await premblyService.verifyNINWithPhone(phone);
      }
      if (result && !result.error) setCache(cacheKey, result, CACHE_TTL.nin);
    } catch (serviceErr: any) {
      result = { error: serviceErr.message };
    }

    responseData = {
      status: 'success', code: 200, message: 'NIN verification completed',
      data: { verification: result }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/nin', 'POST', { nin, phone },
      responseData, statusCode, statusCode === 200 ? API_PRICES.nin : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.post('/verify/bvn', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { bvn } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!bvn) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN required' };
      return res.status(400).json(responseData);
    }
    if (!/^\d{11}$/.test(bvn)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN must be 11 digits' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.bvn, `BVN verification - ${bvn}`, (dev as any).environmentMode);

    // ── Sandbox mock ────────────────────────────────────────────────────────
    if ((dev as any).environmentMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'BVN verification completed (sandbox)',
        data: { verification: sandboxBVN(bvn) }
      };
      return res.json(responseData);
    }

    // ── Cache check ─────────────────────────────────────────────────────────
    const bvnCacheKey = `bvn:${bvn}`;
    const bvnCached = getCached(bvnCacheKey);
    if (bvnCached) {
      responseData = { status: 'success', code: 200, message: 'BVN verification completed (cached)', data: { verification: bvnCached } };
      return res.json(responseData);
    }

    const { premblyService } = await import('../../services/premblyService');
    let result;
    try {
      result = await premblyService.verifyBVN(bvn);
      if (result && !result.error) setCache(bvnCacheKey, result, CACHE_TTL.bvn);
    } catch (serviceErr: any) {
      result = { error: serviceErr.message };
    }

    responseData = {
      status: 'success', code: 200, message: 'BVN verification completed',
      data: { verification: result }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/bvn', 'POST', { bvn },
      responseData, statusCode, statusCode === 200 ? API_PRICES.bvn : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.post('/verify/education', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const {
    provider,
    examYear,
    registrationNumber,
    examType,
    cardPin,
    cardSerialNumber,
    state,
    schoolName,
    examMonth,
  } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    const validProviders = ['waec', 'neco', 'nabteb', 'nbais', 'jamb'];
    if (!provider || !validProviders.includes(provider.toLowerCase())) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: `provider required. Valid values: ${validProviders.join(', ')}` };
      return res.status(400).json(responseData);
    }

    const p = provider.toLowerCase();
    const missing: string[] = [];

    if (!registrationNumber) missing.push('registrationNumber');
    if (!examYear) missing.push('examYear');
    if (!examType) missing.push('examType');

    if (p === 'neco') {
      if (!cardPin) missing.push('cardPin (NECO token)');
    } else if (p === 'waec') {
      if (!cardPin) missing.push('cardPin (scratch-card PIN)');
      if (!cardSerialNumber) missing.push('cardSerialNumber (scratch-card serial number)');
    } else if (p === 'nabteb') {
      if (!cardPin) missing.push('cardPin (scratch-card PIN)');
      if (!cardSerialNumber) missing.push('cardSerialNumber (card serial number)');
    } else if (p === 'nbais') {
      if (!examMonth) missing.push('examMonth (e.g. MAY or NOV)');
      if (!state) missing.push('state (candidate state of origin)');
      if (!schoolName) missing.push('schoolName (candidate school name)');
      if (!cardPin) missing.push('cardPin (scratch-card PIN)');
    }

    if (missing.length > 0) {
      statusCode = 400;
      responseData = {
        status: 'error', code: 400,
        message: `Missing required fields for ${p.toUpperCase()}: ${missing.join(', ')}`,
      };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.education,
      `Education verification - ${provider.toUpperCase()} ${registrationNumber}`, (dev as any).environmentMode);

    // ── Sandbox mock ────────────────────────────────────────────────────────
    if ((dev as any).environmentMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'Education verification completed (sandbox)',
        data: {
          provider: provider.toUpperCase(), examYear, registrationNumber,
          status: 'completed', source: 'sandbox',
          result: sandboxEducation(provider, registrationNumber, examYear?.toString()),
        }
      };
      return res.json(responseData);
    }

    const serviceTypeMap: Record<string, string> = {
      waec: 'waec_result',
      neco: 'neco_result',
      nabteb: 'nabteb_result',
      nbais: 'nbais_result',
      jamb: 'jamb_score',
    };
    const serviceType = serviceTypeMap[p] || `${p}_result`;

    const [job] = await db.insert(rpaJobs).values({
      serviceType,
      queryData: {
        registrationNumber,
        examYear: parseInt(String(examYear), 10),
        examType: examType || provider.toUpperCase(),
        ...(cardPin        ? { cardPin }        : {}),
        ...(cardSerialNumber ? { cardSerialNumber } : {}),
        ...(state          ? { state }          : {}),
        ...(schoolName     ? { schoolName }     : {}),
        ...(examMonth      ? { examMonth }      : {}),
        source: 'developer_api',
        developerId: dev.id,
      },
      status: 'pending',
      priority: 0,
    }).returning({ id: rpaJobs.id });

    responseData = {
      status: 'success', code: 200, message: 'Education verification queued',
      data: {
        provider: provider.toUpperCase(),
        examYear,
        registrationNumber,
        status: 'processing',
        jobId: job.id,
        note: 'Results will be available in 1-3 minutes. Poll GET /verify/education/result?jobId=<jobId>',
      }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/education', 'POST',
      { provider, examYear, registrationNumber, examType,
        cardPin: cardPin ? '***' : undefined, cardSerialNumber, state, schoolName, examMonth },
      responseData, statusCode, statusCode === 200 ? API_PRICES.education : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.get('/verify/education/result', apiKeyAuth, async (req: Request, res: Response) => {
  const { jobId } = req.query;
  if (!jobId) {
    return res.status(400).json({ status: 'error', code: 400, message: 'jobId required' });
  }
  try {
    const [job] = await db.select().from(rpaJobs)
      .where(eq(rpaJobs.id, jobId as string)).limit(1);
    if (!job) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Job not found' });
    }
    res.json({
      status: 'success', code: 200, message: 'Job status retrieved',
      data: {
        jobId: job.id,
        status: job.status,
        result: job.result || null,
        error: job.errorMessage || null,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get result' });
  }
});

router.post('/verify/unified', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, bvn, education } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!nin && !bvn && !education) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'At least one of nin, bvn, or education required' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.unified,
      `Unified verification - ${[nin && 'NIN', bvn && 'BVN', education && 'Education'].filter(Boolean).join(', ')}`, (dev as any).environmentMode);

    const results: any = { status: 'success', requestId: 'UNI-' + crypto.randomBytes(8).toString('hex') };

    if (nin) {
      try {
        const { premblyService } = await import('../../services/premblyService');
        results.nin = await premblyService.verifyNIN(nin);
      } catch (e: any) {
        results.nin = { error: e.message };
      }
    }
    if (bvn) {
      try {
        const { premblyService } = await import('../../services/premblyService');
        results.bvn = await premblyService.verifyBVN(bvn);
      } catch (e: any) {
        results.bvn = { error: e.message };
      }
    }
    if (education) {
      results.education = {
        status: 'processing',
        note: 'Education results processed separately via RPA. Use /verify/education endpoint for specific results.',
      };
    }

    responseData = { status: 'success', code: 200, message: 'Unified verification completed', data: results };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/unified', 'POST', { nin, bvn, education },
      responseData, statusCode, statusCode === 200 ? API_PRICES.unified : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYMENT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

// ── Employment verification helpers ───────────────────────────────────────────

function normaliseName(s: string = ''): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Jaro similarity between two strings */
function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  const matchDist = Math.floor(Math.max(la, lb) / 2) - 1;
  const aMatch = new Array(la).fill(false);
  const bMatch = new Array(lb).fill(false);
  let matches = 0, transpositions = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - matchDist), end = Math.min(i + matchDist + 1, lb);
    for (let j = start; j < end; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  return (matches / la + matches / lb + (matches - transpositions / 2) / matches) / 3;
}

/** Jaro-Winkler similarity (0.0 – 1.0) */
function jaroWinklerSimilarity(a: string, b: string): number {
  const jaro = jaroSimilarity(a, b);
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix++;
  return parseFloat((jaro + prefix * 0.1 * (1 - jaro)).toFixed(4));
}

/**
 * Returns a similarity score 0.00 – 1.00 between two full names.
 * Uses Jaro-Winkler on full strings AND on individual tokens (handles
 * different ordering like "Doe John" vs "John Doe").
 */
function nameSimilarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normaliseName(a), nb = normaliseName(b);
  if (na === nb) return 1;
  const fullScore = jaroWinklerSimilarity(na, nb);
  const aWords = na.split(' ').filter(Boolean);
  const bWords = nb.split(' ').filter(Boolean);
  let tokenScore = 0;
  if (aWords.length > 0 && bWords.length > 0) {
    const total = aWords.reduce((sum, aw) => {
      const best = bWords.reduce((m, bw) => Math.max(m, jaroWinklerSimilarity(aw, bw)), 0);
      return sum + best;
    }, 0);
    tokenScore = total / aWords.length;
  }
  return parseFloat(Math.max(fullScore, tokenScore).toFixed(4));
}

/** Returns true when the name similarity score is at or above the acceptance threshold (0.72) */
function namesMatch(a: string, b: string): boolean {
  return nameSimilarityScore(a, b) >= 0.72;
}

function dobsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const clean = (d: string) => d.replace(/[^0-9]/g, '');
  return clean(a).includes(clean(b).substring(0, 6)) || clean(b).includes(clean(a).substring(0, 6));
}

/** Validate chronological consistency between DOB, SSCE exam year, and employment year */
function validateTimeline(dob: string | null, ssceYear: number | null, employmentYear: number): {
  valid: boolean; ageAtEmployment: number | null; ageAtExam: number | null; issues: string[];
} {
  const issues: string[] = [];
  if (!dob) {
    return { valid: false, ageAtEmployment: null, ageAtExam: null, issues: ['Date of birth unavailable for timeline check'] };
  }
  // Parse birth year from YYYY-MM-DD or DD-MM-YYYY formats
  let birthYear: number | null = null;
  const parts = dob.replace(/[^\d]/g, '-').split('-').filter(Boolean);
  for (const p of parts) {
    const y = parseInt(p, 10);
    if (y >= 1940 && y <= new Date().getFullYear() - 5) { birthYear = y; break; }
  }
  if (!birthYear) {
    return { valid: false, ageAtEmployment: null, ageAtExam: null, issues: ['Could not parse date of birth for timeline check'] };
  }
  const ageAtEmployment = employmentYear - birthYear;
  let ageAtExam: number | null = null;
  if (ageAtEmployment < 18) {
    issues.push(`Age at employment year ${employmentYear} is ${ageAtEmployment} — below minimum working age of 18`);
  } else if (ageAtEmployment > 80) {
    issues.push(`Age at employment year ${employmentYear} is ${ageAtEmployment} — unusually high, please verify`);
  }
  if (ssceYear !== null) {
    ageAtExam = ssceYear - birthYear;
    if (ageAtExam < 13) {
      issues.push(`Age at SSCE exam year ${ssceYear} would be ${ageAtExam} — too young for SSCE`);
    } else if (ageAtExam > 35) {
      issues.push(`Age at SSCE exam year ${ssceYear} would be ${ageAtExam} — unusually old for SSCE`);
    }
    if (ssceYear > employmentYear) {
      issues.push(`SSCE exam year (${ssceYear}) is after employment year (${employmentYear})`);
    }
  }
  return { valid: issues.length === 0, ageAtEmployment, ageAtExam, issues };
}

function labelScore(score: number): { label: string; level: string } {
  if (score >= 90) return { label: 'Very High Confidence', level: 'A' };
  if (score >= 75) return { label: 'High Confidence', level: 'B' };
  if (score >= 55) return { label: 'Moderate Confidence', level: 'C' };
  if (score >= 35) return { label: 'Low Confidence', level: 'D' };
  return { label: 'Very Low Confidence', level: 'F' };
}

function toDecision(score: number): 'PASS' | 'REVIEW' | 'FAIL' {
  if (score >= 85) return 'PASS';
  if (score >= 60) return 'REVIEW';
  return 'FAIL';
}

/**
 * POST /verify/employment
 *
 * Unified employment background-check pipeline:
 *   1. Enforces explicit candidate consent
 *   2. Verifies NIN + BVN in parallel via Prembly
 *   3. Cross-matches name (Jaro-Winkler fuzzy similarity) and DOB
 *   4. Validates chronological timeline (age at exam, age at employment ≥ 18)
 *   5. Queues an RPA job for SSCE/JAMB education verification (optional)
 *   6. Returns a weighted trust score and a PASS / REVIEW / FAIL decision
 *
 * Scoring weights:
 *   NIN verified          20 pts
 *   BVN verified          20 pts
 *   Name match (fuzzy)    20 pts  (graduated: similarity × 20)
 *   DOB consistency       15 pts
 *   Timeline validity     10 pts
 *   SSCE verified         15 pts  (pending while RPA processes)
 *   ─────────────────────────────
 *   Total possible        100 pts  (85 if SSCE not requested)
 *
 * Decision thresholds:
 *   ≥ 85 → PASS  |  60–84 → REVIEW  |  < 60 → FAIL
 */
/**
 * POST /verify/employment
 *
 * Fully async — returns a requestId immediately (202 Accepted).
 * Background processing:
 *   • NIN + BVN  → Prembly API (direct, parallel)
 *   • SSCE        → RPA queue (WAEC / NECO / NABTEB / NBAIS)
 *
 * Poll: GET /verify/employment/result/:requestId
 */
router.post('/verify/employment', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, bvn, ssce, level = 'standard', employment_year, consent } = req.body;
  let statusCode = 202;
  let responseData: any;
  const empYear = employment_year ? parseInt(employment_year, 10) : new Date().getFullYear();

  try {
    // ── Consent enforcement ─────────────────────────────────────────────────
    if (consent !== true) {
      statusCode = 400;
      responseData = {
        status: 'error', code: 400,
        message: 'Candidate consent is required. Set consent: true to confirm the candidate has given explicit authorisation for their data to be verified.',
      };
      return res.status(400).json(responseData);
    }

    // ── Input validation ────────────────────────────────────────────────────
    if (!nin || !bvn) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Both nin and bvn are required for employment verification' };
      return res.status(400).json(responseData);
    }
    if (!/^\d{11}$/.test(nin)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'NIN must be exactly 11 digits' };
      return res.status(400).json(responseData);
    }
    if (!/^\d{11}$/.test(bvn)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN must be exactly 11 digits' };
      return res.status(400).json(responseData);
    }
    if (isNaN(empYear) || empYear < 2000 || empYear > new Date().getFullYear() + 5) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'employment_year must be a valid year (2000 – current year + 5)' };
      return res.status(400).json(responseData);
    }
    if (ssce) {
      const validProviders = ['waec', 'neco', 'nabteb', 'nbais'];
      const providerLower = ssce.provider?.toLowerCase();

      if (!providerLower || !validProviders.includes(providerLower)) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `ssce.provider must be one of: ${validProviders.join(', ')}` };
        return res.status(400).json(responseData);
      }
      if (!ssce.examYear || !ssce.registrationNumber) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: 'ssce.examYear and ssce.registrationNumber are required when providing ssce' };
        return res.status(400).json(responseData);
      }
      // cardPin required for all providers.
      // NECO calls it a "token"; WAEC/NABTEB/NBAIS call it a PIN.
      if (!ssce.cardPin) {
        const pinLabel = providerLower === 'neco' ? 'ssce.cardPin (token)' : 'ssce.cardPin (scratch-card PIN)';
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `${pinLabel} is required for ${providerLower.toUpperCase()} verification` };
        return res.status(400).json(responseData);
      }
      // cardSerialNumber required for WAEC, NABTEB, NBAIS (not for NECO)
      const requiresSerial = ['waec', 'nabteb', 'nbais'].includes(providerLower);
      if (requiresSerial && !ssce.cardSerialNumber) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `ssce.cardSerialNumber (scratch-card serial) is required for ${providerLower.toUpperCase()} verification` };
        return res.status(400).json(responseData);
      }
    }

    // ── Deduct balance up-front ─────────────────────────────────────────────
    const priceKey = level === 'higher' ? 'employment_higher' : 'employment_standard';
    await deductDeveloperBalance(dev.id, API_PRICES[priceKey],
      `Employment verification (${level}) — NIN ${nin.substring(0, 4)}***`, (dev as any).environmentMode);

    const requestId = 'EMP-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    // ── Sandbox: return completed result immediately ─────────────────────────
    if ((dev as any).environmentMode === 'sandbox') {
      const ninSandbox = sandboxNIN(nin);
      const bvnSandbox = sandboxBVN(bvn);
      const ninName = `${ninSandbox.data.firstName} ${ninSandbox.data.lastName}`;
      const bvnName = `${bvnSandbox.data.firstName} ${bvnSandbox.data.lastName}`;
      const nameScore = nameSimilarityScore(ninName, bvnName);
      const timeline = validateTimeline(ninSandbox.data.dateOfBirth, ssce?.examYear ? parseInt(ssce.examYear, 10) : null, empYear);
      statusCode = 200;
      responseData = {
        status: 'success', code: 200, message: 'Employment verification completed (sandbox)',
        data: {
          requestId, level, queueStatus: 'completed', processedAt: new Date().toISOString(),
          decision: 'PASS', flags: [],
          checks: { identity_match: true, name_match_score: nameScore, dob_match: true, education_verified: !!ssce, timeline_valid: timeline.valid },
          confidence: { score: 100, label: 'Very High Confidence', grade: 'A', earned: 100, maxPossible: 100 },
          checkpoints: {
            nin:  { checkpoint: 'NIN Verification', status: 'verified', weight: '20 pts', earned: 20, data: ninSandbox.data },
            bvn:  { checkpoint: 'BVN Verification', status: 'verified', weight: '20 pts', earned: 20, data: bvnSandbox.data },
            crossMatch: {
              checkpoint: 'Identity Cross-Reference (NIN ↔ BVN)', status: 'completed',
              nameMatch: { result: true, score: nameScore, earned: 20, weight: '20 pts', ninName, bvnName },
              dobMatch:  { result: true, earned: 15, weight: '15 pts', ninDob: ninSandbox.data.dateOfBirth, bvnDob: bvnSandbox.data.dateOfBirth },
            },
            timeline: {
              checkpoint: 'Timeline Validation', status: 'passed', weight: '10 pts', earned: 10,
              employmentYear: empYear, ageAtEmployment: timeline.ageAtEmployment, ageAtExam: timeline.ageAtExam, issues: [],
            },
            ...(ssce ? {
              ssce: {
                checkpoint: 'SSCE / Qualifications Check', status: 'completed', weight: '15 pts', earned: 15,
                provider: ssce.provider.toUpperCase(),
                data: sandboxEducation(ssce.provider, ssce.registrationNumber, ssce.examYear?.toString()),
              },
            } : {}),
          },
          consentRecorded: { given: true, timestamp: new Date().toISOString() },
        },
      };
      return res.json(responseData);
    }

    // ── LIVE: Insert queue record immediately, return 202 ─────────────────────
    await db.execute(sql`
      INSERT INTO developer_employment_requests
        (id, developer_id, nin, bvn, employment_year, level, consent_given, consent_at,
         ssce_provider, queue_status, developer_email, developer_name)
      VALUES
        (${requestId}, ${dev.id},
         ${nin.substring(0, 4) + '***'}, ${bvn.substring(0, 4) + '***'},
         ${empYear}, ${level}, true, now(),
         ${ssce?.provider?.toUpperCase() || null},
         'queued',
         ${dev.email || null}, ${dev.name || null})
    `);

    responseData = {
      status: 'accepted', code: 202,
      message: 'Employment verification queued. Poll the result endpoint for status.',
      data: {
        requestId,
        level,
        queueStatus: 'queued',
        submittedAt: new Date().toISOString(),
        pollUrl: `GET /verify/employment/result/${requestId}`,
        estimatedTime: ssce ? '60–120 seconds (SSCE lookup via RPA)' : '5–15 seconds (identity checks only)',
        checks: {
          nin: 'queued',
          bvn: 'queued',
          ...(ssce ? { ssce: `queued — ${ssce.provider.toUpperCase()} (${ssce.examYear})` } : {}),
        },
      },
    };
    res.status(202).json(responseData);

    // ── BACKGROUND: Process NIN + BVN via Prembly, SSCE via RPA ─────────────
    setImmediate(async () => {
      try {
        // Mark as processing
        await db.execute(sql`
          UPDATE developer_employment_requests SET queue_status = 'processing' WHERE id = ${requestId}
        `);

        const { premblyService } = await import('../../services/premblyService');
        const [ninResult, bvnResult] = await Promise.allSettled([
          premblyService.verifyNIN(nin),
          premblyService.verifyBVN(bvn),
        ]);

        const ninRes = ninResult.status === 'fulfilled' ? ninResult.value : { success: false, error: (ninResult.reason as Error)?.message || 'NIN lookup failed' };
        const bvnRes = bvnResult.status === 'fulfilled' ? bvnResult.value : { success: false, error: (bvnResult.reason as Error)?.message || 'BVN lookup failed' };

        const ninOk = ninRes.success === true;
        const bvnOk = bvnRes.success === true;
        const ninData = (ninRes as any).data || null;
        const bvnData = (bvnRes as any).data || null;

        const ninFullName = `${ninData?.firstName || ''} ${ninData?.lastName || ''}`.trim();
        const bvnFullName = `${bvnData?.firstName || ''} ${bvnData?.lastName || ''}`.trim();
        const nameScore = (ninOk && bvnOk) ? nameSimilarityScore(ninFullName, bvnFullName) : 0;
        const nameMatchPass = nameScore >= 0.72;
        const dobMatchPass = (ninOk && bvnOk) ? dobsMatch(ninData?.dateOfBirth || '', bvnData?.dateOfBirth || '') : false;

        const dob = ninData?.dateOfBirth || bvnData?.dateOfBirth || null;
        const ssceYear = ssce?.examYear ? parseInt(ssce.examYear, 10) : null;
        const timeline = validateTimeline(dob, ssceYear, empYear);

        const flags: string[] = [];
        if (!ninOk) flags.push(`NIN verification failed: ${(ninRes as any).error || 'unknown error'}`);
        if (!bvnOk) flags.push(`BVN verification failed: ${(bvnRes as any).error || 'unknown error'}`);
        if (ninOk && bvnOk && !nameMatchPass) flags.push(`Name mismatch between NIN and BVN (similarity: ${nameScore.toFixed(2)})`);
        if (ninOk && bvnOk && !dobMatchPass) flags.push('Date of birth mismatch between NIN and BVN');
        flags.push(...timeline.issues);

        const WEIGHTS = { nin: 20, bvn: 20, nameMatch: 20, dobMatch: 15, timeline: 10, ssce: 15 };
        const ninEarned      = ninOk ? WEIGHTS.nin : 0;
        const bvnEarned      = bvnOk ? WEIGHTS.bvn : 0;
        const nameEarned     = Math.round(nameScore * WEIGHTS.nameMatch);
        const dobEarned      = dobMatchPass ? WEIGHTS.dobMatch : 0;
        const timelineEarned = timeline.valid ? WEIGHTS.timeline : 0;
        const identityEarned = ninEarned + bvnEarned + nameEarned + dobEarned + timelineEarned;

        // Queue SSCE to RPA (WAEC/NECO/NABTEB/NBAIS)
        let ssceJobId: string | null = null;
        if (ssce) {
          const serviceTypeMap: Record<string, string> = {
            waec:   'waec_result',
            neco:   'neco_result',
            nabteb: 'nabteb_result',
            nbais:  'nbais_result',
          };
          // Map provider to the exam-type string each portal form expects
          const defaultExamTypeMap: Record<string, string> = {
            waec:   'WASSCE',
            neco:   'ssce_int',
            nabteb: 'NBC/NTC',
            nbais:  'AISSCE',
          };
          const providerKey = ssce.provider.toLowerCase();
          const svcType = serviceTypeMap[providerKey] || `${providerKey}_result`;
          const examTypeValue = defaultExamTypeMap[providerKey] || ssce.provider.toUpperCase();

          try {
            const [job] = await db.insert(rpaJobs).values({
              serviceType: svcType,
              queryData: {
                registrationNumber: ssce.registrationNumber,
                examYear: parseInt(String(ssce.examYear), 10),   // worker expects number
                examType: examTypeValue,
                cardPin: ssce.cardPin,                           // required by all providers
                ...(ssce.cardSerialNumber ? { cardSerialNumber: ssce.cardSerialNumber } : {}),
                source: 'developer_api_employment',
                employmentRequestId: requestId,
              },
              status: 'pending',
              priority: 5,
            }).returning();
            ssceJobId = job.id;
          } catch (rpaErr: any) {
            flags.push(`SSCE queue failed: ${rpaErr.message}`);
          }
        }

        // Compute initial score (no SSCE yet)
        const maxPossible = ssce ? 100 : 85;
        const initialScore = Math.min(100, Math.round((identityEarned / maxPossible) * 100));
        const initialDecision = toDecision(initialScore);

        // Persist identity results back to queue record
        const ninDataJson  = JSON.stringify(ninOk ? { firstName: ninData?.firstName, lastName: ninData?.lastName, dateOfBirth: ninData?.dateOfBirth, gender: ninData?.gender, phone: ninData?.phone } : null);
        const bvnDataJson  = JSON.stringify(bvnOk ? { firstName: bvnData?.firstName, lastName: bvnData?.lastName, dateOfBirth: bvnData?.dateOfBirth, gender: bvnData?.gender, phone: bvnData?.phone } : null);
        const flagsJson    = JSON.stringify(flags);

        if (ssce) {
          // SSCE still pending in RPA queue — stay 'processing'
          await db.execute(sql`
            UPDATE developer_employment_requests SET
              nin_score       = ${ninEarned},
              bvn_score       = ${bvnEarned},
              name_match_score= ${nameScore},
              dob_match       = ${dobMatchPass},
              timeline_valid  = ${timeline.valid},
              timeline_score  = ${timelineEarned},
              nin_data        = ${ninDataJson}::jsonb,
              bvn_data        = ${bvnDataJson}::jsonb,
              flags           = ${flagsJson}::jsonb,
              ssce_job_id     = ${ssceJobId}::uuid,
              initial_score   = ${initialScore},
              queue_status    = 'processing',
              error_message   = null
            WHERE id = ${requestId}
          `);
        } else {
          // No SSCE — all checks done; mark completed
          await db.execute(sql`
            UPDATE developer_employment_requests SET
              nin_score       = ${ninEarned},
              bvn_score       = ${bvnEarned},
              name_match_score= ${nameScore},
              dob_match       = ${dobMatchPass},
              timeline_valid  = ${timeline.valid},
              timeline_score  = ${timelineEarned},
              nin_data        = ${ninDataJson}::jsonb,
              bvn_data        = ${bvnDataJson}::jsonb,
              flags           = ${flagsJson}::jsonb,
              initial_score   = ${initialScore},
              final_score     = ${initialScore},
              decision        = ${initialDecision},
              queue_status    = 'completed',
              completed_at    = now(),
              error_message   = null
            WHERE id = ${requestId}
          `);
        }

        logger.info('Employment background processing done', {
          requestId, ninOk, bvnOk, initialScore, hasSsce: !!ssce, ssceJobId,
        });
      } catch (bgErr: any) {
        logger.error('Employment background processing error', { requestId, error: bgErr.message });
        try {
          await db.execute(sql`
            UPDATE developer_employment_requests SET
              queue_status = 'failed',
              error_message = ${bgErr.message},
              completed_at = now()
            WHERE id = ${requestId}
          `);
        } catch {}
      }
    });

  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Employment verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/employment', 'POST',
      { nin: nin ? nin.substring(0, 4) + '***' : null, bvn: bvn ? bvn.substring(0, 4) + '***' : null, ssce, level, employment_year: empYear },
      responseData, statusCode,
      [200, 202].includes(statusCode) ? API_PRICES[`employment_${level === 'higher' ? 'higher' : 'standard'}`] : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

/**
 * GET /verify/employment/result/:requestId
 *
 * Poll for the complete employment verification result once the SSCE/JAMB RPA
 * job has completed. Returns the final weighted score and decision.
 */
router.get('/verify/employment/result/:requestId', apiKeyAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { requestId } = req.params;
  const start = Date.now();
  let statusCode = 200;
  let responseData: any;

  try {
    const rows = await db.execute(sql`
      SELECT * FROM developer_employment_requests
      WHERE id = ${requestId} AND developer_id = ${dev.id}
      LIMIT 1
    `);
    const stored: any = (rows as any).rows?.[0] || (rows as any)[0];

    if (!stored) {
      statusCode = 404;
      responseData = { status: 'error', code: 404, message: 'Employment request not found or does not belong to your account' };
      return res.status(404).json(responseData);
    }

    // If still in queue or being processed, return status early
    const queueStatus = stored.queue_status || 'completed';
    if (queueStatus === 'queued') {
      statusCode = 202;
      responseData = {
        status: 'accepted', code: 202, message: 'Verification is queued and will begin processing shortly.',
        data: { requestId, queueStatus: 'queued', submittedAt: stored.created_at, pollUrl: `GET /verify/employment/result/${requestId}` },
      };
      return res.status(202).json(responseData);
    }
    if (queueStatus === 'processing') {
      statusCode = 202;
      responseData = {
        status: 'accepted', code: 202, message: 'Identity checks complete. SSCE result is being retrieved via RPA.',
        data: {
          requestId, queueStatus: 'processing', submittedAt: stored.created_at,
          pollUrl: `GET /verify/employment/result/${requestId}`,
          partial: {
            nin: stored.nin_score > 0 ? 'verified' : 'pending',
            bvn: stored.bvn_score > 0 ? 'verified' : 'pending',
            ssce: 'processing — ' + (stored.ssce_provider || 'unknown'),
          },
        },
      };
      return res.status(202).json(responseData);
    }
    if (queueStatus === 'failed') {
      statusCode = 500;
      responseData = {
        status: 'error', code: 500, message: 'Employment verification processing failed.',
        data: { requestId, queueStatus: 'failed', error: stored.error_message || 'Unknown error', submittedAt: stored.created_at },
      };
      return res.status(500).json(responseData);
    }

    // Base earned score (identity checkpoints already computed)
    const ninScore      = parseInt(stored.nin_score || '0', 10);
    const bvnScore      = parseInt(stored.bvn_score || '0', 10);
    const nameMatchSc   = parseFloat(stored.name_match_score || '0');
    const nameEarned    = Math.round(nameMatchSc * 20);
    const dobEarned     = stored.dob_match ? 15 : 0;
    const timelineEarned = stored.timeline_valid ? 10 : 0;

    let earned = ninScore + bvnScore + nameEarned + dobEarned + timelineEarned;
    let ssceEarned = 0;
    let ssceSection: any = null;
    let educationVerified = false;
    const flags: string[] = Array.isArray(stored.flags) ? [...stored.flags] : [];

    // ── Check SSCE RPA job status ─────────────────────────────────────────────
    if (stored.ssce_job_id) {
      const [job] = await db.select().from(rpaJobs).where(eq(rpaJobs.id, stored.ssce_job_id)).limit(1);
      if (!job) {
        ssceSection = { status: 'not_found', jobId: stored.ssce_job_id };
        flags.push('SSCE job record not found');
      } else if (job.status === 'completed' && job.result) {
        ssceEarned = 15;
        earned += ssceEarned;
        educationVerified = true;
        ssceSection = {
          status: 'completed',
          provider: stored.ssce_provider,
          earned: ssceEarned,
          weight: '15 pts',
          data: job.result,
        };
      } else if (job.status === 'failed') {
        ssceSection = { status: 'failed', provider: stored.ssce_provider, jobId: stored.ssce_job_id };
        flags.push('SSCE/education verification could not be completed — result lookup failed');
      } else {
        ssceSection = {
          status: job.status || 'processing',
          provider: stored.ssce_provider,
          jobId: stored.ssce_job_id,
          note: 'Still processing. Try again in 60 seconds.',
        };
      }

      // Persist final score if SSCE is resolved
      if (job?.status === 'completed' || job?.status === 'failed') {
        const maxPossible = 100;
        const finalScore = Math.min(100, Math.round((earned / maxPossible) * 100));
        const finalDecision = toDecision(finalScore);
        await db.execute(sql`
          UPDATE developer_employment_requests
          SET final_score = ${finalScore}, decision = ${finalDecision}
          WHERE id = ${requestId}
        `).catch(() => {});
      }
    }

    const maxPossible = stored.ssce_job_id ? 100 : 85;
    const scorePercent = Math.min(100, Math.round((earned / maxPossible) * 100));
    const { label: confidenceLabel, level: confidenceLevel } = labelScore(scorePercent);
    const decision = toDecision(scorePercent);

    responseData = {
      status: 'success',
      code: 200,
      message: 'Employment verification result retrieved',
      data: {
        requestId,
        level: stored.level,
        processedAt: stored.created_at,
        retrievedAt: new Date().toISOString(),
        decision,
        flags,
        checks: {
          identity_match: ninScore > 0 && bvnScore > 0,
          name_match_score: nameMatchSc,
          dob_match: stored.dob_match,
          education_verified: educationVerified,
          timeline_valid: stored.timeline_valid,
        },
        confidence: {
          score: scorePercent,
          label: confidenceLabel,
          grade: confidenceLevel,
          earned,
          maxPossible,
        },
        ...(ssceSection ? { ssce: ssceSection } : {}),
        consentRecorded: { given: stored.consent_given, timestamp: stored.consent_at },
      },
    };

    res.json(responseData);
  } catch (e: any) {
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Failed to retrieve employment result', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, `/verify/employment/result/${requestId}`, 'GET',
      {}, responseData, statusCode, 0, Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// KYC ROUTES (JWT protected)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/kyc/status', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  res.json({
    status: 'success', code: 200, message: 'KYC status retrieved',
    data: {
      accountType: dev.accountType || 'individual',
      kycStatus: dev.kycStatus || 'not_required',
      kycDocuments: dev.kycDocuments || null,
      kycSubmittedAt: dev.kycSubmittedAt,
      kycReviewedAt: dev.kycReviewedAt,
      kycReviewNote: dev.kycReviewNote,
    }
  });
});

router.post('/kyc/submit', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { accountType, documents, kybData } = req.body;

    const validTypes = ['individual', 'business', 'enterprise'];
    if (!accountType || !validTypes.includes(accountType)) {
      return res.status(400).json({ status: 'error', code: 400, message: `Account type required. Valid: ${validTypes.join(', ')}` });
    }

    let kycStatus: string;
    let kycDocumentsPayload: any = null;

    if (accountType === 'individual') {
      kycStatus = 'not_required';
    } else if (kybData) {
      // Structured KYB submission from the new form
      const { companyInfo, directors, apiUseCase, compliance, uploadedDocuments } = kybData;
      if (!companyInfo?.legalName || !companyInfo?.cacNumber) {
        return res.status(400).json({ status: 'error', code: 400, message: 'Company legal name and CAC number are required' });
      }
      if (!directors || !directors.length || !directors[0].fullName) {
        return res.status(400).json({ status: 'error', code: 400, message: 'At least one director is required' });
      }
      if (!apiUseCase?.purpose || !apiUseCase?.expectedVolume) {
        return res.status(400).json({ status: 'error', code: 400, message: 'API use case and expected volume are required' });
      }
      kycStatus = 'submitted';
      kycDocumentsPayload = {
        companyInfo, directors, apiUseCase, compliance,
        uploadedDocuments: uploadedDocuments || {},
        submittedAt: new Date().toISOString()
      };
    } else {
      // Legacy path: raw document text
      if (!documents || !documents.length) {
        return res.status(400).json({ status: 'error', code: 400, message: 'KYC documents required for business/enterprise accounts' });
      }
      kycStatus = 'submitted';
      kycDocumentsPayload = Array.isArray(documents) ? documents : [{ description: documents }];
    }

    await db.update(developerUsers).set({
      accountType,
      kycStatus,
      kycDocuments: kycDocumentsPayload,
      kycSubmittedAt: kycStatus === 'submitted' ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(developerUsers.id, dev.id));

    res.json({
      status: 'success', code: 200,
      message: accountType === 'individual' ? 'Account type updated' : 'Business verification submitted for review. We will notify you within 24–72 hours.',
      data: { accountType, kycStatus }
    });
  } catch (e: any) {
    logger.error('KYC submit error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to submit KYC' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN MONITORING ROUTES (requires admin JWT - uses same config.JWT_SECRET)
// ─────────────────────────────────────────────────────────────────────────────

async function adminAuth(req: Request, res: Response, next: Function) {
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

router.get('/admin/developers', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const devs = await db.select({
      id: developerUsers.id,
      email: developerUsers.email,
      name: developerUsers.name,
      company: developerUsers.company,
      walletBalance: developerUsers.walletBalance,
      sandboxBalance: developerUsers.sandboxBalance,
      isActive: developerUsers.isActive,
      emailVerified: developerUsers.emailVerified,
      accountType: developerUsers.accountType,
      kycStatus: developerUsers.kycStatus,
      kycSubmittedAt: developerUsers.kycSubmittedAt,
      createdAt: developerUsers.createdAt,
    }).from(developerUsers)
      .orderBy(desc(developerUsers.createdAt))
      .limit(limit).offset(offset);

    const totalRow = ((await db.execute(sql`SELECT COUNT(*)::int as total FROM developer_users`)).rows[0] || {}) as any;
    const total = totalRow.total || 0;

    res.json({
      status: 'success', code: 200, message: 'Developers retrieved',
      data: { developers: devs, page, limit, total }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get developers' });
  }
});

router.get('/admin/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const stats = ((await db.execute(sql`
      SELECT
        COUNT(DISTINCT developer_id)::int AS active_developers,
        COUNT(*)::int AS total_api_calls,
        COALESCE(SUM(cost), 0)::numeric AS total_revenue,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_calls,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS calls_today
      FROM developer_api_logs
    `)).rows[0] || {}) as any;
    const devStats = ((await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_developers,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active_developers,
        COUNT(*) FILTER (WHERE kyc_status = 'submitted')::int AS pending_kyc
      FROM developer_users
    `)).rows[0] || {}) as any;

    res.json({
      status: 'success', code: 200, message: 'Admin stats retrieved',
      data: {
        apiCalls: stats,
        developerStats: devStats,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get stats' });
  }
});

router.get('/admin/logs', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const logs = await db.select().from(developerApiLogs)
      .orderBy(desc(developerApiLogs.createdAt))
      .limit(limit).offset(offset);

    res.json({ status: 'success', code: 200, message: 'Logs retrieved', data: { logs, page, limit } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get logs' });
  }
});

// ─── POST /kyc/upload-document — upload a KYB document to object storage ─────
router.post('/kyc/upload-document', devJwtAuth, kybUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', code: 400, message: 'No file provided' });
    }
    const { docType } = req.body;
    const validDocTypes = ['cac_certificate', 'status_report', 'address_verification', 'utility_bill', 'other'];
    if (!docType || !validDocTypes.includes(docType)) {
      return res.status(400).json({ status: 'error', code: 400, message: `docType must be one of: ${validDocTypes.join(', ')}` });
    }
    const ext = req.file.originalname.split('.').pop() || 'pdf';
    const fileKey = await objectStorageService.uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
      `kyb-docs/${docType}`,
      ext
    );
    if (!fileKey) {
      return res.status(500).json({ status: 'error', code: 500, message: 'Object storage not configured' });
    }
    res.json({
      status: 'success', code: 200, message: 'Document uploaded',
      data: { fileKey, docType, originalName: req.file.originalname, size: req.file.size }
    });
  } catch (e: any) {
    logger.error('KYB document upload error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to upload document' });
  }
});

// ─── GET /kyc/document/:encodedKey — download a KYB document (developer) ─────
router.get('/kyc/document/:encodedKey', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const fileKey = decodeURIComponent(req.params.encodedKey);
    if (!fileKey.includes('kyb-docs/')) {
      return res.status(403).json({ status: 'error', code: 403, message: 'Access denied' });
    }
    const file = await objectStorageService.getObjectEntityFile(fileKey);
    await objectStorageService.downloadObject(file, res);
  } catch (e: any) {
    if (e instanceof ObjectNotFoundError) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Document not found' });
    }
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to download document' });
  }
});

// ─── GET /admin/kyc/document/:encodedKey — download a KYB document (admin) ───
router.get('/admin/kyc/document/:encodedKey', adminAuth, async (req: Request, res: Response) => {
  try {
    const fileKey = decodeURIComponent(req.params.encodedKey);
    if (!fileKey.includes('kyb-docs/')) {
      return res.status(403).json({ status: 'error', code: 403, message: 'Access denied' });
    }
    const file = await objectStorageService.getObjectEntityFile(fileKey);
    await objectStorageService.downloadObject(file, res);
  } catch (e: any) {
    if (e instanceof ObjectNotFoundError) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Document not found' });
    }
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to download document' });
  }
});

router.get('/admin/kyc', adminAuth, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'submitted';
    let devs;
    if (status === 'all') {
      devs = await db.select().from(developerUsers)
        .where(ne(developerUsers.kycStatus, 'not_required'))
        .orderBy(desc(developerUsers.kycSubmittedAt));
    } else {
      devs = await db.select().from(developerUsers)
        .where(eq(developerUsers.kycStatus, status))
        .orderBy(desc(developerUsers.kycSubmittedAt));
    }

    res.json({ status: 'success', code: 200, message: 'KYC queue retrieved', data: { developers: devs } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get KYC queue' });
  }
});

router.patch('/admin/kyc/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { action, note } = req.body;
    if (!['approve', 'conditional', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Action must be approve, conditional, or reject' });
    }
    const kycStatus = action === 'approve' ? 'approved' : action === 'conditional' ? 'conditional' : 'rejected';
    await db.update(developerUsers).set({
      kycStatus,
      kycReviewNote: note || null,
      kycReviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(developerUsers.id, req.params.id));

    // Send email notification to developer
    try {
      const [devRecord] = await db.select().from(developerUsers)
        .where(eq(developerUsers.id, req.params.id)).limit(1);
      if (devRecord) {
        const { sendEmail } = await import('../../services/emailService');
        const { devKybApprovedEmail, devKybConditionalEmail, devKybRejectedEmail } = await import('../../utils/devEmailTemplates');
        const devFrom = { name: 'Arapoint Developers', email: 'developers@arapoint.com.ng' };
        if (kycStatus === 'approved') {
          await sendEmail(
            devRecord.email,
            'KYB Approved — Welcome to Arapoint Live API',
            devKybApprovedEmail(devRecord.name, note),
            undefined, undefined, devFrom,
          );
        } else if (kycStatus === 'conditional') {
          await sendEmail(
            devRecord.email,
            'KYB Update — Conditional Approval',
            devKybConditionalEmail(devRecord.name, note),
            undefined, undefined, devFrom,
          );
        } else if (kycStatus === 'rejected') {
          await sendEmail(
            devRecord.email,
            'KYB Application — Not Approved',
            devKybRejectedEmail(devRecord.name, note),
            undefined, undefined, devFrom,
          );
        }
      }
    } catch (emailErr: any) {
      logger.warn('[KYB Email] Failed to send notification', { error: emailErr.message });
    }

    res.json({ status: 'success', code: 200, message: `KYB application ${kycStatus}` });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update KYB review' });
  }
});

router.patch('/admin/developers/:id/status', adminAuth, async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    await db.update(developerUsers).set({ isActive, updatedAt: new Date() })
      .where(eq(developerUsers.id, req.params.id));
    res.json({ status: 'success', code: 200, message: `Developer ${isActive ? 'activated' : 'deactivated'}` });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update developer' });
  }
});

// ─── GET /admin/developers/:id — full developer detail ────────────────────────
router.get('/admin/developers/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const [dev] = await db.select().from(developerUsers)
      .where(eq(developerUsers.id, req.params.id)).limit(1);
    if (!dev) return res.status(404).json({ status: 'error', code: 404, message: 'Developer not found' });

    const keys = await db.select().from(developerApiKeys)
      .where(eq(developerApiKeys.developerId, dev.id))
      .orderBy(desc(developerApiKeys.createdAt));

    const recentLogs = await db.select().from(developerApiLogs)
      .where(eq(developerApiLogs.developerId, dev.id))
      .orderBy(desc(developerApiLogs.createdAt))
      .limit(20);

    const txSummary = ((await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_calls,
        COALESCE(SUM(cost), 0)::numeric AS total_spent,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_calls,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS calls_30d
      FROM developer_api_logs WHERE developer_id = ${dev.id}
    `)).rows[0] || {}) as any;

    res.json({
      status: 'success', code: 200, message: 'Developer detail retrieved',
      data: {
        developer: dev,
        apiKeys: keys.map(k => ({
          ...k,
          secretKeyHash: undefined, // never expose hash
        })),
        recentLogs,
        summary: txSummary,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get developer detail' });
  }
});

// ─── PATCH /admin/developers/:id/promote — promote to live mode ───────────────
router.patch('/admin/developers/:id/promote', adminAuth, async (req: Request, res: Response) => {
  try {
    const { action } = req.body; // 'live' | 'sandbox'
    if (!['live', 'sandbox'].includes(action)) {
      return res.status(400).json({ status: 'error', code: 400, message: 'action must be live or sandbox' });
    }
    const [dev] = await db.select({ id: developerUsers.id, kycStatus: developerUsers.kycStatus })
      .from(developerUsers).where(eq(developerUsers.id, req.params.id)).limit(1);
    if (!dev) return res.status(404).json({ status: 'error', code: 404, message: 'Developer not found' });
    if (action === 'live' && dev.kycStatus !== 'approved') {
      return res.status(400).json({ status: 'error', code: 400, message: 'Developer must have an approved KYB to be promoted to live mode' });
    }
    await db.update(developerUsers).set({ environmentMode: action, updatedAt: new Date() })
      .where(eq(developerUsers.id, req.params.id));
    res.json({ status: 'success', code: 200, message: `Developer promoted to ${action} mode` });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to promote developer' });
  }
});

// ─── GET /admin/logs — updated with developer name join ───────────────────────
router.get('/admin/logs/all', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const devId = req.query.developerId as string | undefined;

    const logsWithDev = await db.execute(sql`
      SELECT
        l.id, l.developer_id, l.api_key_id, l.endpoint, l.method,
        l.status_code, l.cost, l.duration_ms, l.ip_address, l.created_at,
        u.name AS developer_name, u.email AS developer_email, u.company AS developer_company
      FROM developer_api_logs l
      LEFT JOIN developer_users u ON u.id = l.developer_id
      ${devId ? sql`WHERE l.developer_id = ${devId}` : sql``}
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    res.json({ status: 'success', code: 200, message: 'Logs retrieved',
      data: { logs: logsWithDev.rows, page, limit } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get logs' });
  }
});

// ─── GET /admin/audit-logs ────────────────────────────────────────────────────
router.get('/admin/audit-logs', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const result = await db.execute(sql`
      SELECT a.*, u.name AS developer_name, u.email AS developer_email
      FROM developer_audit_logs a
      LEFT JOIN developer_users u ON u.id = a.target_developer_id
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    res.json({ status: 'success', code: 200, data: { logs: result.rows, page, limit } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get audit logs' });
  }
});

// ─── Helper: write admin audit log ───────────────────────────────────────────
async function writeAuditLog(adminId: string, action: string, targetDeveloperId: string | null, details: object, ipAddress: string) {
  try {
    await db.execute(sql`
      INSERT INTO developer_audit_logs (admin_id, action, target_developer_id, details, ip_address)
      VALUES (${adminId}, ${action}, ${targetDeveloperId || null}, ${JSON.stringify(details)}, ${ipAddress})
    `);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: EMPLOYMENT QUEUE MONITORING
// ─────────────────────────────────────────────────────────────────────────────

// GET /admin/queue/stats — queue summary counts
router.get('/admin/queue/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const stats = (await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE queue_status = 'queued')::int     AS queued,
        COUNT(*) FILTER (WHERE queue_status = 'processing')::int AS processing,
        COUNT(*) FILTER (WHERE queue_status = 'completed')::int  AS completed,
        COUNT(*) FILTER (WHERE queue_status = 'failed')::int     AS failed,
        COUNT(*)::int                                             AS total,
        COUNT(*) FILTER (WHERE ssce_job_id IS NOT NULL)::int     AS with_ssce,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h
      FROM developer_employment_requests
    `)).rows[0] as any;

    const providerBreakdown = (await db.execute(sql`
      SELECT ssce_provider, COUNT(*)::int AS count
      FROM developer_employment_requests
      WHERE ssce_provider IS NOT NULL
      GROUP BY ssce_provider ORDER BY count DESC
    `)).rows;

    res.json({ status: 'success', code: 200, data: { ...stats, providerBreakdown } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fetch queue stats' });
  }
});

// GET /admin/queue/employment — paginated queue listing with filters
router.get('/admin/queue/employment', adminAuth, async (req: Request, res: Response) => {
  const page   = parseInt(req.query.page as string) || 1;
  const limit  = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status as string || '';
  const provider = req.query.provider as string || '';
  const search = req.query.search as string || '';

  try {
    const rows = (await db.execute(sql`
      SELECT
        e.id, e.developer_id, e.developer_email, e.developer_name,
        e.nin, e.bvn, e.employment_year, e.level, e.ssce_provider,
        e.queue_status, e.decision, e.initial_score, e.final_score,
        e.nin_score, e.bvn_score, e.name_match_score, e.dob_match, e.timeline_valid,
        e.flags, e.error_message, e.consent_given, e.ssce_job_id,
        e.created_at, e.completed_at,
        j.status AS rpa_status, j.created_at AS rpa_queued_at, j.completed_at AS rpa_completed_at
      FROM developer_employment_requests e
      LEFT JOIN rpa_jobs j ON j.id = e.ssce_job_id
      WHERE 1=1
        ${status   ? sql`AND e.queue_status = ${status}` : sql``}
        ${provider ? sql`AND e.ssce_provider = ${provider.toUpperCase()}` : sql``}
        ${search   ? sql`AND (e.developer_email ILIKE ${'%' + search + '%'} OR e.developer_name ILIKE ${'%' + search + '%'} OR e.id ILIKE ${'%' + search + '%'})` : sql``}
      ORDER BY e.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)).rows;

    const total = (await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM developer_employment_requests
      WHERE 1=1
        ${status   ? sql`AND queue_status = ${status}` : sql``}
        ${provider ? sql`AND ssce_provider = ${provider.toUpperCase()}` : sql``}
        ${search   ? sql`AND (developer_email ILIKE ${'%' + search + '%'} OR developer_name ILIKE ${'%' + search + '%'} OR id ILIKE ${'%' + search + '%'})` : sql``}
    `)).rows[0] as any;

    res.json({
      status: 'success', code: 200,
      data: { items: rows, total: total.cnt, page, limit, pages: Math.ceil(total.cnt / limit) },
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fetch queue' });
  }
});

// GET /admin/queue/employment/:id — detailed view of one queue item
router.get('/admin/queue/employment/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const row = (await db.execute(sql`
      SELECT e.*, j.status AS rpa_status, j.result AS rpa_result, j.error AS rpa_error,
             j.created_at AS rpa_queued_at, j.completed_at AS rpa_completed_at,
             j.query_data AS rpa_query_data
      FROM developer_employment_requests e
      LEFT JOIN rpa_jobs j ON j.id = e.ssce_job_id
      WHERE e.id = ${req.params.id}
      LIMIT 1
    `)).rows[0] as any;
    if (!row) return res.status(404).json({ status: 'error', code: 404, message: 'Queue item not found' });
    res.json({ status: 'success', code: 200, data: row });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fetch queue item' });
  }
});

// PATCH /admin/queue/employment/:id/retry — requeue a failed job
router.patch('/admin/queue/employment/:id/retry', adminAuth, async (req: Request, res: Response) => {
  try {
    const row = (await db.execute(sql`
      SELECT * FROM developer_employment_requests WHERE id = ${req.params.id} LIMIT 1
    `)).rows[0] as any;
    if (!row) return res.status(404).json({ status: 'error', code: 404, message: 'Queue item not found' });
    if (row.queue_status !== 'failed') {
      return res.status(400).json({ status: 'error', code: 400, message: 'Only failed jobs can be retried' });
    }

    // Reset to queued so the background worker picks it up again
    await db.execute(sql`
      UPDATE developer_employment_requests SET
        queue_status = 'queued', error_message = null, completed_at = null
      WHERE id = ${req.params.id}
    `);

    res.json({ status: 'success', code: 200, message: 'Job requeued successfully', data: { id: req.params.id } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to retry job' });
  }
});

// DELETE /admin/queue/employment/:id — remove a queue entry (admin cleanup)
router.delete('/admin/queue/employment/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    await db.execute(sql`DELETE FROM developer_employment_requests WHERE id = ${req.params.id}`);
    res.json({ status: 'success', code: 200, message: 'Queue entry removed' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to delete queue entry' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK MANAGEMENT (JWT auth)
// ─────────────────────────────────────────────────────────────────────────────

// GET /webhook — get current webhook config
router.get('/webhook', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  res.json({
    status: 'success', code: 200, message: 'Webhook configuration retrieved',
    data: {
      webhookUrl: dev.webhookUrl || null,
      webhookEnabled: (dev as any).webhookEnabled || false,
      hasSecret: !!(dev as any).webhookSecret,
    }
  });
});

// POST /webhook — set or update webhook config
router.post('/webhook', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { webhookUrl, enabled } = req.body;

  if (webhookUrl && !webhookUrl.startsWith('https://')) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Webhook URL must use HTTPS' });
  }

  try {
    const webhookSecret = `ara_wh_${crypto.randomBytes(32).toString('hex')}`;
    await db.execute(sql`
      UPDATE developer_users
      SET webhook_url = ${webhookUrl || dev.webhookUrl},
          webhook_secret = ${webhookSecret},
          webhook_enabled = ${enabled !== undefined ? enabled : true},
          updated_at = now()
      WHERE id = ${dev.id}
    `);

    res.json({
      status: 'success', code: 200, message: 'Webhook configured. Save your new secret — it will not be shown again.',
      data: {
        webhookUrl: webhookUrl || dev.webhookUrl,
        webhookSecret,
        webhookEnabled: enabled !== undefined ? enabled : true,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to configure webhook' });
  }
});

// DELETE /webhook — disable webhook
router.delete('/webhook', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  try {
    await db.execute(sql`
      UPDATE developer_users SET webhook_url = NULL, webhook_secret = NULL, webhook_enabled = false, updated_at = now()
      WHERE id = ${dev.id}
    `);
    res.json({ status: 'success', code: 200, message: 'Webhook disabled and removed' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to remove webhook' });
  }
});

// GET /webhook/logs — delivery history
router.get('/webhook/logs', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const result = await db.execute(sql`
      SELECT id, event_type, webhook_url, response_status, attempt, success, error_message, created_at
      FROM developer_webhook_logs
      WHERE developer_id = ${dev.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const countRow = ((await db.execute(sql`SELECT COUNT(*)::int AS total FROM developer_webhook_logs WHERE developer_id = ${dev.id}`)).rows[0] || {}) as any;
    res.json({ status: 'success', code: 200, data: { logs: result.rows, page, limit, total: countRow.total || 0 } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get webhook logs' });
  }
});

// POST /webhook/test — send a test event to the developer's webhook
router.post('/webhook/test', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  if (!dev.webhookUrl || !(dev as any).webhookSecret || !(dev as any).webhookEnabled) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Webhook not configured or not enabled' });
  }
  try {
    const { deliverWebhook } = await import('../../services/webhookService');
    deliverWebhook(dev.id, dev.webhookUrl, (dev as any).webhookSecret, 'verification.test', {
      message: 'This is a test webhook from Arapoint',
      timestamp: new Date().toISOString(),
    });
    res.json({ status: 'success', code: 200, message: 'Test webhook queued for delivery' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to send test webhook' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK WALLET FUNDING
// ─────────────────────────────────────────────────────────────────────────────

// POST /billing/initiate — start a Paystack payment (live mode only)
router.post('/billing/initiate', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;

  // Sandbox developers cannot initiate real payments — admin credits their wallet
  if ((dev as any).environmentMode === 'sandbox') {
    return res.status(403).json({
      status: 'error', code: 403,
      message: 'Sandbox accounts cannot initiate Paystack payments. Contact the admin to credit your sandbox wallet for testing.',
    });
  }

  const { amount } = req.body;
  const amtNgn = parseFloat(amount);
  if (!amtNgn || amtNgn < 100) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Minimum amount is ₦100' });
  }

  // Resolve Paystack secret key: env var takes priority, then admin_settings DB
  let paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) {
    const row = (await db.execute(sql`
      SELECT setting_value FROM admin_settings WHERE setting_key = 'paystack_secret_key' LIMIT 1
    `)).rows[0] as any;
    paystackKey = row?.setting_value || '';
  }
  if (!paystackKey) {
    return res.status(503).json({
      status: 'error', code: 503,
      message: 'Payment gateway not yet configured. Please contact support.',
    });
  }

  // Temporarily set env var so paystackService picks it up (it reads process.env at call time)
  const originalKey = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = paystackKey;

  try {
    const reference = `ara_${dev.id.slice(0, 8)}_${Date.now()}`;
    const callbackUrl = `${process.env.APP_BASE_URL || 'https://arapoint.com.ng'}/developer/billing?ref=${reference}`;

    const txData = await paystackService.initializeTransaction({
      email: dev.email,
      amountKobo: Math.round(amtNgn * 100),
      reference,
      callbackUrl,
      metadata: { developerId: dev.id, purpose: 'wallet_funding' },
    });

    // Record pending transaction
    await db.execute(sql`
      INSERT INTO developer_paystack_transactions (developer_id, reference, amount_ngn, status, authorization_url)
      VALUES (${dev.id}, ${reference}, ${amtNgn}, 'pending', ${txData.authorization_url})
    `);

    res.json({
      status: 'success', code: 200, message: 'Payment initiated',
      data: {
        authorizationUrl: txData.authorization_url,
        reference,
        amount: amtNgn,
      }
    });
  } catch (e: any) {
    logger.error('Paystack initiate error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: e.message || 'Failed to initiate payment' });
  } finally {
    // Restore original env key (may have been undefined)
    if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalKey;
  }
});

// POST /billing/paystack-webhook — Paystack calls this on payment events (public, no JWT)
router.post('/billing/paystack-webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ status: 'error', message: 'Invalid Paystack signature' });
  }

  const { event, data } = req.body;
  res.sendStatus(200); // Acknowledge immediately

  if (event !== 'charge.success') return;

  try {
    const { reference, metadata, amount } = data;
    const developerId = metadata?.developerId;
    if (!developerId || !reference) return;

    // Verify with Paystack directly
    const verified = await paystackService.verifyTransaction(reference);
    if (verified.status !== 'success') return;

    const amtNgn = Math.round(verified.amount) / 100;

    // Check already processed
    const existing = ((await db.execute(sql`
      SELECT status FROM developer_paystack_transactions WHERE reference = ${reference}
    `)).rows[0] || {}) as any;
    if (existing.status === 'successful') return;

    // Credit wallet
    await db.execute(sql`
      UPDATE developer_users SET wallet_balance = wallet_balance + ${amtNgn}, updated_at = now()
      WHERE id = ${developerId}
    `);

    await db.insert(developerTransactions).values({
      developerId,
      transactionType: 'wallet_funding',
      amount: amtNgn.toFixed(2),
      description: `Wallet funded via Paystack — ref: ${reference}`,
      referenceId: reference,
      status: 'successful',
      environment: 'live',
    });

    await db.execute(sql`
      UPDATE developer_paystack_transactions
      SET status = 'successful', paystack_status = 'success', paid_at = now()
      WHERE reference = ${reference}
    `);

    logger.info('Developer wallet funded via Paystack', { developerId, amtNgn, reference });
  } catch (e: any) {
    logger.error('Paystack webhook processing error', { error: e.message });
  }
});

// GET /billing/verify/:reference — developer polls after Paystack redirect
router.get('/billing/verify/:reference', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { reference } = req.params;
  try {
    const result = await db.execute(sql`
      SELECT * FROM developer_paystack_transactions
      WHERE reference = ${reference} AND developer_id = ${dev.id}
    `);
    const tx = result.rows[0] as any;
    if (!tx) return res.status(404).json({ status: 'error', code: 404, message: 'Transaction not found' });
    res.json({ status: 'success', code: 200, data: tx });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to verify payment' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const days = parseInt(req.query.days as string) || 30;
  try {
    const summary = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_calls,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_calls,
        COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_calls,
        COALESCE(SUM(cost), 0)::numeric AS total_spent,
        COALESCE(AVG(duration_ms), 0)::numeric AS avg_duration_ms
      FROM developer_api_logs
      WHERE developer_id = ${dev.id} AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
    `);

    const dailyData = await db.execute(sql`
      SELECT
        DATE(created_at) AS day,
        COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success,
        COALESCE(SUM(cost), 0)::numeric AS spent
      FROM developer_api_logs
      WHERE developer_id = ${dev.id} AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);

    const endpointData = await db.execute(sql`
      SELECT endpoint, COUNT(*)::int AS calls, COALESCE(SUM(cost), 0)::numeric AS spent
      FROM developer_api_logs
      WHERE developer_id = ${dev.id} AND created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY endpoint
      ORDER BY calls DESC
      LIMIT 10
    `);

    const s = summary.rows[0] as any;
    res.json({
      status: 'success', code: 200, message: 'Analytics retrieved',
      data: {
        period: `${days} days`,
        summary: {
          totalCalls: s?.total_calls || 0,
          successCalls: s?.success_calls || 0,
          errorCalls: s?.error_calls || 0,
          successRate: s?.total_calls ? Math.round((s.success_calls / s.total_calls) * 100) : 0,
          totalSpent: parseFloat(s?.total_spent || '0').toFixed(2),
          avgDurationMs: Math.round(parseFloat(s?.avg_duration_ms || '0')),
        },
        daily: dailyData.rows,
        endpoints: endpointData.rows,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to retrieve analytics' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FRAUD SCORE API
// ─────────────────────────────────────────────────────────────────────────────

router.post('/verify/fraud-score', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, bvn, phone } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!nin && !bvn && !phone) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'At least one of nin, bvn, or phone required' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.fraud_score, `Fraud score - ${nin || bvn || phone}`, (dev as any).environmentMode);

    // Sandbox mock
    if ((dev as any).environmentMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'Fraud score computed (sandbox)',
        data: { fraudScore: sandboxFraudScore(nin || bvn || phone) }
      };
      return res.json(responseData);
    }

    // Real fraud scoring: cross-reference NIN+BVN name/DOB consistency,
    // check frequency of verification requests, known bad identifiers
    let riskScore = 0;
    const signals: Record<string, boolean> = {};

    if (nin && bvn) {
      const { premblyService } = await import('../../services/premblyService');
      const [ninRes, bvnRes] = await Promise.allSettled([
        premblyService.verifyNIN(nin),
        premblyService.verifyBVN(bvn),
      ]);

      const ninData = ninRes.status === 'fulfilled' ? ninRes.value : null;
      const bvnData = bvnRes.status === 'fulfilled' ? bvnRes.value : null;

      if (!ninData || ninData.error) { riskScore += 30; signals.ninUnverified = true; }
      if (!bvnData || bvnData.error) { riskScore += 30; signals.bvnUnverified = true; }

      if (ninData && bvnData && !ninData.error && !bvnData.error) {
        const ninName = `${ninData.data?.firstName || ''} ${ninData.data?.lastName || ''}`.trim().toLowerCase();
        const bvnName = `${bvnData.data?.firstName || ''} ${bvnData.data?.lastName || ''}`.trim().toLowerCase();
        if (ninName && bvnName && ninName !== bvnName) {
          riskScore += 25;
          signals.nameMismatch = true;
        }
        if (ninData.data?.dateOfBirth !== bvnData.data?.dateOfBirth) {
          riskScore += 15;
          signals.dobMismatch = true;
        }
      }
    }

    const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';

    responseData = {
      status: 'success', code: 200, message: 'Fraud score computed',
      data: {
        fraudScore: {
          nin: nin || undefined, bvn: bvn || undefined,
          riskScore: Math.min(riskScore, 100),
          riskLevel,
          signals,
        }
      }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Fraud score failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/fraud-score', 'POST', { nin, bvn, phone },
      responseData, statusCode, statusCode === 200 ? API_PRICES.fraud_score : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IP ALLOWLIST MANAGEMENT (JWT auth)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/security/ip-allowlist', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const list: string[] = (dev as any).ipAllowlist || [];
  res.json({ status: 'success', code: 200, data: { ipAllowlist: list, count: list.length } });
});

router.post('/security/ip-allowlist', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ status: 'error', code: 400, message: 'IP address required' });
  }
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(ip)) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Invalid IP address format' });
  }
  try {
    const current: string[] = (dev as any).ipAllowlist || [];
    if (current.includes(ip)) {
      return res.status(409).json({ status: 'error', code: 409, message: 'IP already on allowlist' });
    }
    const updated = [...current, ip];
    await db.execute(sql`UPDATE developer_users SET ip_allowlist = ${JSON.stringify(updated)}::jsonb, updated_at = now() WHERE id = ${dev.id}`);
    res.json({ status: 'success', code: 200, message: 'IP added to allowlist', data: { ipAllowlist: updated } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update allowlist' });
  }
});

router.delete('/security/ip-allowlist', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ status: 'error', code: 400, message: 'IP address required' });
  try {
    const current: string[] = (dev as any).ipAllowlist || [];
    const updated = current.filter((i: string) => i !== ip);
    await db.execute(sql`UPDATE developer_users SET ip_allowlist = ${JSON.stringify(updated)}::jsonb, updated_at = now() WHERE id = ${dev.id}`);
    res.json({ status: 'success', code: 200, message: 'IP removed from allowlist', data: { ipAllowlist: updated } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update allowlist' });
  }
});

export default router;
