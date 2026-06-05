import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import {
  screeningOrganizations, screeningUsers, screeningCandidates,
  screeningBatches, screeningBillingTransactions, screeningNotifications, rpaJobs,
  adminSettings,
} from '../../db/schema';
import { eq, and, desc, sql, gte, lt, count, sum, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { premblyService } from '../../services/premblyService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { screeningAuthMiddleware } from '../middleware/auth';
import * as paystackService from '../../services/paystackService';

// Create screening_paystack_transactions if it doesn't exist yet
db.execute(sql`
  CREATE TABLE IF NOT EXISTS screening_paystack_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    amount_ngn NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    authorization_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  )
`).catch((e: any) => logger.error('[screening] paystack table migration error', { error: e.message }));

const router = Router();

const DEFAULT_PRICING = { nin: 130, bvn: 80, education: 120, fraud: 20, total: 350 };

async function getScreeningPricing() {
  try {
    const rows = await db.select()
      .from(adminSettings)
      .where(inArray(adminSettings.settingKey, [
        'screening_price_nin', 'screening_price_bvn',
        'screening_price_education', 'screening_price_fraud',
      ]));
    const map: Record<string, number> = {};
    rows.forEach((r: { settingKey: string; settingValue: string | null }) => {
      const v = parseFloat(r.settingValue || '');
      if (!isNaN(v) && v > 0) map[r.settingKey] = v;
    });
    const nin = map['screening_price_nin'] ?? DEFAULT_PRICING.nin;
    const bvn = map['screening_price_bvn'] ?? DEFAULT_PRICING.bvn;
    const education = map['screening_price_education'] ?? DEFAULT_PRICING.education;
    const fraud = map['screening_price_fraud'] ?? DEFAULT_PRICING.fraud;
    return { nin, bvn, education, fraud, total: nin + bvn + education + fraud };
  } catch {
    return { ...DEFAULT_PRICING };
  }
}

function generateCandidateRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ARP-EMP-${year}-${rand}`;
}

function generateBatchRef(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(100 + Math.random() * 900);
  return `BATCH-${datePart}-${rand}`;
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function computeFraudScore(ninData: any, bvnData: any): { score: number; level: string; flags: string[] } {
  const flags: string[] = [];
  let deductions = 0;

  if (ninData && bvnData) {
    const ninName = `${ninData.firstName || ''} ${ninData.lastName || ''}`.trim();
    const bvnName = `${bvnData.firstName || ''} ${bvnData.lastName || ''}`.trim();
    const similarity = nameSimilarity(ninName, bvnName);
    if (similarity < 0.4) {
      flags.push('Significant name mismatch between NIN and BVN');
      deductions += 30;
    } else if (similarity < 0.65) {
      flags.push('Moderate name mismatch between NIN and BVN');
      deductions += 15;
    }
    const ninDob = ninData.dateOfBirth?.substring(0, 10);
    const bvnDob = bvnData.dateOfBirth?.substring(0, 10);
    if (ninDob && bvnDob && ninDob !== bvnDob) {
      flags.push('Date of birth mismatch between NIN and BVN');
      deductions += 25;
    }
    if (bvnData.watchListed) {
      flags.push('BVN is watchlisted');
      deductions += 40;
    }
  }

  const score = Math.max(0, 100 - deductions);
  const level = score >= 80 ? 'Low Risk' : score >= 60 ? 'Medium Risk' : 'High Risk';
  return { score, level, flags };
}

function computeOverallScore(ninSuccess: boolean, bvnSuccess: boolean, ninData: any, bvnData: any, educationResult?: any): { score: number; decision: string } {
  let score = 0;
  if (ninSuccess) score += 25;
  if (bvnSuccess) score += 25;
  if (ninSuccess && bvnSuccess && ninData && bvnData) {
    const ninName = `${ninData.firstName || ''} ${ninData.lastName || ''}`.trim();
    const bvnName = `${bvnData.firstName || ''} ${bvnData.lastName || ''}`.trim();
    const sim = nameSimilarity(ninName, bvnName);
    if (sim >= 0.7) score += 20;
    else if (sim >= 0.5) score += 10;
    const ninDob = ninData.dateOfBirth?.substring(0, 10);
    const bvnDob = bvnData.dateOfBirth?.substring(0, 10);
    if (ninDob && bvnDob && ninDob === bvnDob) score += 10;
  }
  if (educationResult?.found) {
    score += 10;
    if (educationResult.nameMatch) score += 10;
  }
  const decision = score >= 80 ? 'PASS' : score >= 60 ? 'REVIEW' : 'FAIL';
  return { score, decision };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { organizationName, email, password, phone, industry, size } = req.body;
    if (!organizationName || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Organization name, email, and password are required'));
    }
    const [existing] = await db.select({ id: screeningOrganizations.id })
      .from(screeningOrganizations).where(eq(screeningOrganizations.email, email.toLowerCase())).limit(1);
    if (existing) {
      return res.status(409).json(formatErrorResponse(409, 'An organization with this email already exists'));
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [org] = await db.insert(screeningOrganizations).values({
      name: organizationName,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null,
      industry: industry || null,
      size: size || null,
    }).returning();

    const [adminUser] = await db.insert(screeningUsers).values({
      orgId: org.id,
      email: email.toLowerCase(),
      name: organizationName,
      role: 'super_admin',
      passwordHash,
    }).returning();

    const token = jwt.sign(
      { screeningOrgId: org.id, screeningUserId: adminUser.id, isScreening: true, role: 'super_admin' },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json(formatResponse('success', 201, 'Organization registered successfully', {
      token,
      organization: { id: org.id, name: org.name, email: org.email },
      user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
    }));
  } catch (err: any) {
    logger.error('Screening register error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Registration failed'));
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Email and password are required'));
    }
    const [org] = await db.select().from(screeningOrganizations)
      .where(eq(screeningOrganizations.email, email.toLowerCase())).limit(1);
    if (!org) {
      return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    }
    const valid = await bcrypt.compare(password, org.passwordHash);
    if (!valid) {
      return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    }
    if (!org.isActive) {
      return res.status(403).json(formatErrorResponse(403, 'Account is inactive'));
    }
    const [user] = await db.select().from(screeningUsers)
      .where(and(eq(screeningUsers.orgId, org.id), eq(screeningUsers.email, email.toLowerCase()))).limit(1);

    const token = jwt.sign(
      { screeningOrgId: org.id, screeningUserId: user?.id, isScreening: true, role: user?.role || 'super_admin' },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    if (user) {
      await db.update(screeningUsers).set({ lastLoginAt: new Date() }).where(eq(screeningUsers.id, user.id));
    }

    res.json(formatResponse('success', 200, 'Login successful', {
      token,
      organization: { id: org.id, name: org.name, email: org.email, walletBalance: org.walletBalance },
      user: { id: user?.id, name: user?.name || org.name, email: org.email, role: user?.role || 'super_admin' },
    }));
  } catch (err: any) {
    logger.error('Screening login error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

router.get('/auth/me', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const userId = (req as any).screeningUserId;
    const [org] = await db.select().from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);
    const [user] = await db.select().from(screeningUsers).where(eq(screeningUsers.id, userId)).limit(1);
    if (!org) return res.status(404).json(formatErrorResponse(404, 'Organization not found'));
    res.json(formatResponse('success', 200, 'Profile fetched', {
      organization: { id: org.id, name: org.name, email: org.email, walletBalance: org.walletBalance, logoUrl: org.logoUrl },
      user: { id: user?.id, name: user?.name || org.name, email: user?.email || org.email, role: user?.role || 'super_admin' },
    }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────

router.get('/dashboard/stats', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const [total] = await db.select({ count: count() }).from(screeningCandidates).where(eq(screeningCandidates.orgId, orgId));
    const [completed] = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.status, 'completed')));
    const [inProgress] = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.status, 'processing')));
    const [review] = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.status, 'review')));
    const [failed] = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.status, 'failed')));
    const [passed] = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.decision, 'PASS')));

    const completedCount = Number(completed.count);
    const passRate = completedCount > 0 ? Math.round((Number(passed.count) / completedCount) * 100) : 0;

    const recent = await db.select().from(screeningCandidates)
      .where(eq(screeningCandidates.orgId, orgId)).orderBy(desc(screeningCandidates.createdAt)).limit(5);

    const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);

    const unreadNotifs = await db.select({ count: count() }).from(screeningNotifications)
      .where(and(eq(screeningNotifications.orgId, orgId), eq(screeningNotifications.isRead, false)));

    res.json(formatResponse('success', 200, 'Stats fetched', {
      totalScreenings: Number(total.count),
      completed: Number(completed.count),
      inProgress: Number(inProgress.count),
      review: Number(review.count),
      failed: Number(failed.count),
      passRate,
      walletBalance: org?.walletBalance || '0',
      unreadNotifications: Number(unreadNotifs[0]?.count || 0),
      recentScreenings: recent,
    }));
  } catch (err: any) {
    logger.error('Dashboard stats error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch stats'));
  }
});

// ── CANDIDATES ────────────────────────────────────────────────────────────────

router.get('/candidates', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { status, decision, page = '1', limit: lim = '20', search } = req.query as any;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(lim)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(screeningCandidates.orgId, orgId)];
    if (status && status !== 'all') conditions.push(eq(screeningCandidates.status, status));
    if (decision) conditions.push(eq(screeningCandidates.decision, decision));

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    const [{ total }] = await db.select({ total: count() }).from(screeningCandidates).where(whereClause);

    const rows = await db.select().from(screeningCandidates).where(whereClause)
      .orderBy(desc(screeningCandidates.createdAt)).limit(limitNum).offset(offset);

    res.json(formatResponse('success', 200, 'Candidates fetched', {
      candidates: rows,
      pagination: { page: pageNum, limit: limitNum, total: Number(total), pages: Math.ceil(Number(total) / limitNum) },
    }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch candidates'));
  }
});

router.post('/candidates', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const userId = (req as any).screeningUserId;
    const { fullName, email, phone, position, nin, bvn, educationProvider, educationData } = req.body;

    if (!fullName || !nin || !bvn) {
      return res.status(400).json(formatErrorResponse(400, 'Full name, NIN and BVN are required'));
    }
    if (nin.length !== 11) return res.status(400).json(formatErrorResponse(400, 'NIN must be 11 digits'));
    if (bvn.length !== 11) return res.status(400).json(formatErrorResponse(400, 'BVN must be 11 digits'));

    const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);
    if (!org) return res.status(404).json(formatErrorResponse(404, 'Organization not found'));

    const balance = parseFloat(String(org.walletBalance || '0'));
    const PRICING = await getScreeningPricing();
    const charge = educationProvider ? PRICING.total : (PRICING.nin + PRICING.bvn + PRICING.fraud);
    if (balance < charge) {
      return res.status(402).json(formatErrorResponse(402, `Insufficient wallet balance. Need ₦${charge}, have ₦${balance.toLocaleString()}`));
    }

    // Fair-queue limit: cap in-flight jobs per org to prevent one org starving others
    const pendingResult = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM screening_candidates
      WHERE org_id = ${orgId} AND status IN ('pending', 'processing')
    `);
    const pendingJobs = Number((pendingResult.rows[0] as any)?.cnt || 0);
    const MAX_CONCURRENT_PER_ORG = 100;
    if (pendingJobs >= MAX_CONCURRENT_PER_ORG) {
      return res.status(429).json(formatErrorResponse(429,
        `Queue limit reached. You currently have ${pendingJobs} screenings in progress. Please wait for some to complete before submitting more.`
      ));
    }

    const reference = generateCandidateRef();
    const [candidate] = await db.insert(screeningCandidates).values({
      orgId,
      createdByUserId: userId || null,
      reference,
      fullName,
      email: email || null,
      phone: phone || null,
      position: position || null,
      nin,
      bvn,
      educationProvider: educationProvider || null,
      educationData: educationData || null,
      status: 'processing',
      amountCharged: String(charge),
      processingStartedAt: new Date(),
    }).returning();

    const balanceBefore = balance;
    await db.update(screeningOrganizations)
      .set({ walletBalance: String(balance - charge), updatedAt: new Date() })
      .where(eq(screeningOrganizations.id, orgId));

    await db.insert(screeningBillingTransactions).values({
      orgId,
      type: 'debit',
      amount: String(charge),
      balanceBefore: String(balanceBefore),
      balanceAfter: String(balance - charge),
      description: `Screening for ${fullName} (${reference})`,
      reference,
      candidateId: candidate.id,
    });

    (async () => {
      try {
        let ninResult: any = null;
        let bvnResult: any = null;
        let ninSuccess = false;
        let bvnSuccess = false;

        try {
          const ninRes = await premblyService.verifyNIN(nin);
          ninSuccess = ninRes.success;
          ninResult = ninRes.data || null;
        } catch (e: any) {
          logger.warn('NIN verification failed for screening', { reference, error: e.message });
        }

        try {
          const bvnRes = await premblyService.verifyBVN(bvn);
          bvnSuccess = bvnRes.success;
          bvnResult = bvnRes.data || null;
        } catch (e: any) {
          logger.warn('BVN verification failed for screening', { reference, error: e.message });
        }

        const fraud = computeFraudScore(ninResult, bvnResult);

        let rpaJobId: string | null = null;
        let status = 'completed';
        let circuitReason = '';

        if (educationProvider && educationData) {
          // Circuit breaker check — skip RPA if the portal is temporarily paused
          let circuitOpen = false;
          try {
            const cr = await db.execute(sql`
              SELECT circuit_open, circuit_open_until FROM screening_portal_circuit
              WHERE portal = ${educationProvider.toLowerCase()} LIMIT 1
            `);
            const circuit = cr.rows[0] as any;
            if (circuit?.circuit_open && circuit.circuit_open_until && new Date(circuit.circuit_open_until) > new Date()) {
              circuitOpen = true;
              const until = new Date(circuit.circuit_open_until).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
              circuitReason = `${educationProvider.toUpperCase()} portal is temporarily paused after repeated failures (circuit active until ${until}). Your request has been routed to manual review at no extra charge.`;
            } else if (circuit?.circuit_open) {
              // Expired circuit — auto-reset
              await db.execute(sql`
                UPDATE screening_portal_circuit
                SET circuit_open = false, consecutive_failures = 0, circuit_open_until = NULL, updated_at = NOW()
                WHERE portal = ${educationProvider.toLowerCase()}
              `);
            }
          } catch {}

          if (!circuitOpen) {
            const [rpaJob] = await db.insert(rpaJobs).values({
              userId: null,
              serviceType: `screening_${educationProvider}`,
              queryData: { ...educationData, educationProvider, screeningCandidateId: candidate.id },
              status: 'pending',
              priority: 1,
            }).returning();
            rpaJobId = rpaJob.id;
            status = 'processing';
          } else {
            status = 'manual_review';
          }
        }

        const { score, decision } = computeOverallScore(ninSuccess, bvnSuccess, ninResult, bvnResult);

        await db.update(screeningCandidates).set({
          ninResult: ninResult ? { success: ninSuccess, data: ninResult } : { success: false },
          bvnResult: bvnResult ? { success: bvnSuccess, data: bvnResult } : { success: false },
          fraudResult: { score: fraud.score, level: fraud.level, flags: fraud.flags },
          overallScore: educationProvider ? null : score,
          decision: educationProvider ? null : decision,
          status: educationProvider ? (status as any) : (fraud.score < 50 ? 'review' : decision === 'FAIL' ? 'failed' : 'completed'),
          rpaJobId: rpaJobId || null,
          ...(status === 'manual_review' ? {
            educationResult: {
              manualReview: true, reviewStatus: 'pending',
              failureReason: circuitReason, provider: educationProvider,
              circuitBreaker: true, requestedAt: new Date().toISOString(),
            } as any,
          } : {}),
          completedAt: educationProvider ? null : new Date(),
          updatedAt: new Date(),
        }).where(eq(screeningCandidates.id, candidate.id));

        if (!educationProvider) {
          const notifTitle = decision === 'PASS' ? 'Screening Completed — Pass' :
            decision === 'REVIEW' ? 'Screening Requires Review' : 'Screening Completed — Failed';
          const severity = decision === 'PASS' ? 'success' : decision === 'REVIEW' ? 'warning' : 'error';
          await db.insert(screeningNotifications).values({
            orgId,
            type: 'alert',
            title: notifTitle,
            message: `${fullName} scored ${score}% — ${decision}`,
            candidateId: candidate.id,
            severity,
          });
        } else if (status === 'manual_review') {
          await db.insert(screeningNotifications).values({
            orgId,
            type: 'alert',
            title: `Education Check — Portal Paused, Manual Review Started`,
            message: `${fullName}'s ${educationProvider.toUpperCase()} check has been routed to manual review automatically. Our team will process it within 2–4 hours at no extra charge. Reference: ${reference}`,
            candidateId: candidate.id,
            severity: 'warning',
          });
        }
      } catch (bgErr: any) {
        logger.error('Background screening error', { reference, error: bgErr.message });
        await db.update(screeningCandidates).set({ status: 'failed', updatedAt: new Date() })
          .where(eq(screeningCandidates.id, candidate.id));
      }
    })();

    res.status(201).json(formatResponse('success', 201, 'Screening started', { candidate, pricing: { charge, breakdown: PRICING } }));
  } catch (err: any) {
    logger.error('Create candidate error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to start screening'));
  }
});

