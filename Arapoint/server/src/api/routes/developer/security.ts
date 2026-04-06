import { Router } from 'express';
import {
  Request, Response, db, sql,
  devJwtAuth,
} from './shared';

const router = Router();

router.get('/security/ip-allowlist', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const list: string[] = (dev as any).ipAllowlist || [];
  res.json({ status: 'success', code: 200, data: { ipAllowlist: list, count: list.length } });
});

router.post('/security/ip-allowlist', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ status: 'error', code: 400, message: 'IP address required' });
  }
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(ip)) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Invalid IP address format' });
  }
  try {
    const current: string[] = (dev as any).ipAllowlist || [];
    if (current.includes(ip)) {
      return res.status(409).json({ status: 'error', code: 409, message: 'IP already on allowlist' });
    }
    const updated = [...current, ip];
    await db.execute(sql`UPDATE developer_users SET ip_allowlist = ${JSON.stringify(updated)}::jsonb, updated_at = now() WHERE id = ${dev.id}`);
    res.json({ status: 'success', code: 200, message: 'IP added to allowlist', data: { ipAllowlist: updated } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update allowlist' });
  }
});

router.delete('/security/ip-allowlist', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ status: 'error', code: 400, message: 'IP address required' });
  try {
    const current: string[] = (dev as any).ipAllowlist || [];
    const updated = current.filter((i: string) => i !== ip);
    await db.execute(sql`UPDATE developer_users SET ip_allowlist = ${JSON.stringify(updated)}::jsonb, updated_at = now() WHERE id = ${dev.id}`);
    res.json({ status: 'success', code: 200, message: 'IP removed from allowlist', data: { ipAllowlist: updated } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to update allowlist' });
  }
});

export default router;
