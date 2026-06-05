import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import { sql } from 'drizzle-orm';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { authRateLimiter } from '../middleware/rateLimit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

const router = Router();

// ── Table migrations ────────────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS screening_reviewer_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by_admin_id UUID,
        notes TEXT,
        reviews_completed INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS screening_portal_circuit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        portal VARCHAR(50) UNIQUE NOT NULL,
        consecutive_failures INT DEFAULT 0,
        total_failures INT DEFAULT 0,
        total_successes INT DEFAULT 0,
        last_failure_at TIMESTAMPTZ,
        last_success_at TIMESTAMPTZ,
        circuit_open BOOLEAN DEFAULT false,
        circuit_open_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      INSERT INTO screening_portal_circuit (portal)
      VALUES ('waec'), ('neco'), ('nabteb'), ('nbais'), ('jamb')
      ON CONFLICT (portal) DO NOTHING
    `);

    logger.info('Screening reviewer tables ready');
  } catch (e: any) {
    logger.warn('Screening reviewer table migration', { error: e.message });
  }
})();

// ── Auth middleware ──────────────────────────────────────────────────────────
const reviewerAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json(formatErrorResponse(401, 'Authentication required'));
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    if (decoded.role !== 'screening_reviewer') {
      return res.status(403).json(formatErrorResponse(403, 'Screening reviewer role required'));
    }
    const result = await db.execute(sql`
      SELECT id, name, email, reviews_completed FROM screening_reviewer_agents
      WHERE id = ${decoded.agentId} AND is_active = true LIMIT 1
    `);
    if (!result.rows.length) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account inactive or not found'));
    }
    (req as any).reviewerId = decoded.agentId;
    (req as any).reviewerName = (result.rows[0] as any).name;
    next();
  } catch {
    return res.status(401).json(formatErrorResponse(401, 'Invalid or expired token'));
  }
};

// ── Login ────────────────────────────────────────────────────────────────────
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Email and password required'));
    }
    const result = await db.execute(sql`
      SELECT * FROM screening_reviewer_agents WHERE email = ${email.toLowerCase()} LIMIT 1
    `);
    const agent = result.rows[0] as any;
    if (!agent) return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    if (!agent.is_active) return res.status(403).json(formatErrorResponse(403, 'Account is inactive'));
    const valid = await bcrypt.compare(password, agent.password_hash);
    if (!valid) return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));

    const token = jwt.sign(
      { agentId: agent.id, name: agent.name, email: agent.email, role: 'screening_reviewer' },
      config.JWT_SECRET,
      { expiresIn: '12h' }
    );
    logger.info('Reviewer agent login', { agentId: agent.id });
    res.json(formatResponse('success', 200, 'Login successful', {
      token,
      agent: { id: agent.id, name: agent.name, email: agent.email, reviewsCompleted: agent.reviews_completed },
    }));
  } catch (err: any) {
    logger.error('Reviewer login error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

// ── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', reviewerAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, email, reviews_completed, created_at
      FROM screening_reviewer_agents WHERE id = ${(req as any).reviewerId} LIMIT 1
    `);
    res.json(formatResponse('success', 200, 'Profile', result.rows[0]));
  } catch {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch profile'));
  }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', reviewerAuth, async (req: Request, res: Response) => {
  try {
    const s = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'manual_review') AS pending_queue,
        COUNT(*) FILTER (WHERE status IN ('completed','review','failed')
          AND updated_at > NOW() - INTERVAL '24 hours') AS completed_today,
        COUNT(*) FILTER (WHERE status = 'manual_review'
          AND created_at > NOW() - INTERVAL '1 hour') AS new_last_hour
      FROM screening_candidates
    `);
    const myStats = await db.execute(sql`
      SELECT reviews_completed FROM screening_reviewer_agents
      WHERE id = ${(req as any).reviewerId} LIMIT 1
    `);
    res.json(formatResponse('success', 200, 'Stats', {
      ...(s.rows[0] as any),
      myReviews: (myStats.rows[0] as any)?.reviews_completed || 0,
    }));
  } catch {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch stats'));
  }
});

// ── Queue (manual review list) ───────────────────────────────────────────────
router.get('/queue', reviewerAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        sc.id, sc.reference, sc.full_name, sc.email,
        sc.education_provider, sc.education_data, sc.education_result,
        sc.nin_result, sc.bvn_result, sc.fraud_result,
        sc.amount_charged, sc.created_at, sc.updated_at, sc.org_id,
        so.organization_name,
        rj.error_message AS rpa_error
      FROM screening_candidates sc
      JOIN screening_organizations so ON sc.org_id = so.id
      LEFT JOIN rpa_jobs rj ON sc.rpa_job_id = rj.id
      WHERE sc.status = 'manual_review'
      ORDER BY sc.created_at ASC
    `);
    res.json(formatResponse('success', 200, 'Queue', {
      candidates: rows.rows,
      count: rows.rows.length,
    }));
  } catch (err: any) {
    logger.error('Reviewer queue error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch queue'));
  }
});