router.get('/candidates/:id', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { id } = req.params;
    const [candidate] = await db.select().from(screeningCandidates)
      .where(and(eq(screeningCandidates.id, id), eq(screeningCandidates.orgId, orgId))).limit(1);
    if (!candidate) return res.status(404).json(formatErrorResponse(404, 'Candidate not found'));

    if (candidate.status === 'processing' && candidate.rpaJobId) {
      const [rpaJob] = await db.select().from(rpaJobs).where(eq(rpaJobs.id, candidate.rpaJobId)).limit(1);
      if (rpaJob?.status === 'completed' && rpaJob.result) {
        const eduResult = rpaJob.result as any;
        const ninResult = (candidate.ninResult as any)?.data;
        const bvnResult = (candidate.bvnResult as any)?.data;
        const ninSuccess = (candidate.ninResult as any)?.success || false;
        const bvnSuccess = (candidate.bvnResult as any)?.success || false;
        const fraud = computeFraudScore(ninResult, bvnResult);
        const { score, decision } = computeOverallScore(ninSuccess, bvnSuccess, ninResult, bvnResult, { found: true, nameMatch: true });

        await db.update(screeningCandidates).set({
          educationResult: eduResult,
          overallScore: score,
          decision,
          status: fraud.score < 50 ? 'review' : decision === 'FAIL' ? 'failed' : 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(screeningCandidates.id, id));

        await db.insert(screeningNotifications).values({
          orgId,
          type: 'alert',
          title: `Screening Completed — ${decision}`,
          message: `${candidate.fullName} scored ${score}% — ${decision}`,
          candidateId: id,
          severity: decision === 'PASS' ? 'success' : decision === 'REVIEW' ? 'warning' : 'error',
        }).catch(() => {});

        const [updated] = await db.select().from(screeningCandidates).where(eq(screeningCandidates.id, id)).limit(1);
        return res.json(formatResponse('success', 200, 'Candidate fetched', updated));
      }

      // RPA exhausted all retries → escalate to manual review instead of marking failed
      if (rpaJob?.status === 'failed') {
        const failureReason = (rpaJob as any).errorMessage
          || 'Portal automation failed after all retries. The exam body website may be temporarily unavailable.';

        await db.update(screeningCandidates).set({
          status: 'manual_review',
          educationResult: {
            manualReview: true,
            reviewStatus: 'pending',
            failureReason,
            provider: candidate.educationProvider,
            requestedAt: new Date().toISOString(),
          } as any,
          updatedAt: new Date(),
        }).where(eq(screeningCandidates.id, id));

        await db.insert(screeningNotifications).values({
          orgId,
          type: 'alert',
          title: 'Education Check — Manual Review',
          message: `${candidate.fullName}'s education verification has been escalated for manual review. Our team will process it within 2–4 hours at no extra charge. Reference: ${candidate.reference}`,
          candidateId: id,
          severity: 'warning',
        }).catch(() => {});

        const [updated] = await db.select().from(screeningCandidates).where(eq(screeningCandidates.id, id)).limit(1);
        return res.json(formatResponse('success', 200, 'Candidate fetched', updated));
      }
    }

    res.json(formatResponse('success', 200, 'Candidate fetched', candidate));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch candidate'));
  }
});

