import { Router } from 'express';
import {
  Request, Response, db, crypto, logger, sql,
  developerUsers, developerTransactions, eq,
  devJwtAuth, adminAuth, paystackService,
} from './shared';

const router = Router();

router.get('/transactions', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const environment = (req.query.environment as string) || null;
  const { and, eq: eqOp, desc } = await import('drizzle-orm');
  const whereClause = environment
    ? and(eqOp(developerTransactions.developerId, dev.id), eqOp(developerTransactions.environment, environment))
    : eqOp(developerTransactions.developerId, dev.id);
  const txs = await db.select().from(developerTransactions)
    .where(whereClause)
    .orderBy(desc(developerTransactions.createdAt))
    .limit(limit).offset(offset);
  res.json({ status: 'success', code: 200, message: 'Transactions retrieved', data: { transactions: txs, page, limit, environment: environment || 'all' } });
});

router.post('/wallet/fund', adminAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { amount } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Minimum fund amount is ₦100' });
    }
    if (amount > 1000000) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Maximum fund amount is ₦1,000,000' });
    }
    const [updated] = await db.update(developerUsers)
      .set({ walletBalance: sql`wallet_balance + ${parseFloat(amount).toFixed(2)}` })
      .where(eq(developerUsers.id, dev.id))
      .returning({ walletBalance: developerUsers.walletBalance });

    await db.insert(developerTransactions).values({
      developerId: dev.id,
      transactionType: 'wallet_funding',
      amount: parseFloat(amount).toFixed(2),
      description: 'Wallet funded',
      referenceId: 'FUND-' + crypto.randomBytes(8).toString('hex'),
      status: 'successful',
      environment: 'live',
    });

    try {
      const { sendEmail } = await import('../../../services/emailService');
      const newBal = parseFloat(updated.walletBalance || '0');
      await sendEmail(dev.email,
        `Wallet Funded — ₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} Added`,
        `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#0f1117;color:#e2e8f0;border-radius:12px">
          <div style="margin-bottom:20px"><span style="background:#059669;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600">Wallet Funded</span></div>
          <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 12px">Hi ${dev.name}, your wallet has been topped up!</h1>
          <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:16px;margin-bottom:20px">
            <p style="margin:0 0 8px;color:#6b7280;font-size:12px">AMOUNT ADDED</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#34d399">₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">New balance: <strong style="color:#fff">₦${newBal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></p>
          </div>
          <a href="https://arapoint.com.ng/developer/billing" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">View Billing</a>
          <p style="margin-top:24px;color:#475569;font-size:12px">Arapoint Developer Portal · arapoint.com.ng</p>
        </div>`
      );
    } catch {}

    res.json({
      status: 'success', code: 200, message: 'Wallet funded successfully',
      data: { newBalance: parseFloat(updated.walletBalance || '0'), amount }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fund wallet' });
  }
});

router.get('/billing/gateway-status', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  try {
    const settingRow = (await db.execute(sql`
      SELECT setting_value FROM admin_settings WHERE setting_key = 'paystack_secret_key' LIMIT 1
    `)).rows[0] as any;
    const paystackConfigured = !!(process.env.PAYSTACK_SECRET_KEY || settingRow?.setting_value);
    res.json({
      status: 'success', code: 200,
      data: {
        paystackConfigured,
        developerMode: (dev as any).environmentMode || 'sandbox',
        sandboxFundingAvailable: false,
      },
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to check gateway status' });
  }
});

router.post('/billing/initiate', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;

  if ((dev as any).environmentMode === 'sandbox') {
    return res.status(403).json({
      status: 'error', code: 403,
      message: 'Sandbox accounts cannot initiate Paystack payments. Contact the admin to credit your sandbox wallet for testing.',
    });
  }

  const { amount } = req.body;
  const amtNgn = parseFloat(amount);
  if (!amtNgn || amtNgn < 100) {
    return res.status(400).json({ status: 'error', code: 400, message: 'Minimum amount is ₦100' });
  }

  let paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) {
    const row = (await db.execute(sql`
      SELECT setting_value FROM admin_settings WHERE setting_key = 'paystack_secret_key' LIMIT 1
    `)).rows[0] as any;
    paystackKey = row?.setting_value || '';
  }
  if (!paystackKey) {
    return res.status(503).json({
      status: 'error', code: 503,
      message: 'Payment gateway not yet configured. Please contact support.',
    });
  }

  const originalKey = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = paystackKey;

  try {
    const reference = `ara_${dev.id.slice(0, 8)}_${Date.now()}`;
    const callbackUrl = `${process.env.APP_BASE_URL || 'https://arapoint.com.ng'}/developer/billing?ref=${reference}`;

    const txData = await paystackService.initializeTransaction({
      email: dev.email,
      amountKobo: Math.round(amtNgn * 100),
      reference,
      callbackUrl,
      metadata: { developerId: dev.id, purpose: 'wallet_funding' },
    });

    await db.execute(sql`
      INSERT INTO developer_paystack_transactions (developer_id, reference, amount_ngn, status, authorization_url)
      VALUES (${dev.id}, ${reference}, ${amtNgn}, 'pending', ${txData.authorization_url})
    `);

    res.json({
      status: 'success', code: 200, message: 'Payment initiated',
      data: {
        authorizationUrl: txData.authorization_url,
        reference,
        amount: amtNgn,
      }
    });
  } catch (e: any) {
    logger.error('Paystack initiate error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: e.message || 'Failed to initiate payment' });
  } finally {
    if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalKey;
  }
});

