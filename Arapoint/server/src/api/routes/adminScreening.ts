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

// ── ADMIN FUND ORGANIZATION ───────────────────────────────────────────────

router.post("/organizations/:id/fund", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json(formatErrorResponse(400, "Valid amount required"));
    }

    const org = await db.select().from(screeningOrganizations).where(eq(screeningOrganizations.id, id)).limit(1);
    if (!org.length) return res.status(404).json(formatErrorResponse(404, "Organization not found"));

    const current = parseFloat(String(org[0].walletBalance || "0"));
    const funded = Number(amount);
    const newBalance = current + funded;

    await db.execute(sql`
      UPDATE screening_organizations
      SET wallet_balance = ${newBalance}, updated_at = now()
      WHERE id = ${id}
    `);

    await db.execute(sql`
      INSERT INTO screening_billing_transactions (id, org_id, type, amount, description, status, created_at)
      VALUES (gen_random_uuid(), ${id}, 'credit', ${funded}, ${note || 'Admin wallet top-up'}, 'completed', now())
    `).catch(() => {});

    logger.info("Admin funded org wallet", { orgId: id, amount: funded, newBalance });
    res.json(formatResponse("success", 200, "Wallet funded", { newBalance }));
  } catch (err: any) {
    logger.error("Fund org error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fund wallet"));
  }
});

// ── ADMIN ORG DETAIL + ACTIVITIES ────────────────────────────────────────

router.get("/organizations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const org = await db.execute(sql`
      SELECT o.*,
        (SELECT COUNT(*) FROM screening_candidates c WHERE c.org_id = o.id) AS total_screenings,
        (SELECT COUNT(*) FROM screening_candidates c WHERE c.org_id = o.id AND c.decision = 'pass') AS pass_count,
        (SELECT COUNT(*) FROM screening_candidates c WHERE c.org_id = o.id AND c.decision = 'fail') AS fail_count,
        (SELECT COUNT(*) FROM screening_users u WHERE u.org_id = o.id) AS team_members
      FROM screening_organizations o
      WHERE o.id = ${id}
      LIMIT 1
    `);

    if (!org.rows.length) return res.status(404).json(formatErrorResponse(404, "Organization not found"));

    const transactions = await db.execute(sql`
      SELECT * FROM screening_billing_transactions
      WHERE org_id = ${id}
      ORDER BY created_at DESC
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    const recentScreenings = await db.execute(sql`
      SELECT id, full_name, decision, overall_score, created_at, status
      FROM screening_candidates
      WHERE org_id = ${id}
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json(formatResponse("success", 200, "Organization detail", {
      organization: org.rows[0],
      transactions: transactions.rows,
      recentScreenings: recentScreenings.rows,
    }));
  } catch (err: any) {
    logger.error("Org detail error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch organization"));
  }
});

// ── ADMIN SUSPEND / ACTIVATE ORG ─────────────────────────────────────────

router.patch("/organizations/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json(formatErrorResponse(400, "Status must be 'active' or 'suspended'"));
    }
    await db.execute(sql`
      UPDATE screening_organizations SET is_active = ${status === "active"}, updated_at = now() WHERE id = ${id}
    `);
    res.json(formatResponse("success", 200, `Organization ${status}`, { id, status }));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to update status"));
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

// ── MANUAL REVIEW QUEUE ────────────────────────────────────────────────────

router.get("/manual-review/queue", async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        sc.id, sc.reference, sc.full_name, sc.email, sc.nin, sc.bvn,
        sc.education_provider, sc.education_data, sc.education_result,
        sc.nin_result, sc.bvn_result, sc.fraud_result,
        sc.overall_score, sc.decision, sc.amount_charged,
        sc.processing_started_at, sc.created_at, sc.updated_at,
        sc.rpa_job_id, sc.org_id,
        so.organization_name, so.email AS org_email,
        rj.error_message AS rpa_error, rj.retry_count AS rpa_retries
      FROM screening_candidates sc
      JOIN screening_organizations so ON sc.org_id = so.id
      LEFT JOIN rpa_jobs rj ON sc.rpa_job_id = rj.id
      WHERE sc.status = 'manual_review'
      ORDER BY sc.created_at ASC
    `);
    res.json(formatResponse("success", 200, "Manual review queue", {
      candidates: rows.rows,
      count: rows.rows.length,
    }));
  } catch (err: any) {
    logger.error("Manual review queue error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch manual review queue"));
  }
});