// ── BULK UPLOAD ───────────────────────────────────────────────────────────────

router.get('/bulk/batches', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const batches = await db.select().from(screeningBatches)
      .where(eq(screeningBatches.orgId, orgId)).orderBy(desc(screeningBatches.createdAt)).limit(20);
    res.json(formatResponse('success', 200, 'Batches fetched', batches));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch batches'));
  }
});

router.post('/bulk/upload', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const userId = (req as any).screeningUserId;
    const { candidates, fileName } = req.body;

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json(formatErrorResponse(400, 'Candidates array is required'));
    }
    if (candidates.length > 500) {
      return res.status(400).json(formatErrorResponse(400, 'Maximum 500 candidates per batch'));
    }

    const PRICING = await getScreeningPricing();
    const charge = candidates.length * PRICING.total;
    const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);
    const balance = parseFloat(String(org?.walletBalance || '0'));
    if (balance < charge) {
      return res.status(402).json(formatErrorResponse(402, `Insufficient balance. Need ₦${charge.toLocaleString()}, have ₦${balance.toLocaleString()}`));
    }

    const batchRef = generateBatchRef();
    const [batch] = await db.insert(screeningBatches).values({
      orgId,
      createdByUserId: userId || null,
      batchReference: batchRef,
      fileName: fileName || 'upload.csv',
      totalCandidates: candidates.length,
      status: 'processing',
      totalAmountCharged: String(charge),
    }).returning();

    const balanceBefore = balance;
    await db.update(screeningOrganizations)
      .set({ walletBalance: String(balance - charge), updatedAt: new Date() })
      .where(eq(screeningOrganizations.id, orgId));

    await db.insert(screeningBillingTransactions).values({
      orgId,
      type: 'debit',
      amount: String(charge),
      balanceBefore: String(balanceBefore),
      balanceAfter: String(balance - charge),
      description: `Bulk screening batch ${batchRef} — ${candidates.length} candidates`,
      reference: batchRef,
      batchId: batch.id,
    });

    const candidateRows = candidates.map((c: any) => ({
      orgId,
      createdByUserId: userId || null,
      batchId: batch.id,
      reference: generateCandidateRef(),
      fullName: c.fullName || c.full_name || '',
      email: c.email || null,
      phone: c.phone || null,
      position: c.position || null,
      nin: c.nin || '',
      bvn: c.bvn || '',
      educationProvider: c.educationProvider || c.education_provider || null,
      educationData: c.educationData || c.education_data || null,
      status: 'pending' as const,
      amountCharged: String(PRICING.total),
      processingStartedAt: new Date(),
    }));

    await db.insert(screeningCandidates).values(candidateRows);

    await db.insert(screeningNotifications).values({
      orgId,
      type: 'system',
      title: 'Bulk Upload Started',
      message: `Batch ${batchRef} — ${candidates.length} candidates queued for processing`,
      batchId: batch.id,
      severity: 'info',
    });

    res.status(201).json(formatResponse('success', 201, 'Bulk upload started', {
      batch,
      totalCharged: charge,
      candidatesQueued: candidates.length,
    }));
  } catch (err: any) {
    logger.error('Bulk upload error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Bulk upload failed'));
  }
});