router.post('/billing/paystack-webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ status: 'error', message: 'Invalid Paystack signature' });
  }

  const { event, data } = req.body;
  res.sendStatus(200);

  if (event !== 'charge.success') return;

  try {
    const { reference, metadata, amount } = data;
    const developerId = metadata?.developerId;
    if (!developerId || !reference) return;

    const verified = await paystackService.verifyTransaction(reference);
    if (verified.status !== 'success') return;

    const amtNgn = Math.round(verified.amount) / 100;

    const existing = ((await db.execute(sql`
      SELECT status FROM developer_paystack_transactions WHERE reference = ${reference}
    `)).rows[0] || {}) as any;
    if (existing.status === 'successful') return;

    await db.execute(sql`
      UPDATE developer_users SET wallet_balance = wallet_balance + ${amtNgn}, updated_at = now()
      WHERE id = ${developerId}
    `);

    await db.insert(developerTransactions).values({
      developerId,
      transactionType: 'wallet_funding',
      amount: amtNgn.toFixed(2),
      description: `Wallet funded via Paystack — ref: ${reference}`,
      referenceId: reference,
      status: 'successful',
      environment: 'live',
    });

    await db.execute(sql`
      UPDATE developer_paystack_transactions
      SET status = 'successful', paystack_status = 'success', paid_at = now()
      WHERE reference = ${reference}
    `);

    logger.info('Developer wallet funded via Paystack', { developerId, amtNgn, reference });
  } catch (e: any) {
    logger.error('Paystack webhook processing error', { error: e.message });
  }
});

router.get('/billing/verify/:reference', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const { reference } = req.params;
  try {
    const result = await db.execute(sql`
      SELECT * FROM developer_paystack_transactions
      WHERE reference = ${reference} AND developer_id = ${dev.id}
    `);
    let tx = result.rows[0] as any;
    if (!tx) return res.status(404).json({ status: 'error', code: 404, message: 'Transaction not found' });

    if (tx.status !== 'successful') {
      try {
        const verified = await paystackService.verifyTransaction(reference);
        if (verified.status === 'success') {
          const amtNgn = Math.round(verified.amount) / 100;
          await db.execute(sql`
            UPDATE developer_users
            SET wallet_balance = wallet_balance + ${amtNgn}, updated_at = now()
            WHERE id = ${dev.id}
              AND NOT EXISTS (
                SELECT 1 FROM developer_paystack_transactions
                WHERE reference = ${reference} AND status = 'successful'
              )
          `);
          await db.execute(sql`
            UPDATE developer_paystack_transactions
            SET status = 'successful', paystack_status = 'success', paid_at = now()
            WHERE reference = ${reference}
          `);
          const updated = await db.execute(sql`
            SELECT * FROM developer_paystack_transactions WHERE reference = ${reference}
          `);
          tx = updated.rows[0] || tx;
          logger.info('Developer wallet funded via verify endpoint', { developerId: dev.id, amtNgn, reference });
        }
      } catch (verifyErr: any) {
        logger.warn('Paystack direct verify failed in verify endpoint', { reference, error: verifyErr.message });
      }
    }

    res.json({ status: 'success', code: 200, data: tx });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to verify payment' });
  }
});

router.get('/pricing', async (req: Request, res: Response) => {
  const { API_PRICES } = await import('./shared');
  res.json({
    status: 'success', code: 200, message: 'Developer API pricing',
    data: {
      pricing: [
        { service: 'NIN Verification', endpoint: 'POST /api/v1/developer/verify/nin', price: API_PRICES.nin, currency: 'NGN' },
        { service: 'BVN Verification', endpoint: 'POST /api/v1/developer/verify/bvn', price: API_PRICES.bvn, currency: 'NGN' },
        { service: 'Education Verification', endpoint: 'POST /api/v1/developer/verify/education', price: API_PRICES.education, currency: 'NGN' },
        { service: 'Unified Verification', endpoint: 'POST /api/v1/developer/verify/unified', price: API_PRICES.unified, currency: 'NGN' },
      ]
    }
  });
});

export default router;
