import { Router, Request, Response } from 'express';
import { payvesselService } from '../../services/payvesselService';
import { paymentpointService } from '../../services/paymentpointService';
import { walletService } from '../../services/walletService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';

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
