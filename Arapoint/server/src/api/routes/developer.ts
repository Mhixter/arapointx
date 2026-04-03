import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { sql, eq, desc, and, count } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal
} from 'drizzle-orm/pg-core';
import { otpService } from '../../services/otpService';
import { rpaJobs } from '../../db/schema';

const router = Router();

// ─── Inline schema (raw SQL tables, not in Drizzle schema.ts) ────────────────
const developerUsers = pgTable('developer_users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  walletBalance: decimal('wallet_balance', { precision: 15, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  accountType: varchar('account_type', { length: 50 }).default('individual'),
  kycStatus: varchar('kyc_status', { length: 50 }).default('not_required'),
  kycDocuments: jsonb('kyc_documents'),
  kycSubmittedAt: timestamp('kyc_submitted_at'),
  kycReviewedAt: timestamp('kyc_reviewed_at'),
  kycReviewNote: text('kyc_review_note'),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const developerApiKeys = pgTable('developer_api_keys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  developerId: uuid('developer_id').notNull(),
  keyName: varchar('key_name', { length: 100 }).notNull(),
  apiKey: varchar('api_key', { length: 100 }).unique().notNull(),
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
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Developer API Pricing (NGN) ──────────────────────────────────────────────
const API_PRICES: Record<string, number> = {
  'nin': 130,
  'bvn': 80,
  'education': 250,
  'unified': 400,
  'employment_standard': 350,
  'employment_higher': 450,
};

// ─── Helper: generate API key ─────────────────────────────────────────────────
function generateApiKey(): string {
  return 'ara_' + crypto.randomBytes(24).toString('hex');
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
  ipAddress: string
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

  // Update last used
  await db.update(developerApiKeys)
    .set({ lastUsedAt: new Date(), totalRequests: sql`${developerApiKeys.totalRequests} + 1` })
    .where(eq(developerApiKeys.id, keyRecord.id));

  (req as any).developer = dev;
  (req as any).apiKeyId = keyRecord.id;
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
    if (!dev || !dev.isActive) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Account not found' });
    }
    (req as any).developer = dev;
    next();
  } catch {
    res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
  }
}