router.get('/bulk/:batchId', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { batchId } = req.params;
    const [batch] = await db.select().from(screeningBatches)
      .where(and(eq(screeningBatches.id, batchId), eq(screeningBatches.orgId, orgId))).limit(1);
    if (!batch) return res.status(404).json(formatErrorResponse(404, 'Batch not found'));

    const candidates = await db.select().from(screeningCandidates)
      .where(and(eq(screeningCandidates.batchId, batchId), eq(screeningCandidates.orgId, orgId)))
      .orderBy(desc(screeningCandidates.createdAt)).limit(100);

    const completed = candidates.filter(c => c.status === 'completed').length;
    const processing = candidates.filter(c => c.status === 'processing' || c.status === 'pending').length;
    const failed = candidates.filter(c => c.status === 'failed').length;
    const review = candidates.filter(c => c.status === 'review').length;

    if (batch.status === 'processing' && completed > 0) {
      await db.update(screeningBatches).set({
        completedCandidates: completed,
        processingCandidates: processing,
        failedCandidates: failed,
        reviewCandidates: review,
        passCount: candidates.filter(c => c.decision === 'PASS').length,
        status: processing === 0 ? 'completed' : 'processing',
        completedAt: processing === 0 ? new Date() : null,
      }).where(eq(screeningBatches.id, batchId));
    }

    res.json(formatResponse('success', 200, 'Batch fetched', { batch, candidates, stats: { completed, processing, failed, review } }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch batch'));
  }
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

router.get('/analytics', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const totalScreenings = await db.select({ count: count() }).from(screeningCandidates).where(eq(screeningCandidates.orgId, orgId));
    const passed = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.decision, 'PASS')));
    const review = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.decision, 'REVIEW')));
    const failed = await db.select({ count: count() }).from(screeningCandidates).where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.decision, 'FAIL')));

    const recentScreenings = await db.select({
      date: sql<string>`DATE(${screeningCandidates.createdAt})`,
      count: count(),
    }).from(screeningCandidates)
      .where(and(eq(screeningCandidates.orgId, orgId), gte(screeningCandidates.createdAt, sevenDaysAgo)))
      .groupBy(sql`DATE(${screeningCandidates.createdAt})`)
      .orderBy(sql`DATE(${screeningCandidates.createdAt})`);

    const providerBreakdown = await db.select({
      provider: screeningCandidates.educationProvider,
      count: count(),
    }).from(screeningCandidates)
      .where(and(eq(screeningCandidates.orgId, orgId)))
      .groupBy(screeningCandidates.educationProvider);

    const totalCount = Number(totalScreenings[0]?.count || 0);
    const passCount = Number(passed[0]?.count || 0);
    const reviewCount = Number(review[0]?.count || 0);
    const failCount = Number(failed[0]?.count || 0);

    res.json(formatResponse('success', 200, 'Analytics fetched', {
      overview: {
        total: totalCount,
        passRate: totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0,
        reviewRate: totalCount > 0 ? Math.round((reviewCount / totalCount) * 100) : 0,
        failRate: totalCount > 0 ? Math.round((failCount / totalCount) * 100) : 0,
        passCount, reviewCount, failCount,
      },
      trend: recentScreenings,
      providerBreakdown,
    }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch analytics'));
  }
});

