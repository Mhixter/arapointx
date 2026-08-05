import { Router, Request, Response } from 'express';
import { payvesselService } from '../../services/payvesselService';
import { paymentpointService } from '../../services/paymentpointService';
import { walletService } from '../../services/walletService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { sendEmail } from '../../services/emailService';
import { db } from '../../config/database';
import { users, airtimeServices, dataServices } from '../../db/schema';
import { eq, or } from 'drizzle-orm';

const AN_DELIVERED_STATUSES = ['delivered', 'success', 'completed', 'successful', 'processed'];

async function sendWalletCreditEmail(userId: string, amount: number, newBalance: number, reference: string, _provider: string) {
  try {
    const [user] = await db.select({ email: users.email, name: users.name })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.email) return;

    const amountFormatted = `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const balanceFormatted = `₦${newBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const firstName = user.name?.split(' ')[0] || 'User';

    const { userWalletFundedEmail } = await import('../../utils/userEmailTemplates');
    const html = userWalletFundedEmail(firstName, amountFormatted, balanceFormatted, reference);

    await sendEmail(
      user.email,
      `Wallet Funded: ${amountFormatted} credited to your Arapoint wallet`,
      html,
      undefined, undefined,
      { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
    );
  } catch (err: any) {
    logger.warn('Failed to send wallet credit email', { userId, error: err.message });
  }
}

const router = Router();

router.post('/paymentpoint', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['paymentpoint-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      logger.warn('PaymentPoint webhook received without signature', { headers: Object.keys(req.headers) });
      return res.status(401).json(formatErrorResponse(401, 'Missing webhook signature'));
    }

    if (!paymentpointService.verifyWebhookSignature(payload, signature)) {
      logger.warn('PaymentPoint webhook signature verification failed', { signature });
      return res.status(401).json(formatErrorResponse(401, 'Invalid webhook signature'));
    }

    const webhookData = paymentpointService.parseWebhookPayload(req.body);

    if (!webhookData) {
      logger.error('Failed to parse PaymentPoint webhook payload', { payload: req.body });
      return res.status(400).json(formatErrorResponse(400, 'Invalid webhook payload'));
    }

    const isSuccess = webhookData.status === 'success' || webhookData.notificationStatus === 'payment_successful';
    if (!isSuccess) {
      logger.info('PaymentPoint webhook received with non-successful status', {
        status: webhookData.status,
        notificationStatus: webhookData.notificationStatus,
        transactionId: webhookData.transactionId,
      });
      return res.json(formatResponse('success', 200, 'Webhook received but transaction not processed'));
    }

    const userId = await virtualAccountService.findUserByAccountNumber(
      webhookData.receiverAccountNumber
    );

    if (!userId) {
      logger.warn('PaymentPoint webhook: Account number not found', {
        accountNumber: webhookData.receiverAccountNumber,
      });
      return res.status(404).json(formatErrorResponse(404, 'Account not found'));
    }

    const fundResult = await walletService.addBalance(
      userId,
      webhookData.amountPaid,
      webhookData.transactionId,
      'paymentpoint_transfer'
    );

    sendWalletCreditEmail(userId, webhookData.amountPaid, fundResult.newBalance, webhookData.transactionId, 'Bank Transfer (PaymentPoint)').catch(() => {});

    logger.info('PaymentPoint webhook processed successfully', {
      userId,
      accountNumber: webhookData.receiverAccountNumber,
      amount: webhookData.amountPaid,
      transactionId: webhookData.transactionId,
      newBalance: fundResult.newBalance,
    });

    return res.json(formatResponse('success', 200, 'Webhook processed successfully', {
      userId,
      amount: webhookData.amountPaid,
      newBalance: fundResult.newBalance,
      transactionId: webhookData.transactionId,
    }));

  } catch (error: any) {
    logger.error('PaymentPoint webhook processing error', {
      error: error.message,
      body: req.body,
    });
    return res.status(500).json(formatErrorResponse(500, 'Webhook processing failed'));
  }
});

