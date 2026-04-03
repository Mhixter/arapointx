import { Router, Request, Response } from 'express';
import { payvesselService } from '../../services/payvesselService';
import { paymentpointService } from '../../services/paymentpointService';
import { walletService } from '../../services/walletService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { sendEmail } from '../../services/emailService';
import { db } from '../../config/database';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

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

export default router;