// ── FRAUD CENTER ──────────────────────────────────────────────────────────────

router.get('/fraud', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const allCandidates = await db.select().from(screeningCandidates)
      .where(and(eq(screeningCandidates.orgId, orgId), eq(screeningCandidates.status, 'completed')))
      .orderBy(desc(screeningCandidates.createdAt)).limit(200);

    const highRisk = allCandidates.filter(c => {
      const fr = c.fraudResult as any;
      return fr?.level === 'High Risk';
    });
    const mediumRisk = allCandidates.filter(c => {
      const fr = c.fraudResult as any;
      return fr?.level === 'Medium Risk';
    });
    const reviewQueue = allCandidates.filter(c => c.decision === 'REVIEW');

    res.json(formatResponse('success', 200, 'Fraud data fetched', {
      overview: { highRisk: highRisk.length, mediumRisk: mediumRisk.length, reviewQueue: reviewQueue.length },
      highRiskCandidates: highRisk.slice(0, 20),
      mediumRiskCandidates: mediumRisk.slice(0, 20),
    }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch fraud data'));
  }
});

// ── BILLING ───────────────────────────────────────────────────────────────────

router.get('/billing', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance, billingType: screeningOrganizations.billingType, autoDebitEnabled: screeningOrganizations.autoDebitEnabled })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);

    const transactions = await db.select().from(screeningBillingTransactions)
      .where(eq(screeningBillingTransactions.orgId, orgId)).orderBy(desc(screeningBillingTransactions.createdAt)).limit(30);

    const [monthlyTotal] = await db.select({ total: sum(screeningBillingTransactions.amount) })
      .from(screeningBillingTransactions)
      .where(and(
        eq(screeningBillingTransactions.orgId, orgId),
        eq(screeningBillingTransactions.type, 'debit'),
        gte(screeningBillingTransactions.createdAt, new Date(new Date().getFullYear(), new Date().getMonth(), 1))
      ));

    res.json(formatResponse('success', 200, 'Billing fetched', {
      walletBalance: org?.walletBalance || '0',
      billingType: org?.billingType || 'prepaid',
      autoDebitEnabled: org?.autoDebitEnabled || false,
      monthlySpend: monthlyTotal?.total || '0',
      transactions,
      pricing: await getScreeningPricing(),
    }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch billing'));
  }
});