// ── Submit manual review ─────────────────────────────────────────────────────
router.post('/queue/:candidateId/submit', reviewerAuth, async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;
    const { found, subjectGrades, nameMatch, dobMatch, decision, overallScore, notes } = req.body;
    const reviewerId = (req as any).reviewerId;
    const reviewerName = (req as any).reviewerName;

    const cRows = await db.execute(sql`
      SELECT * FROM screening_candidates WHERE id = ${candidateId} AND status = 'manual_review' LIMIT 1
    `);
    if (!cRows.rows.length) {
      return res.status(404).json(formatErrorResponse(404, 'Candidate not found or not awaiting review'));
    }
    const c = cRows.rows[0] as any;

    const finalDecision: string = decision || (found && nameMatch ? 'PASS' : 'FAIL');
    const finalScore: number = overallScore
      ?? (found && nameMatch && dobMatch ? 85 : found && nameMatch ? 70 : found ? 55 : 30);
    const finalStatus = finalDecision === 'PASS' ? 'completed'
      : finalDecision === 'REVIEW' ? 'review' : 'failed';

    let parsedGrades: any = {};
    if (subjectGrades) {
      try {
        parsedGrades = typeof subjectGrades === 'string' ? JSON.parse(subjectGrades) : subjectGrades;
      } catch {
        const lines = String(subjectGrades).split('\n').filter(Boolean);
        parsedGrades = Object.fromEntries(lines.map(l => {
          const [k, ...v] = l.split(':');
          return [k.trim(), v.join(':').trim()];
        }));
      }
    }

    const educationResult = {
      manualReview: true,
      reviewStatus: 'completed',
      completedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      found: !!found,
      subjectGrades: parsedGrades,
      nameMatch: !!nameMatch,
      dobMatch: !!dobMatch,
      notes: notes || '',
    };

    await db.execute(sql`
      UPDATE screening_candidates
      SET
        status = ${finalStatus},
        education_result = ${JSON.stringify(educationResult)}::jsonb,
        overall_score = ${finalScore},
        decision = ${finalDecision},
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${candidateId}
    `);

    await db.execute(sql`
      INSERT INTO screening_notifications
        (id, org_id, type, title, message, candidate_id, severity, created_at)
      VALUES (
        gen_random_uuid(), ${c.org_id}, 'alert',
        ${'Manual Review Complete — ' + finalDecision},
        ${`${c.full_name}'s education verification is complete. Result: ${finalDecision} (${finalScore}%). Reference: ${c.reference}`},
        ${candidateId},
        ${finalDecision === 'PASS' ? 'success' : finalDecision === 'REVIEW' ? 'warning' : 'error'},
        NOW()
      )
    `);

    await db.execute(sql`
      UPDATE screening_reviewer_agents
      SET reviews_completed = reviews_completed + 1, updated_at = NOW()
      WHERE id = ${reviewerId}
    `);

    logger.info('Reviewer submitted manual review', { candidateId, reviewerId, decision: finalDecision });
    res.json(formatResponse('success', 200, 'Review submitted', {
      candidateId, decision: finalDecision, score: finalScore, status: finalStatus,
    }));
  } catch (err: any) {
    logger.error('Reviewer submit error', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to submit review'));
  }
});

// ── Portal health (read-only for agents) ─────────────────────────────────────
router.get('/portal-health', reviewerAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT portal, consecutive_failures, circuit_open, circuit_open_until, last_failure_at, last_success_at
      FROM screening_portal_circuit ORDER BY portal
    `);
    res.json(formatResponse('success', 200, 'Portal health', rows.rows));
  } catch {
    res.json(formatResponse('success', 200, 'Portal health', []));
  }
});

export default router;
