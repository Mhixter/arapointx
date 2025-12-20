import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { paymentService } from '../../services/paymentService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { walletFundSchema } from '../validators/payment';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';

const router = Router();
router.use(authMiddleware);

router.get('/balance', async (req: Request, res: Response) => {
  try {
    const balance = await walletService.getBalance(req.userId!);
    
    res.json(formatResponse('success', 200, 'Wallet balance retrieved', balance));
  } catch (error: any) {
    logger.error('Wallet balance error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to retrieve wallet balance'));
  }
});

router.post('/fund', async (req: Request, res: Response) => {
  try {
    const validation = walletFundSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { amount, paymentMethod } = validation.data;

    let paymentData;

    if (paymentMethod === 'paystack' || paymentMethod === 'bank_transfer') {
      paymentData = await paymentService.initializePaystack(
        req.userId!,
        amount,
        req.body.email || 'user@arapoint.com'
      );
    } else if (paymentMethod === 'palmpay') {
      paymentData = await paymentService.initializePalmpay(req.userId!, amount);
    } else {
      return res.status(400).json(formatErrorResponse(400, 'Invalid payment method'));
    }

    logger.info('Wallet fund initiated', { userId: req.userId, amount, paymentMethod });

    res.status(202).json(formatResponse('success', 202, 'Payment initiated', {
      amount,
      paymentMethod,
      ...paymentData,
    }));
  } catch (error: any) {
    logger.error('Wallet fund error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to initiate payment'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const history = await walletService.getTransactionHistory(req.userId!, page, limit);
    
    res.json(formatResponse('success', 200, 'Transaction history retrieved', history));
  } catch (error: any) {
    logger.error('Wallet history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to retrieve transaction history'));
  }
});

router.get('/virtual-account', async (req: Request, res: Response) => {
  try {
    const result = await virtualAccountService.getVirtualAccount(req.userId!);
    
    res.json(formatResponse('success', 200, result.message, {
      configured: result.configured,
      account: result.account,
      requiresKyc: result.requiresKyc,
    }));
  } catch (error: any) {
    logger.error('Get virtual account error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to retrieve virtual account'));
  }
});

router.post('/virtual-account/generate', async (req: Request, res: Response) => {
  try {
    const result = await virtualAccountService.generateVirtualAccountForUser(req.userId!);
    
    if (!result.success) {
      return res.status(400).json(formatErrorResponse(400, result.message));
    }

    logger.info('Virtual account generated', { userId: req.userId, accountNumber: result.account?.accountNumber });
    
    res.json(formatResponse('success', 200, result.message, {
      account: result.account,
    }));
  } catch (error: any) {
    logger.error('Generate virtual account error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to generate virtual account'));
  }
});

router.get('/virtual-account/status', async (req: Request, res: Response) => {
  try {
    const configured = virtualAccountService.isConfigured();
    
    res.json(formatResponse('success', 200, 'Virtual account status', {
      gatewayConfigured: configured,
    }));
  } catch (error: any) {
    logger.error('Virtual account status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to check virtual account status'));
  }
});

export default router;