router.post('/billing/fund', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { amount } = req.body;
    if (!amount || Number(amount) < 1000) {
      return res.status(400).json(formatErrorResponse(400, 'Minimum funding amount is ₦1,000'));
    }
    const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);
    const currentBalance = parseFloat(String(org?.walletBalance || '0'));
    const newBalance = currentBalance + Number(amount);

    await db.update(screeningOrganizations).set({ walletBalance: String(newBalance), updatedAt: new Date() })
      .where(eq(screeningOrganizations.id, orgId));

    await db.insert(screeningBillingTransactions).values({
      orgId,
      type: 'credit',
      amount: String(amount),
      balanceBefore: String(currentBalance),
      balanceAfter: String(newBalance),
      description: 'Wallet funded',
      reference: `FUND-${Date.now()}`,
    });

    res.json(formatResponse('success', 200, 'Wallet funded', { newBalance, amount }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fund wallet'));
  }
});

// ── PAYSTACK BILLING ──────────────────────────────────────────────────────────

router.post('/billing/paystack/initiate', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { amount } = req.body;
    const amtNgn = parseFloat(amount);
    if (!amtNgn || amtNgn < 1000) {
      return res.status(400).json(formatErrorResponse(400, 'Minimum amount is ₦1,000'));
    }

    let paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      const row = (await db.execute(sql`
        SELECT setting_value FROM admin_settings WHERE setting_key = 'paystack_secret_key' LIMIT 1
      `)).rows[0] as any;
      paystackKey = row?.setting_value || '';
    }
    if (!paystackKey) {
      return res.status(503).json(formatErrorResponse(503, 'Payment gateway not configured. Please contact support.'));
    }

    const [org] = await db.select({ email: screeningOrganizations.email })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);

    const originalKey = process.env.PAYSTACK_SECRET_KEY;
    process.env.PAYSTACK_SECRET_KEY = paystackKey;

    const reference = `scr_${orgId.slice(0, 8)}_${Date.now()}`;
    const callbackUrl = `${process.env.APP_BASE_URL || 'https://arapoint.com.ng'}/employment-screening/dashboard/billing?ref=${reference}`;

    try {
      const txData = await paystackService.initializeTransaction({
        email: org?.email || 'noreply@arapoint.com.ng',
        amountKobo: Math.round(amtNgn * 100),
        reference,
        callbackUrl,
        metadata: { orgId, purpose: 'screening_wallet_funding' },
      });

      await db.execute(sql`
        INSERT INTO screening_paystack_transactions (org_id, reference, amount_ngn, status, authorization_url)
        VALUES (${orgId}, ${reference}, ${amtNgn}, 'pending', ${txData.authorization_url})
      `);

      res.json(formatResponse('success', 200, 'Payment initiated', {
        authorizationUrl: txData.authorization_url,
        reference,
        amount: amtNgn,
      }));
    } finally {
      if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
      else process.env.PAYSTACK_SECRET_KEY = originalKey;
    }
  } catch (err: any) {
    logger.error('Screening Paystack initiate error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, err.message || 'Failed to initiate payment'));
  }
});