router.post("/manual-review/:candidateId/submit", async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;
    const { found, subjectGrades, nameMatch, dobMatch, decision, overallScore, notes } = req.body;

    const cRows = await db.execute(sql`
      SELECT * FROM screening_candidates WHERE id = ${candidateId} AND status = 'manual_review' LIMIT 1
    `);
    if (!cRows.rows.length) {
      return res.status(404).json(formatErrorResponse(404, "Candidate not found or not in manual review"));
    }
    const c = cRows.rows[0] as any;

    const educationResult = {
      manualReview: true,
      reviewStatus: "completed",
      completedAt: new Date().toISOString(),
      found: !!found,
      subjectGrades: subjectGrades || {},
      nameMatch: !!nameMatch,
      dobMatch: !!dobMatch,
      notes: notes || "",
    };

    const finalDecision: string = decision || (found && nameMatch ? "PASS" : "FAIL");
    const finalScore: number =
      overallScore ??
      (found && nameMatch && dobMatch ? 85 : found && nameMatch ? 70 : found ? 55 : 30);
    const finalStatus =
      finalDecision === "PASS" ? "completed" : finalDecision === "REVIEW" ? "review" : "failed";

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
      INSERT INTO screening_notifications (id, org_id, type, title, message, candidate_id, severity, created_at)
      VALUES (
        gen_random_uuid(), ${c.org_id}, 'alert',
        ${"Manual Review Complete — " + finalDecision},
        ${`${c.full_name}'s education verification is complete. Result: ${finalDecision} (${finalScore}%). Reference: ${c.reference}`},
        ${candidateId},
        ${finalDecision === "PASS" ? "success" : finalDecision === "REVIEW" ? "warning" : "error"},
        NOW()
      )
    `);

    logger.info("Manual review submitted", { candidateId, decision: finalDecision, score: finalScore });
    res.json(
      formatResponse("success", 200, "Manual review submitted", {
        candidateId,
        decision: finalDecision,
        score: finalScore,
        status: finalStatus,
      })
    );
  } catch (err: any) {
    logger.error("Manual review submit error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to submit manual review"));
  }
});

// ── QUEUE MONITORING STATS ────────────────────────────────────────────────

router.get("/queue/stats", async (req: Request, res: Response) => {
  try {
    const cStats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')       AS pending,
        COUNT(*) FILTER (WHERE status = 'processing')    AS processing,
        COUNT(*) FILTER (WHERE status = 'manual_review') AS manual_review,
        COUNT(*) FILTER (WHERE status = 'completed')     AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')        AS failed,
        COUNT(*) FILTER (WHERE status = 'review')        AS under_review,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')   AS last_1h
      FROM screening_candidates
    `);

    const rpaStats = await db.execute(sql`
      SELECT
        service_type,
        COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing,
        COUNT(*) FILTER (WHERE status = 'failed')     AS failed,
        COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60)
          FILTER (WHERE status = 'completed'), 1
        ) AS avg_minutes
      FROM rpa_jobs
      WHERE service_type LIKE 'screening_%'
      GROUP BY service_type
      ORDER BY service_type
    `);

    res.json(
      formatResponse("success", 200, "Queue stats", {
        candidates: cStats.rows[0],
        rpaByPortal: rpaStats.rows,
      })
    );
  } catch (err: any) {
    logger.error("Queue stats error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to fetch queue stats"));
  }
});

export default router;