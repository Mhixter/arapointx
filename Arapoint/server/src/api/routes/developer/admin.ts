import { Router } from 'express';
import {
  Request, Response, db, crypto, logger, sql, eq, ne, desc,
  developerUsers, developerApiKeys, developerApiLogs, developerTransactions,
  adminAuth,
  objectStorageService, ObjectNotFoundError,
} from './shared';

const router = Router();

async function writeAuditLog(adminId: string, action: string, targetDeveloperId: string | null, details: object, ipAddress: string) {
  try {
    await db.execute(sql`
      INSERT INTO developer_audit_logs (admin_id, action, target_developer_id, details, ip_address)
      VALUES (${adminId}, ${action}, ${targetDeveloperId || null}, ${JSON.stringify(details)}, ${ipAddress})
    `);
  } catch {}
}

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
    const devRow = (await db.execute(sql`
      SELECT id, email, name, environment_mode FROM developer_users WHERE id = ${id} LIMIT 1
    `)).rows[0] as any;
    if (!devRow) return res.status(404).json({ status: 'error', code: 404, message: 'Developer not found' });

    const [updated] = await db.update(developerUsers)
      .set({ sandboxBalance: sql`sandbox_balance + ${amt.toFixed(2)}`, updatedAt: new Date() })
      .where(eq(developerUsers.id, id))
      .returning({ sandboxBalance: developerUsers.sandboxBalance });

    const reference = 'ADMIN-SANDBOX-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const desc2 = reason?.trim()
      ? `Admin sandbox credit — ${reason.trim()}`
      : 'Admin sandbox wallet credit';

    await db.insert(developerTransactions).values({
      developerId: id,
      transactionType: 'wallet_funding',
      amount: amt.toFixed(2),
      description: desc2,
      referenceId: reference,
      status: 'successful',
      environment: 'sandbox',
    });

    try {
      const { sendEmail } = await import('../../../services/emailService');
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

router.get('/admin/developers', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const devs = await db.select({
      id: developerUsers.id, email: developerUsers.email, name: developerUsers.name,
      company: developerUsers.company, walletBalance: developerUsers.walletBalance,
      sandboxBalance: developerUsers.sandboxBalance, isActive: developerUsers.isActive,
      emailVerified: developerUsers.emailVerified, accountType: developerUsers.accountType,
      kycStatus: developerUsers.kycStatus, kycSubmittedAt: developerUsers.kycSubmittedAt,
      createdAt: developerUsers.createdAt,
    }).from(developerUsers)
      .orderBy(desc(developerUsers.createdAt))
      .limit(limit).offset(offset);

    const totalRow = ((await db.execute(sql`SELECT COUNT(*)::int as total FROM developer_users`)).rows[0] || {}) as any;
    const total = totalRow.total || 0;

    res.json({ status: 'success', code: 200, message: 'Developers retrieved', data: { developers: devs, page, limit, total } });
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

    res.json({ status: 'success', code: 200, message: 'Admin stats retrieved', data: { apiCalls: stats, developerStats: devStats } });
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
      kycStatus, kycReviewNote: note || null, kycReviewedAt: new Date(), updatedAt: new Date(),
    }).where(eq(developerUsers.id, req.params.id));

    try {
      const [devRecord] = await db.select().from(developerUsers)
        .where(eq(developerUsers.id, req.params.id)).limit(1);
      if (devRecord) {
        const { sendEmail } = await import('../../../services/emailService');
        const { devKybApprovedEmail, devKybConditionalEmail, devKybRejectedEmail } = await import('../../../utils/devEmailTemplates');
        const devFrom = { name: 'Arapoint Developers', email: 'developers@arapoint.com.ng' };
        if (kycStatus === 'approved') {
          await sendEmail(devRecord.email, 'KYB Approved — Welcome to Arapoint Live API', devKybApprovedEmail(devRecord.name, note), undefined, undefined, devFrom);
        } else if (kycStatus === 'conditional') {
          await sendEmail(devRecord.email, 'KYB Update — Conditional Approval', devKybConditionalEmail(devRecord.name, note), undefined, undefined, devFrom);
        } else if (kycStatus === 'rejected') {
          await sendEmail(devRecord.email, 'KYB Application — Not Approved', devKybRejectedEmail(devRecord.name, note), undefined, undefined, devFrom);
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
        apiKeys: keys.map(k => ({ ...k, secretKeyHash: undefined })),
        recentLogs, summary: txSummary,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get developer detail' });
  }
});

router.patch('/admin/developers/:id/rate-limit', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rateLimit } = req.body;
  const limit = parseInt(rateLimit);
  if (isNaN(limit) || limit < 0) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Rate limit must be a non-negative integer' });
  }
  if (limit > 1000000) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Maximum rate limit is 1,000,000 per day' });
  }
  try {
    const devRow = (await db.execute(sql`
      SELECT id, name, email FROM developer_users WHERE id = ${id} LIMIT 1
    `)).rows[0] as any;
    if (!devRow) return res.status(404).json({ status: 'error', code: 404, message: 'Developer not found' });

    await db.execute(sql`
      UPDATE developer_users SET custom_rate_limit = ${limit}, updated_at = now() WHERE id = ${id}
    `);

    logger.info('Admin updated developer rate limit', { developerId: id, newLimit: limit });
    res.json({
      status: 'success', code: 200,
      message: limit === 0
        ? 'Rate limit reset to default'
        : `Rate limit set to ${limit.toLocaleString()} requests/day`,
      data: { developerId: id, customRateLimit: limit },
    });
  } catch (e: any) {
    logger.error('Admin rate limit update error', { error: e.message, developerId: id });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update rate limit' });
  }
});

router.patch('/admin/developers/:id/promote', adminAuth, async (req: Request, res: Response) => {
  try {
    const { action } = req.body;
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

    res.json({ status: 'success', code: 200, message: 'Logs retrieved', data: { logs: logsWithDev.rows, page, limit } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get logs' });
  }
});

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

router.patch('/admin/queue/employment/:id/retry', adminAuth, async (req: Request, res: Response) => {
  try {
    const row = (await db.execute(sql`
      SELECT * FROM developer_employment_requests WHERE id = ${req.params.id} LIMIT 1
    `)).rows[0] as any;
    if (!row) return res.status(404).json({ status: 'error', code: 404, message: 'Queue item not found' });
    if (row.queue_status !== 'failed') {
      return res.status(400).json({ status: 'error', code: 400, message: 'Only failed jobs can be retried' });
    }

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

router.delete('/admin/queue/employment/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    await db.execute(sql`DELETE FROM developer_employment_requests WHERE id = ${req.params.id}`);
    res.json({ status: 'success', code: 200, message: 'Queue entry removed' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to delete queue entry' });
  }
});

export default router;
