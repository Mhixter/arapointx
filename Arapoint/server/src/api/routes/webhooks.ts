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

async function sendWalletCreditEmail(userId: string, amount: number, newBalance: number, reference: string, provider: string) {
  try {
    const [user] = await db.select({ email: users.email, name: users.name })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.email) return;

    const amountFormatted = `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const balanceFormatted = `₦${newBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const date = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
    const firstName = user.name?.split(' ')[0] || 'User';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:30px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#16a34a;padding:28px 32px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Arapoint</div>
          <div style="color:#bbf7d0;font-size:13px;margin-top:4px;">Nigerian Identity & Services Platform</div>
        </td></tr>
        <!-- Credit badge -->
        <tr><td style="padding:28px 32px 0;text-align:center;">
          <div style="display:inline-block;background:#dcfce7;border-radius:50px;padding:8px 20px;">
            <span style="color:#16a34a;font-weight:700;font-size:15px;">✓ &nbsp;Wallet Funded Successfully</span>
          </div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:20px 32px 28px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">Your Arapoint wallet has been credited. Here are the details:</p>

          <!-- Amount highlight -->
          <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Amount Credited</p>
            <p style="margin:0;font-size:36px;font-weight:900;color:#16a34a;">${amountFormatted}</p>
          </div>

          <!-- Transaction details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:45%;">New Wallet Balance</td>
              <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${balanceFormatted}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Transaction Reference</td>
              <td style="padding:10px 16px;font-size:12px;color:#111827;font-weight:500;font-family:monospace;border-top:1px solid #e5e7eb;">${reference}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Payment Method</td>
              <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-top:1px solid #e5e7eb;">${provider}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Date & Time</td>
              <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #e5e7eb;">${date}</td>
            </tr>
          </table>

          <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
            You can now use your wallet balance to pay for NIN verification, JAMB services, airtime, data, and more on Arapoint.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">If you did not initiate this transaction, please contact us at <a href="mailto:support@arapoint.com.ng" style="color:#16a34a;">support@arapoint.com.ng</a></p>
          <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">© ${new Date().getFullYear()} Arapoint · Nigerian Identity & Services Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmail(user.email, `Wallet Funded: ${amountFormatted} credited to your Arapoint wallet`, html);
  } catch (err: any) {
    logger.warn('Failed to send wallet credit email', { userId, error: err.message });
  }
}

const router = Router();

router.post('/paymentpoint', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paymentpoint-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      logger.warn('PaymentPoint webhook received without signature');
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

    if (webhookData.status !== 'successful' && webhookData.status !== 'completed' && webhookData.status !== 'success') {
      logger.info('PaymentPoint webhook received with non-successful status', {
        status: webhookData.status,
        reference: webhookData.transactionReference,
      });
      return res.json(formatResponse('success', 200, 'Webhook received but transaction not processed'));
    }

    const userId = await virtualAccountService.findUserByAccountNumber(
      webhookData.destinationAccountNumber
    );

    if (!userId) {
      logger.warn('PaymentPoint webhook: Account number not found', {
        accountNumber: webhookData.destinationAccountNumber,
      });
      return res.status(404).json(formatErrorResponse(404, 'Account not found'));
    }

    const fundResult = await walletService.addBalance(
      userId,
      webhookData.amount,
      webhookData.transactionReference,
      'paymentpoint_transfer'
    );

    sendWalletCreditEmail(userId, webhookData.amount, fundResult.newBalance, webhookData.transactionReference, 'Bank Transfer (9PSB)').catch(() => {});

    logger.info('PaymentPoint webhook processed successfully', {
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
