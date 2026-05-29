import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import {
  screeningOrganizations, screeningUsers, screeningCandidates,
  screeningBatches, screeningBillingTransactions, adminSettings,
} from "../../db/schema";
import { eq, and, desc, sql, gte, lt, count, sum, inArray, isNotNull } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { formatResponse, formatErrorResponse } from "../../utils/helpers";

const router = Router();

// ── ADMIN SCREENING ORGANIZATIONS ──────────────────────────────────────────

router.get("/organizations", async (req: Request, res: Response) => {
  try {
    const organizations = await db.select({
      id: screeningOrganizations.id,
      organizationName: screeningOrganizations.organizationName,
      email: screeningOrganizations.email,
      status: screeningOrganizations.status,
      walletBalance: screeningOrganizations.walletBalance,
      industry: screeningOrganizations.industry,
      createdAt: screeningOrganizations.createdAt,
    })
      .from(screeningOrganizations)
      .orderBy(desc(screeningOrganizations.createdAt));

    // Count screenings per org
    const withCounts = await Promise.all(
      organizations.map(async (org) => {
        const result = await db.execute(
          sql`SELECT COUNT(*) as count FROM screening_candidates WHERE org_id = ${org.id}`
        );
        return {
          ...org,
          screeningCount: Number((result.rows[0] as any)?.count || 0),
        };
      })
    );

    res.json(formatResponse("success", 200, "Organizations fetched", withCounts));
  } catch (err: any) {
    logger.error("Admin fetch organizations error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch organizations"));
  }
});

// ── ADMIN SCREENINGS ──────────────────────────────────────────────────────

router.get("/screenings", async (req: Request, res: Response) => {
  try {
    const { orgId, status } = req.query;

    let query = db.select({
      id: screeningCandidates.id,
      candidateName: screeningCandidates.firstName,
      nin: screeningCandidates.nin,
      bvn: screeningCandidates.bvn,
      decision: screeningCandidates.decision,
      score: screeningCandidates.overallScore,
      createdAt: screeningCandidates.createdAt,
    }).from(screeningCandidates);

    if (orgId) {
      query = query.where(eq(screeningCandidates.orgId, orgId as string));
    }

    if (status && status !== "all") {
      query = query.where(eq(screeningCandidates.decision, status as string));
    }

    const screenings = await query.orderBy(desc(screeningCandidates.createdAt)).limit(100);

    res.json(formatResponse("success", 200, "Screenings fetched", screenings));
  } catch (err: any) {
    logger.error("Admin fetch screenings error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch screenings"));
  }
});

// ── ADMIN SCREENING DETAILS ──────────────────────────────────────────────

router.get("/screenings/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const screening = await db.select().from(screeningCandidates)
      .where(eq(screeningCandidates.id, id))
      .limit(1);

    if (!screening.length) {
      return res.status(404).json(formatErrorResponse(404, "Screening not found"));
    }

    res.json(formatResponse("success", 200, "Screening details", screening[0]));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to fetch screening details"));
  }
});

// ── ADMIN MANUAL REVIEW ──────────────────────────────────────────────────

router.post("/screenings/:id/manual-review", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes, reviewedAt } = req.body;

    // Create audit table if needed
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS screening_manual_reviews (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        candidate_id UUID NOT NULL,
        decision TEXT NOT NULL,
        notes TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `).catch(e => logger.warn("Manual reviews table already exists"));

    // Update screening
    await db.update(screeningCandidates)
      .set({
        decision,
        updatedAt: new Date(),
      })
      .where(eq(screeningCandidates.id, id));

    // Log review
    await db.execute(sql`
      INSERT INTO screening_manual_reviews (candidate_id, decision, notes, reviewed_at)
      VALUES (${id}, ${decision}, ${notes}, ${reviewedAt})
    `);

    logger.info("Manual review completed", { id, decision });

    res.json(formatResponse("success", 200, "Manual review completed", { id, decision }));
  } catch (err: any) {
    logger.error("Manual review error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to save manual review"));
  }
});

// ── ADMIN FAILED EDUCATION CHECKS ────────────────────────────────────────

router.get("/failed-education-checks", async (req: Request, res: Response) => {
  try {
    // Create table if needed
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS screening_failed_education_checks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        candidate_id UUID NOT NULL,
        org_id UUID NOT NULL,
        candidate_name TEXT,
        exam_type TEXT,
        error_message TEXT,
        failed_at TIMESTAMPTZ DEFAULT now(),
        retry_count INT DEFAULT 0,
        max_retries INT DEFAULT 3,
        status TEXT DEFAULT 'failed',
        manual_override_decision TEXT,
        manual_override_notes TEXT,
        manual_override_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `).catch(e => logger.warn("Failed checks table already exists"));

    const failedChecks = await db.execute(sql`
      SELECT * FROM screening_failed_education_checks
      WHERE status = 'failed'
      ORDER BY failed_at DESC
      LIMIT 100
    `);

    const formatted = (failedChecks.rows || []).map((check: any) => ({
      id: check.id,
      candidateName: check.candidate_name,
      examType: check.exam_type,
      errorMessage: check.error_message,
      failedAt: check.failed_at,
      retryCount: check.retry_count,
      maxRetries: check.max_retries,
      manualOverrideDecision: check.manual_override_decision,
      manualOverrideNotes: check.manual_override_notes,
    }));

    res.json(formatResponse("success", 200, "Failed checks", formatted));
  } catch (err: any) {
    logger.error("Failed checks error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch failed checks"));
  }
});