router.post('/payvessel', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-payvessel-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      logger.warn('PayVessel webhook received without signature');
      return res.status(401).json(formatErrorResponse(401, 'Missing webhook signature'));
    }

    if (!payvesselService.verifyWebhookSignature(payload, signature)) {
      logger.warn('PayVessel webhook signature verification failed', { signature });
      return res.status(401).json(formatErrorResponse(401, 'Invalid webhook signature'));
    }

    const webhookData = payvesselService.parseWebhookPayload(req.body);

    if (!webhookData) {
      logger.error('Failed to parse PayVessel webhook payload', { payload: req.body });
      return res.status(400).json(formatErrorResponse(400, 'Invalid webhook payload'));
    }

    if (webhookData.status !== 'successful' && webhookData.status !== 'completed') {
      logger.info('PayVessel webhook received with non-successful status', {
        status: webhookData.status,
        reference: webhookData.transactionReference,
      });
      return res.json(formatResponse('success', 200, 'Webhook received but transaction not processed'));
    }

    const userId = await virtualAccountService.findUserByAccountNumber(
      webhookData.destinationAccountNumber
    );

    if (!userId) {
      logger.warn('PayVessel webhook: Account number not found', {
        accountNumber: webhookData.destinationAccountNumber,
      });
      return res.status(404).json(formatErrorResponse(404, 'Account not found'));
    }

    const fundResult = await walletService.addBalance(
      userId,
      webhookData.amount,
      webhookData.transactionReference,
      'payvessel_transfer'
    );

    sendWalletCreditEmail(userId, webhookData.amount, fundResult.newBalance, webhookData.transactionReference, 'Bank Transfer').catch(() => {});

    logger.info('PayVessel webhook processed successfully', {
      userId,
      accountNumber: webhookData.destinationAccountNumber,
      amount: webhookData.amount,
      reference: webhookData.transactionReference,
      newBalance: fundResult.newBalance,
    });

    return res.json(formatResponse('success', 200, 'Webhook processed successfully', {
      userId,
      amount: webhookData.amount,
      newBalance: fundResult.newBalance,
      reference: webhookData.transactionReference,
    }));

  } catch (error: any) {
    logger.error('PayVessel webhook processing error', {
      error: error.message,
      body: req.body,
    });
    return res.status(500).json(formatErrorResponse(500, 'Webhook processing failed'));
  }
});

// ─── VTUGate Delivery Webhook ────────────────────────────────────────────────
// VTUGate POSTs to this URL when airtime/data transaction status changes.
router.post('/vtugate', async (req: Request, res: Response) => {
  res.json({ status: 'ok' });

  try {
    const body = req.body || {};
    logger.info('VTUGate webhook received', { body });

    const reference: string = (
      body.reference ||
      body.transaction_reference ||
      body.transactionReference ||
      body.data?.reference ||
      ''
    ).toString().trim();

    if (!reference) {
      logger.warn('VTUGate webhook: no reference in payload', { body });
      return;
    }

    const rawStatus: string = (
      body.delivery_status ||
      body.status ||
      body.transaction_status ||
      body.data?.delivery_status ||
      body.data?.status ||
      ''
    ).toString().toLowerCase();

    const VG_DELIVERED = ['delivered', 'success', 'completed', 'successful', 'processed'];
    const VG_FAILED = ['failed', 'error', 'reversed', 'refunded'];
    const isDelivered = VG_DELIVERED.includes(rawStatus);
    const isFailed = VG_FAILED.includes(rawStatus);

    logger.info('VTUGate webhook status', { reference, rawStatus, isDelivered, isFailed });

    if (!isDelivered && !isFailed) {
      logger.info('VTUGate webhook: intermediate status, skipping DB update', { reference, rawStatus });
      return;
    }

    const newStatus = isDelivered ? 'completed' : 'failed';

    // Try airtime first
    const [airtimeTx] = await db.select({ id: airtimeServices.id, status: airtimeServices.status })
      .from(airtimeServices)
      .where(or(eq(airtimeServices.reference, reference), eq(airtimeServices.transactionId, reference)))
      .limit(1);

    if (airtimeTx) {
      if (airtimeTx.status !== newStatus) {
        await db.update(airtimeServices).set({ status: newStatus }).where(eq(airtimeServices.id, airtimeTx.id));
        logger.info('VTUGate webhook: airtime tx status updated', { reference, newStatus });
      }
      return;
    }

    // Fall back to data
    const [dataTx] = await db.select({ id: dataServices.id, status: dataServices.status })
      .from(dataServices)
      .where(or(eq(dataServices.reference, reference), eq(dataServices.transactionId, reference)))
      .limit(1);

    if (dataTx) {
      if (dataTx.status !== newStatus) {
        await db.update(dataServices).set({ status: newStatus }).where(eq(dataServices.id, dataTx.id));
        logger.info('VTUGate webhook: data tx status updated', { reference, newStatus });
      }
      return;
    }

    logger.warn('VTUGate webhook: no matching transaction found', { reference });
  } catch (error: any) {
    logger.error('VTUGate webhook processing error', { error: error.message, body: req.body });
  }
});

