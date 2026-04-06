import { Router } from 'express';
import {
  Request, Response, db, sql, desc,
  developerApiLogs, eq, and,
  devJwtAuth,
} from './shared';

const router = Router();

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

export default router;