// ─── Wallet deduction helper ──────────────────────────────────────────────────
async function deductDeveloperBalance(developerId: string, amount: number, description: string) {
  const [updated] = await db.update(developerUsers)
    .set({ walletBalance: sql`wallet_balance - ${amount.toFixed(2)}` })
    .where(and(eq(developerUsers.id, developerId), sql`wallet_balance >= ${amount.toFixed(2)}`))
    .returning({ walletBalance: developerUsers.walletBalance });

  if (!updated) throw new Error('Insufficient wallet balance');

  await db.insert(developerTransactions).values({
    developerId,
    transactionType: 'api_charge',
    amount: (-amount).toFixed(2),
    description,
    referenceId: 'DEV-' + crypto.randomBytes(8).toString('hex'),
    status: 'successful',
  });

  return parseFloat(updated.walletBalance || '0');
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
    }).returning();

    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      status: 'success', code: 201, message: 'Developer account created',
      data: { token, developer: { id: dev.id, email: dev.email, name: dev.name, company: dev.company, walletBalance: 0 } }
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
          company: dev.company, walletBalance: parseFloat(dev.walletBalance || '0'),
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
      id: dev.id, email: dev.email, name: dev.name,
      company: dev.company, walletBalance: parseFloat(dev.walletBalance || '0'),
      webhookUrl: dev.webhookUrl, createdAt: dev.createdAt,
      accountType: dev.accountType || 'individual',
      kycStatus: dev.kycStatus || 'not_required',
      emailVerified: dev.emailVerified,
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
    const [logStats] = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_count,
        COALESCE(SUM(cost), 0)::numeric AS total_spent,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS requests_this_month
      FROM developer_api_logs WHERE developer_id = ${dev.id}
    `);
    const [keyCount] = await db.execute(sql`
      SELECT COUNT(*)::int AS active_keys FROM developer_api_keys
      WHERE developer_id = ${dev.id} AND is_active = true
    `);
    const recentLogs = await db.select().from(developerApiLogs)
      .where(eq(developerApiLogs.developerId, dev.id))
      .orderBy(desc(developerApiLogs.createdAt))
      .limit(5);

    res.json({
      status: 'success', code: 200, message: 'Stats retrieved',
      data: {
        walletBalance: parseFloat(dev.walletBalance || '0'),
        totalRequests: logStats.rows[0]?.total_requests || 0,
        successCount: logStats.rows[0]?.success_count || 0,
        totalSpent: parseFloat(logStats.rows[0]?.total_spent || '0'),
        requestsThisMonth: logStats.rows[0]?.requests_this_month || 0,
        successRate: logStats.rows[0]?.total_requests > 0
          ? Math.round((logStats.rows[0]?.success_count / logStats.rows[0]?.total_requests) * 100)
          : 0,
        activeApiKeys: keyCount.rows[0]?.active_keys || 0,
        recentLogs,
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
    const { keyName } = req.body;
    if (!keyName) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Key name required' });
    }
    const existing = await db.select({ id: developerApiKeys.id }).from(developerApiKeys)
      .where(eq(developerApiKeys.developerId, dev.id));
    if (existing.length >= 10) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Maximum 10 API keys allowed' });
    }
    const apiKey = generateApiKey();
    const [key] = await db.insert(developerApiKeys).values({
      developerId: dev.id,
      keyName,
      apiKey,
    }).returning();
    res.status(201).json({ status: 'success', code: 201, message: 'API key created', data: { key } });
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
  const txs = await db.select().from(developerTransactions)
    .where(eq(developerTransactions.developerId, dev.id))
    .orderBy(desc(developerTransactions.createdAt))
    .limit(limit).offset(offset);
  res.json({ status: 'success', code: 200, message: 'Transactions retrieved', data: { transactions: txs, page, limit } });
});

// ─── Mock fund wallet (for development/testing) ───────────────────────────────
router.post('/wallet/fund', devJwtAuth, async (req: Request, res: Response) => {
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
    });

    res.json({
      status: 'success', code: 200, message: 'Wallet funded successfully',
      data: { newBalance: parseFloat(updated.walletBalance || '0'), amount }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fund wallet' });
  }
});

// ─── API Logs ─────────────────────────────────────────────────────────────────
router.get('/logs', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const logs = await db.select().from(developerApiLogs)
    .where(eq(developerApiLogs.developerId, dev.id))
    .orderBy(desc(developerApiLogs.createdAt))
    .limit(limit).offset(offset);
  res.json({ status: 'success', code: 200, message: 'Logs retrieved', data: { logs, page, limit } });
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

    await deductDeveloperBalance(dev.id, API_PRICES.nin, `NIN verification - ${nin || phone}`);

    // Call internal NIN service
    const { premblyService } = await import('../../services/premblyService');
    let result;
    try {
      if (nin) {
        result = await premblyService.verifyNIN(nin);
      } else {
        result = await premblyService.verifyNINByPhone(phone);
      }
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
      Date.now() - start, req.ip || '');
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

    await deductDeveloperBalance(dev.id, API_PRICES.bvn, `BVN verification - ${bvn}`);

    const { premblyService } = await import('../../services/premblyService');
    let result;
    try {
      result = await premblyService.verifyBVN(bvn);
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
      Date.now() - start, req.ip || '');
  }
});

router.post('/verify/education', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { provider, examYear, registrationNumber, examType } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    const validProviders = ['waec', 'neco', 'nabteb', 'nbais', 'jamb'];
    if (!provider || !validProviders.includes(provider.toLowerCase())) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: `Provider required. Valid: ${validProviders.join(', ')}` };
      return res.status(400).json(responseData);
    }
    if (!registrationNumber) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Registration number required' };
      return res.status(400).json(responseData);
    }
    if (!examYear) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Exam year required' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.education,
      `Education verification - ${provider.toUpperCase()} ${registrationNumber}`);

    const serviceTypeMap: Record<string, string> = {
      waec: 'waec_result',
      neco: 'neco_result',
      nabteb: 'nabteb_result',
      nbais: 'nbais_result',
      jamb: 'jamb_score',
    };
    const serviceType = serviceTypeMap[provider.toLowerCase()] || `${provider.toLowerCase()}_result`;

    const [job] = await db.insert(rpaJobs).values({
      serviceType,
      queryData: {
        registrationNumber,
        examYear: examYear.toString(),
        examType: examType || provider.toUpperCase(),
        source: 'developer_api',
        developerId: dev.id,
      },
      status: 'pending',
      priority: 0,
    }).returning({ id: rpaJobs.id });

    responseData = {
      status: 'success', code: 200, message: 'Education verification queued via RPA',
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
      { provider, examYear, registrationNumber, examType },
      responseData, statusCode, statusCode === 200 ? API_PRICES.education : 0,
      Date.now() - start, req.ip || '');
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
      `Unified verification - ${[nin && 'NIN', bvn && 'BVN', education && 'Education'].filter(Boolean).join(', ')}`);

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
      Date.now() - start, req.ip || '');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYMENT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers for name / DOB similarity ────────────────────────────────────────
function normaliseName(s: string = '') {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}
function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (na === nb) return true;
  // any word overlap (first name, last name order differences)
  const aw = new Set(na.split(' ').filter(Boolean));
  const bw = new Set(nb.split(' ').filter(Boolean));
  const common = [...aw].filter(w => bw.has(w) && w.length > 1);
  return common.length >= 2;
}
function dobsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const clean = (d: string) => d.replace(/[^0-9]/g, '');
  return clean(a).includes(clean(b).substring(0, 6)) || clean(b).includes(clean(a).substring(0, 6));
}
function labelScore(score: number): { label: string; level: string } {
  if (score >= 90) return { label: 'Very High Confidence', level: 'A' };
  if (score >= 75) return { label: 'High Confidence', level: 'B' };
  if (score >= 55) return { label: 'Moderate Confidence', level: 'C' };
  if (score >= 35) return { label: 'Low Confidence', level: 'D' };
  return { label: 'Very Low Confidence', level: 'F' };
}

/**
 * POST /verify/employment
 *
 * Body:
 *   nin              - National ID number (required)
 *   bvn              - Bank Verification Number (required)
 *   ssce             - { provider, examYear, registrationNumber } (optional)
 *   level            - "standard" | "higher" (default: "standard")
 *
 * Our server calls Prembly for NIN + BVN in parallel, queues an RPA job for
 * the SSCE check, then computes a weighted accuracy / confidence score.
 *
 * Scoring weights:
 *   NIN verified          35 pts
 *   BVN verified          30 pts
 *   NIN ↔ BVN name match  10 pts
 *   NIN ↔ BVN DOB  match  10 pts
 *   SSCE verified         15 pts  (pending while RPA processes)
 *   ─────────────────────────────
 *   Total possible        100 pts
 */
router.post('/verify/employment', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, bvn, ssce, level = 'standard' } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    // ── Validate inputs ──────────────────────────────────────────────────────
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
    if (ssce) {
      const validProviders = ['waec', 'neco', 'nabteb', 'nbais', 'jamb'];
      if (!ssce.provider || !validProviders.includes(ssce.provider.toLowerCase())) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `ssce.provider must be one of: ${validProviders.join(', ')}` };
        return res.status(400).json(responseData);
      }
      if (!ssce.examYear || !ssce.registrationNumber) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: 'ssce.examYear and ssce.registrationNumber are required when providing ssce' };
        return res.status(400).json(responseData);
      }
    }

    const priceKey = level === 'higher' ? 'employment_higher' : 'employment_standard';
    await deductDeveloperBalance(dev.id, API_PRICES[priceKey],
      `Employment verification (${level}) — NIN ${nin.substring(0, 4)}***`);

    const requestId = 'EMP-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    // ── Call Prembly for NIN + BVN in parallel ───────────────────────────────
    const { premblyService } = await import('../../services/premblyService');

    const [ninResult, bvnResult] = await Promise.allSettled([
      premblyService.verifyNIN(nin),
      premblyService.verifyBVN(bvn),
    ]);

    const ninRes = ninResult.status === 'fulfilled' ? ninResult.value : { success: false, error: (ninResult.reason as Error)?.message || 'NIN lookup failed' };
    const bvnRes = bvnResult.status === 'fulfilled' ? bvnResult.value : { success: false, error: (bvnResult.reason as Error)?.message || 'BVN lookup failed' };

    const ninOk  = ninRes.success === true;
    const bvnOk  = bvnRes.success === true;
    const ninData = (ninRes as any).data || null;
    const bvnData = (bvnRes as any).data || null;

    // ── Cross-reference name / DOB ────────────────────────────────────────────
    const ninFullName = `${ninData?.firstName || ''} ${ninData?.lastName || ''}`.trim();
    const bvnFullName = `${bvnData?.firstName || ''} ${bvnData?.lastName || ''}`.trim();
    const nameMatch = ninOk && bvnOk ? namesMatch(ninFullName, bvnFullName) : false;
    const dobMatch  = ninOk && bvnOk ? dobsMatch(ninData?.dateOfBirth || '', bvnData?.dateOfBirth || '') : false;

    // ── Queue RPA job for SSCE (if provided) ─────────────────────────────────
    let ssceCheck: any = null;
    if (ssce) {
      const serviceTypeMap: Record<string, string> = {
        waec: 'waec_result', neco: 'neco_result',
        nabteb: 'nabteb_result', nbais: 'nbais_result', jamb: 'jamb_score',
      };
      const svcType = serviceTypeMap[ssce.provider.toLowerCase()] || `${ssce.provider.toLowerCase()}_result`;
      try {
        const [job] = await db.insert(rpaJobs).values({
          serviceType: svcType,
          queryData: {
            registrationNumber: ssce.registrationNumber,
            examYear: ssce.examYear.toString(),
            examType: ssce.provider.toUpperCase(),
            source: 'developer_api_employment',
            employmentRequestId: requestId,
          },
          status: 'pending',
          priority: 5,
        }).returning();
        ssceCheck = {
          status: 'processing',
          provider: ssce.provider.toUpperCase(),
          examYear: ssce.examYear,
          registrationNumber: ssce.registrationNumber,
          jobId: job.id,
          pollUrl: `GET /verify/education/result?jobId=${job.id}`,
          maxScore: 15,
          earnedScore: 0,
          note: 'SSCE result is being retrieved via automated lookup. Poll the jobId above for updates.',
        };
      } catch (rpaErr: any) {
        ssceCheck = { status: 'error', error: rpaErr.message, maxScore: 15, earnedScore: 0 };
      }
    }

    // ── Compute confidence score ──────────────────────────────────────────────
    const WEIGHTS = { nin: 35, bvn: 30, nameMatch: 10, dobMatch: 10, ssce: 15 };
    const maxPossible = ssce ? 100 : 85; // SSCE not requested → scale against 85

    let earned = 0;
    if (ninOk)     earned += WEIGHTS.nin;
    if (bvnOk)     earned += WEIGHTS.bvn;
    if (nameMatch) earned += WEIGHTS.nameMatch;
    if (dobMatch)  earned += WEIGHTS.dobMatch;
    // SSCE always 0 now (pending); once resolved the caller can recompute

    const scorePercent = Math.round((earned / maxPossible) * 100);
    const { label: confidenceLabel, level: confidenceLevel } = labelScore(scorePercent);

    // ── Assemble checkpoint result ────────────────────────────────────────────
    const checkpoints: Record<string, any> = {
      nin: {
        checkpoint: 'NIN Verification',
        status: ninOk ? 'verified' : 'failed',
        weight: `${WEIGHTS.nin} pts`,
        earned: ninOk ? WEIGHTS.nin : 0,
        data: ninOk ? {
          firstName: ninData?.firstName,
          lastName: ninData?.lastName,
          dateOfBirth: ninData?.dateOfBirth,
          gender: ninData?.gender,
          phone: ninData?.phone,
        } : null,
        error: ninOk ? null : (ninRes as any).error,
      },
      bvn: {
        checkpoint: 'BVN Verification',
        status: bvnOk ? 'verified' : 'failed',
        weight: `${WEIGHTS.bvn} pts`,
        earned: bvnOk ? WEIGHTS.bvn : 0,
        data: bvnOk ? {
          firstName: bvnData?.firstName,
          lastName: bvnData?.lastName,
          dateOfBirth: bvnData?.dateOfBirth,
          gender: bvnData?.gender,
          phone: bvnData?.phone,
        } : null,
        error: bvnOk ? null : (bvnRes as any).error,
      },
      crossMatch: {
        checkpoint: 'Identity Cross-Reference (NIN ↔ BVN)',
        status: (ninOk && bvnOk) ? 'completed' : 'skipped',
        nameMatch: {
          result: nameMatch,
          earned: nameMatch ? WEIGHTS.nameMatch : 0,
          weight: `${WEIGHTS.nameMatch} pts`,
          ninName: ninFullName || null,
          bvnName: bvnFullName || null,
        },
        dobMatch: {
          result: dobMatch,
          earned: dobMatch ? WEIGHTS.dobMatch : 0,
          weight: `${WEIGHTS.dobMatch} pts`,
          ninDob: ninData?.dateOfBirth || null,
          bvnDob: bvnData?.dateOfBirth || null,
        },
      },
    };

    if (ssce && ssceCheck) {
      checkpoints.ssce = {
        checkpoint: 'SSCE / Qualifications Check',
        status: ssceCheck.status,
        weight: `${WEIGHTS.ssce} pts`,
        earned: 0,
        ...ssceCheck,
      };
    }

    responseData = {
      status: 'success',
      code: 200,
      message: 'Employment verification initiated',
      data: {
        requestId,
        level,
        processedAt: new Date().toISOString(),
        confidence: {
          score: scorePercent,
          label: confidenceLabel,
          grade: confidenceLevel,
          earned,
          maxPossible,
          note: ssce ? 'Score will increase once SSCE result is retrieved. Poll the ssce jobId for completion.' : undefined,
        },
        checkpoints,
      },
    };

    res.json(responseData);
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
      { nin: nin ? nin.substring(0, 4) + '***' : null, bvn: bvn ? bvn.substring(0, 4) + '***' : null, ssce, level },
      responseData, statusCode,
      statusCode === 200 ? API_PRICES[`employment_${level === 'higher' ? 'higher' : 'standard'}`] : 0,
      Date.now() - start, req.ip || '');
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
      const { companyInfo, directors, apiUseCase, compliance } = kybData;
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
      kycDocumentsPayload = { companyInfo, directors, apiUseCase, compliance, submittedAt: new Date().toISOString() };
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
      isActive: developerUsers.isActive,
      emailVerified: developerUsers.emailVerified,
      accountType: developerUsers.accountType,
      kycStatus: developerUsers.kycStatus,
      kycSubmittedAt: developerUsers.kycSubmittedAt,
      createdAt: developerUsers.createdAt,
    }).from(developerUsers)
      .orderBy(desc(developerUsers.createdAt))
      .limit(limit).offset(offset);

    const [totalRow] = await db.execute(sql`SELECT COUNT(*)::int as total FROM developer_users`);
    const total = totalRow.rows[0]?.total || 0;

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
    const [stats] = await db.execute(sql`
      SELECT
        COUNT(DISTINCT developer_id)::int AS active_developers,
        COUNT(*)::int AS total_api_calls,
        COALESCE(SUM(cost), 0)::numeric AS total_revenue,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_calls,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS calls_today
      FROM developer_api_logs
    `);
    const [devStats] = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_developers,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active_developers,
        COUNT(*) FILTER (WHERE kyc_status = 'submitted')::int AS pending_kyc
      FROM developer_users
    `);

    res.json({
      status: 'success', code: 200, message: 'Admin stats retrieved',
      data: {
        apiCalls: stats.rows[0] || {},
        developerStats: devStats.rows[0] || {},
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

router.get('/admin/kyc', adminAuth, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'submitted';
    const devs = await db.select().from(developerUsers)
      .where(eq(developerUsers.kycStatus, status))
      .orderBy(desc(developerUsers.kycSubmittedAt));

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

export default router;
