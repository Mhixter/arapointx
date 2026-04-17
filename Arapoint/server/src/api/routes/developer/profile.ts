import { Router } from 'express';
import {
  Request, Response, db, bcrypt, logger, sql,
  developerUsers, developerApiKeys, developerApiLogs, eq, and, desc,
  devJwtAuth, devBalance,
} from './shared';

const router = Router();

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
      twoFactorEnabled: (dev as any).twoFactorEnabled || false,
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

export default router;