router.post('/billing/paystack-webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json(formatErrorResponse(401, 'Invalid Paystack signature'));
  }

  const { event, data } = req.body;
  res.sendStatus(200);

  if (event !== 'charge.success') return;

  try {
    const { reference, metadata } = data;
    const orgId = metadata?.orgId;
    if (!orgId || !reference) return;

    const verified = await paystackService.verifyTransaction(reference);
    if (verified.status !== 'success') return;

    const amtNgn = Math.round(verified.amount) / 100;

    const existing = ((await db.execute(sql`
      SELECT status FROM screening_paystack_transactions WHERE reference = ${reference}
    `)).rows[0] || {}) as any;
    if (existing.status === 'successful') return;

    const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance })
      .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);
    const currentBalance = parseFloat(String(org?.walletBalance || '0'));
    const newBalance = currentBalance + amtNgn;

    await db.update(screeningOrganizations)
      .set({ walletBalance: String(newBalance), updatedAt: new Date() })
      .where(eq(screeningOrganizations.id, orgId));

    await db.insert(screeningBillingTransactions).values({
      orgId,
      type: 'credit',
      amount: String(amtNgn),
      balanceBefore: String(currentBalance),
      balanceAfter: String(newBalance),
      description: `Wallet funded via Paystack — ref: ${reference}`,
      reference,
    });

    await db.execute(sql`
      UPDATE screening_paystack_transactions
      SET status = 'successful', paid_at = now()
      WHERE reference = ${reference}
    `);

    logger.info('Screening wallet funded via Paystack webhook', { orgId, amtNgn, reference });
  } catch (err: any) {
    logger.error('Screening Paystack webhook error', { error: err.message });
  }
});

router.get('/billing/paystack/verify/:reference', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { reference } = req.params;

    const result = await db.execute(sql`
      SELECT * FROM screening_paystack_transactions
      WHERE reference = ${reference} AND org_id = ${orgId}
    `);
    let tx = result.rows[0] as any;
    if (!tx) return res.status(404).json(formatErrorResponse(404, 'Transaction not found'));

    if (tx.status !== 'successful') {
      try {
        const verified = await paystackService.verifyTransaction(reference);
        if (verified.status === 'success') {
          const amtNgn = Math.round(verified.amount) / 100;

          const [org] = await db.select({ walletBalance: screeningOrganizations.walletBalance })
            .from(screeningOrganizations).where(eq(screeningOrganizations.id, orgId)).limit(1);
          const currentBalance = parseFloat(String(org?.walletBalance || '0'));
          const newBalance = currentBalance + amtNgn;

          // Atomic credit — only if not already successful
          const credited = await db.execute(sql`
            UPDATE screening_paystack_transactions
            SET status = 'successful', paid_at = now()
            WHERE reference = ${reference} AND status != 'successful'
            RETURNING id
          `);

          if ((credited.rows || []).length > 0) {
            await db.update(screeningOrganizations)
              .set({ walletBalance: String(newBalance), updatedAt: new Date() })
              .where(eq(screeningOrganizations.id, orgId));

            await db.insert(screeningBillingTransactions).values({
              orgId,
              type: 'credit',
              amount: String(amtNgn),
              balanceBefore: String(currentBalance),
              balanceAfter: String(newBalance),
              description: `Wallet funded via Paystack — ref: ${reference}`,
              reference,
            });

            logger.info('Screening wallet funded via verify endpoint', { orgId, amtNgn, reference });
          }

          tx = { ...tx, status: 'successful', amount_ngn: amtNgn };
        }
      } catch (verifyErr: any) {
        logger.warn('Paystack verify failed in screening verify endpoint', { reference, error: verifyErr.message });
      }
    }

    res.json(formatResponse('success', 200, 'Transaction fetched', tx));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to verify payment'));
  }
});