// ── ADMIN RETRY FAILED EDUCATION CHECK ───────────────────────────────────

router.post("/failed-education-checks/:id/retry", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.execute(sql`
      SELECT * FROM screening_failed_education_checks WHERE id = ${id}
    `);

    if (!result.rows.length) {
      return res.status(404).json(formatErrorResponse(404, "Check not found"));
    }

    const failedCheck = result.rows[0] as any;

    if (failedCheck.retry_count >= failedCheck.max_retries) {
      return res.status(400).json(formatErrorResponse(400, "Max retries exceeded"));
    }

    // Increment retry count
    await db.execute(sql`
      UPDATE screening_failed_education_checks
      SET retry_count = retry_count + 1
      WHERE id = ${id}
    `);

    logger.info("Education check retry initiated", { id });

    res.json(formatResponse("success", 200, "Retry initiated", { retryCount: failedCheck.retry_count + 1 }));
  } catch (err: any) {
    logger.error("Retry error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Retry failed"));
  }
});

// ── ADMIN MANUAL OVERRIDE ────────────────────────────────────────────────

router.post("/failed-education-checks/:id/override", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    const result = await db.execute(sql`
      SELECT * FROM screening_failed_education_checks WHERE id = ${id}
    `);

    if (!result.rows.length) {
      return res.status(404).json(formatErrorResponse(404, "Check not found"));
    }

    const failedCheck = result.rows[0] as any;

    // Apply override
    await db.execute(sql`
      UPDATE screening_failed_education_checks
      SET
        status = 'overridden',
        manual_override_decision = ${decision},
        manual_override_notes = ${notes},
        manual_override_at = now()
      WHERE id = ${id}
    `);

    logger.info("Manual override applied", { id, decision });

    res.json(formatResponse("success", 200, "Override applied", { id, decision }));
  } catch (err: any) {
    logger.error("Override error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Override failed"));
  }
});

// ── ADMIN STATS ──────────────────────────────────────────────────────────

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const totalOrgs = await db.execute(sql`SELECT COUNT(*) as count FROM screening_organizations`);
    const totalScreenings = await db.execute(sql`SELECT COUNT(*) as count FROM screening_candidates`);
    const passedScreenings = await db.execute(sql`SELECT COUNT(*) as count FROM screening_candidates WHERE decision = 'pass'`);
    const failedScreenings = await db.execute(sql`SELECT COUNT(*) as count FROM screening_candidates WHERE decision = 'fail'`);
    const reviewScreenings = await db.execute(sql`SELECT COUNT(*) as count FROM screening_candidates WHERE decision = 'review'`);
    const failedEduChecks = await db.execute(sql`SELECT COUNT(*) as count FROM screening_failed_education_checks WHERE status = 'failed'`);

    const stats = {
      totalOrganizations: Number((totalOrgs.rows[0] as any)?.count || 0),
      totalScreenings: Number((totalScreenings.rows[0] as any)?.count || 0),
      passedScreenings: Number((passedScreenings.rows[0] as any)?.count || 0),
      failedScreenings: Number((failedScreenings.rows[0] as any)?.count || 0),
      reviewScreenings: Number((reviewScreenings.rows[0] as any)?.count || 0),
      failedEducationChecks: Number((failedEduChecks.rows[0] as any)?.count || 0),
      passRate: Math.round((Number((passedScreenings.rows[0] as any)?.count || 0) / (Number((totalScreenings.rows[0] as any)?.count || 1))) * 100),
    };

    res.json(formatResponse("success", 200, "Stats", stats));
  } catch (err: any) {
    logger.error("Stats error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch stats"));
  }
});

export default router;