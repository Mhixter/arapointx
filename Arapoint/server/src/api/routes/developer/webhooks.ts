import { Router } from 'express';
import {
  Request, Response, db, crypto, sql,
  devJwtAuth,
} from './shared';

const router = Router();

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

router.post('/webhook/test', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  if (!dev.webhookUrl || !(dev as any).webhookSecret || !(dev as any).webhookEnabled) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Webhook not configured or not enabled' });
  }
  try {
    const { deliverWebhook } = await import('../../../services/webhookService');
    deliverWebhook(dev.id, dev.webhookUrl, (dev as any).webhookSecret, 'verification.test', {
      message: 'This is a test webhook from Arapoint',
      timestamp: new Date().toISOString(),
    });
    res.json({ status: 'success', code: 200, message: 'Test webhook queued for delivery' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to send test webhook' });
  }
});

export default router;