// ── TEAM ──────────────────────────────────────────────────────────────────────

router.get('/team', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const members = await db.select({
      id: screeningUsers.id, name: screeningUsers.name, email: screeningUsers.email,
      role: screeningUsers.role, isActive: screeningUsers.isActive, lastLoginAt: screeningUsers.lastLoginAt, createdAt: screeningUsers.createdAt,
    }).from(screeningUsers).where(eq(screeningUsers.orgId, orgId)).orderBy(desc(screeningUsers.createdAt));
    res.json(formatResponse('success', 200, 'Team fetched', members));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch team'));
  }
});

router.post('/team/invite', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { name, email, role } = req.body;
    if (!name || !email) return res.status(400).json(formatErrorResponse(400, 'Name and email are required'));
    const validRoles = ['super_admin', 'hr_manager', 'recruiter'];
    if (role && !validRoles.includes(role)) return res.status(400).json(formatErrorResponse(400, 'Invalid role'));

    const [existing] = await db.select({ id: screeningUsers.id }).from(screeningUsers)
      .where(and(eq(screeningUsers.orgId, orgId), eq(screeningUsers.email, email.toLowerCase()))).limit(1);
    if (existing) return res.status(409).json(formatErrorResponse(409, 'User already exists in team'));

    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const [user] = await db.insert(screeningUsers).values({
      orgId, name, email: email.toLowerCase(), role: role || 'recruiter', passwordHash,
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'Team member invited', {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tempPassword,
    }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to invite team member'));
  }
});

router.put('/team/:userId/role', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { userId } = req.params;
    const { role } = req.body;
    const validRoles = ['super_admin', 'hr_manager', 'recruiter'];
    if (!validRoles.includes(role)) return res.status(400).json(formatErrorResponse(400, 'Invalid role'));
    await db.update(screeningUsers).set({ role }).where(and(eq(screeningUsers.id, userId), eq(screeningUsers.orgId, orgId)));
    res.json(formatResponse('success', 200, 'Role updated', {}));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to update role'));
  }
});

router.delete('/team/:userId', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { userId } = req.params;
    const currentUserId = (req as any).screeningUserId;
    if (userId === currentUserId) return res.status(400).json(formatErrorResponse(400, 'Cannot remove yourself'));
    await db.update(screeningUsers).set({ isActive: false }).where(and(eq(screeningUsers.id, userId), eq(screeningUsers.orgId, orgId)));
    res.json(formatResponse('success', 200, 'Team member removed', {}));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to remove team member'));
  }
});

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────────

router.get('/notifications', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const notifications = await db.select().from(screeningNotifications)
      .where(eq(screeningNotifications.orgId, orgId)).orderBy(desc(screeningNotifications.createdAt)).limit(50);
    res.json(formatResponse('success', 200, 'Notifications fetched', notifications));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch notifications'));
  }
});

router.put('/notifications/:id/read', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { id } = req.params;
    await db.update(screeningNotifications).set({ isRead: true })
      .where(and(eq(screeningNotifications.id, id), eq(screeningNotifications.orgId, orgId)));
    res.json(formatResponse('success', 200, 'Notification marked as read', {}));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to mark notification'));
  }
});

router.put('/notifications/read-all', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    await db.update(screeningNotifications).set({ isRead: true }).where(eq(screeningNotifications.orgId, orgId));
    res.json(formatResponse('success', 200, 'All notifications marked as read', {}));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to mark notifications'));
  }
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────

router.put('/settings', screeningAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).screeningOrgId;
    const { name, phone, industry, size, website, billingType, autoDebitEnabled, autoDebitThreshold, autoDebitAmount } = req.body;
    await db.update(screeningOrganizations).set({
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(industry !== undefined && { industry }),
      ...(size !== undefined && { size }),
      ...(website !== undefined && { website }),
      ...(billingType !== undefined && { billingType }),
      ...(autoDebitEnabled !== undefined && { autoDebitEnabled }),
      ...(autoDebitThreshold !== undefined && { autoDebitThreshold: String(autoDebitThreshold) }),
      ...(autoDebitAmount !== undefined && { autoDebitAmount: String(autoDebitAmount) }),
      updatedAt: new Date(),
    }).where(eq(screeningOrganizations.id, orgId));
    res.json(formatResponse('success', 200, 'Settings updated', {}));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to update settings'));
  }
});

export default router;
