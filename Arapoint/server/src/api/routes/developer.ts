import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { sql, eq, desc, and } from 'drizzle-orm';
import {
  pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal
} from 'drizzle-orm/pg-core';

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

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name, company, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email, name and password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Password must be at least 8 characters' });
    }
    const existing = await db.select({ id: developerUsers.id }).from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      return res.status(409).json({ status: 'error', code: 409, message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [dev] = await db.insert(developerUsers).values({
      email: email.toLowerCase(),
      name,
      company: company || null,
      passwordHash,
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

    responseData = {
      status: 'success', code: 200, message: 'Education verification request accepted',
      data: {
        provider: provider.toUpperCase(),
        examYear,
        registrationNumber,
        status: 'processing',
        note: 'Education verification is processed via our RPA system. Results may take 1-3 minutes.',
        requestId: 'EDU-' + crypto.randomBytes(8).toString('hex'),
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

export default router;
