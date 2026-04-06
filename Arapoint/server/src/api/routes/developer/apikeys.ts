import { Router } from 'express';
import {
  Request, Response, db, bcrypt, sql,
  developerApiKeys, eq, and, desc,
  devJwtAuth, generateApiKey, generateSecretKey,
} from './shared';

const router = Router();

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
    const { keyName, environment = 'sandbox' } = req.body;
    if (!keyName) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Key name required' });
    }
    if (!['sandbox', 'live'].includes(environment)) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Environment must be sandbox or live' });
    }
    if (environment === 'live' && dev.kycStatus !== 'approved') {
      return res.status(403).json({ status: 'error', code: 403, message: 'Live API keys require approved business verification (KYB)' });
    }
    const existing = await db.select({ id: developerApiKeys.id }).from(developerApiKeys)
      .where(and(eq(developerApiKeys.developerId, dev.id), eq(developerApiKeys.isActive, true)));
    if (existing.length >= 10) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Maximum 10 active API keys allowed' });
    }
    const apiKey = generateApiKey(environment as 'sandbox' | 'live');
    const secretRaw = generateSecretKey(environment as 'sandbox' | 'live');
    const secretHash = await bcrypt.hash(secretRaw, 10);
    const [key] = await db.insert(developerApiKeys).values({
      developerId: dev.id,
      keyName,
      apiKey,
      secretKeyHash: secretHash,
      secretKeyLastFour: secretRaw.slice(-4),
      environment,
    }).returning();
    res.status(201).json({
      status: 'success', code: 201, message: 'API key created',
      data: {
        key: { ...key, secretKey: secretRaw },
        note: 'Save your Secret Key now — it will not be shown again.',
      }
    });
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

export default router;