// ─── AirtimeNigeria Delivery Webhook ─────────────────────────────────────────
// AirtimeNigeria calls this URL when airtime/data delivery status changes.
// We always return HTTP 200 quickly to stop retries, then process async.
router.post('/airtimenigeria', async (req: Request, res: Response) => {
  // Respond immediately so AirtimeNigeria doesn't timeout and retry
  res.json({ status: 'ok' });

  try {
    const body = req.body || {};
    logger.info('AirtimeNigeria webhook received', { body });

    // Normalise reference — API uses different field names in different contexts
    const reference: string = (
      body.reference ||
      body.transaction_reference ||
      body.transactionReference ||
      body.data?.reference ||
      body.details?.reference ||
      ''
    ).toString().trim();

    if (!reference) {
      logger.warn('AirtimeNigeria webhook: no reference in payload', { body });
      return;
    }

    // Docs show: delivery_status at top level; data is an ARRAY of recipient objects
    const rawStatus: string = (
      body.delivery_status ||            // top-level delivery_status (primary per docs)
      body.status ||                     // top-level status (fallback)
      (Array.isArray(body.data) ? body.data[0]?.delivery_status : undefined) ||
      (Array.isArray(body.data) ? body.data[0]?.status : undefined) ||
      body.data?.delivery_status ||      // in case data is an object
      body.data?.status ||
      body.details?.status ||
      ''
    ).toString().toLowerCase();

    const isDelivered = AN_DELIVERED_STATUSES.includes(rawStatus);
    logger.info('AirtimeNigeria webhook status', { reference, rawStatus, isDelivered, fullBody: body });

    if (!isDelivered) {
      logger.info('AirtimeNigeria webhook: non-delivered status, no DB update needed', { reference, rawStatus });
      return;
    }

    // Try airtime_services first
    const [airtimeTx] = await db.select({ id: airtimeServices.id, status: airtimeServices.status })
      .from(airtimeServices)
      .where(or(
        eq(airtimeServices.reference, reference),
        eq(airtimeServices.transactionId, reference),
      ))
      .limit(1);

    if (airtimeTx) {
      if (airtimeTx.status !== 'completed') {
        await db.update(airtimeServices)
          .set({ status: 'completed' })
          .where(eq(airtimeServices.id, airtimeTx.id));
        logger.info('AirtimeNigeria webhook: airtime tx → completed', { reference, txId: airtimeTx.id });
      }
      return;
    }

    // Fall back to data_services
    const [dataTx] = await db.select({ id: dataServices.id, status: dataServices.status })
      .from(dataServices)
      .where(or(
        eq(dataServices.reference, reference),
        eq(dataServices.transactionId, reference),
      ))
      .limit(1);

    if (dataTx) {
      if (dataTx.status !== 'completed') {
        await db.update(dataServices)
          .set({ status: 'completed' })
          .where(eq(dataServices.id, dataTx.id));
        logger.info('AirtimeNigeria webhook: data tx → completed', { reference, txId: dataTx.id });
      }
      return;
    }

    logger.warn('AirtimeNigeria webhook: no matching transaction found', { reference });
  } catch (error: any) {
    logger.error('AirtimeNigeria webhook processing error', { error: error.message, body: req.body });
  }
});

// ─── WhatsApp Webhook ─────────────────────────────────────────────────────────
const WHATSAPP_VERIFY_TOKEN = 'techskyarapoint.techboyinformationwhyneedthishelp';

// Meta calls GET to verify the endpoint
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed', { mode, token });
  return res.status(403).json(formatErrorResponse(403, 'Verification failed'));
});

// Meta POSTs incoming messages here
router.post('/whatsapp', (req: Request, res: Response) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    logger.info('WhatsApp webhook event received', { body: JSON.stringify(body) });

    if (body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};

        // Incoming messages
        const messages = value.messages || [];
        for (const message of messages) {
          const from = message.from;
          const msgType = message.type;
          const text = message.text?.body || '';
          logger.info('WhatsApp inbound message', { from, type: msgType, text });
          // TODO: route to agent notification handler or reply logic
        }

        // Status updates (sent/delivered/read/failed)
        const statuses = value.statuses || [];
        for (const status of statuses) {
          logger.info('WhatsApp message status update', {
            messageId: status.id,
            recipientId: status.recipient_id,
            status: status.status,
            timestamp: status.timestamp,
          });
        }
      }
    }
  } catch (error: any) {
    logger.error('WhatsApp webhook processing error', { error: error.message });
  }
});

export default router;
