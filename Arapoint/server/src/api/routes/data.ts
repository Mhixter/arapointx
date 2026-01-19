import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { vtpassService } from '../../services/vtpassService';
import { dataBuySchema } from '../validators/vtu';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { dataServices } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();
router.use(authMiddleware);

const NETWORK_SERVICE_IDS: Record<string, 'mtn-data' | 'airtel-data' | 'glo-data' | '9mobile-sme-data'> = {
  'mtn': 'mtn-data',
  'airtel': 'airtel-data',
  'glo': 'glo-data',
  '9mobile': '9mobile-sme-data',
};

const DATA_PLANS_CACHE: Record<string, any[]> = {};

router.post('/buy', async (req: Request, res: Response) => {
  try {
    const validation = dataBuySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { network, phoneNumber, planId, planName, amount, type } = validation.data;

    if (!vtpassService.isConfigured()) {
      return res.status(503).json(formatErrorResponse(503, 'VTU service is not configured'));
    }

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < amount) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('Data purchase started', { userId: req.userId, network, planId, phone: phoneNumber.substring(0, 4) + '***' });

    const serviceID = NETWORK_SERVICE_IDS[network.toLowerCase()];
    if (!serviceID) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid network provider'));
    }

    const result = await vtpassService.purchaseData(phoneNumber, planId, amount, serviceID);

    if (!result.success || !result.data) {
      logger.warn('Data purchase failed', { userId: req.userId, error: result.error });
      return res.status(400).json(formatErrorResponse(400, result.error || 'Data purchase failed'));
    }

    await walletService.deductBalance(req.userId!, amount, `Data Purchase - ${network.toUpperCase()}`, 'data_purchase');

    await db.insert(dataServices).values({
      userId: req.userId!,
      network: network,
      phoneNumber: phoneNumber,
      planName: planName || planId,
      amount: amount.toString(),
      reference: result.reference,
      status: result.data.status === 'delivered' ? 'completed' : 'pending',
      transactionId: result.data.transactionId,
    });

    logger.info('Data purchase successful', { userId: req.userId, reference: result.reference, transactionId: result.data.transactionId });

    res.json(formatResponse('success', 200, 'Data purchase successful', {
      reference: result.reference,
      transactionId: result.data.transactionId,
      status: result.data.status,
      network: network.toUpperCase(),
      phoneNumber,
      planId,
      amount,
      productName: result.data.productName,
    }));
  } catch (error: any) {
    logger.error('Data purchase error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    if (error.message === 'VTPASS_API_KEY and VTPASS_SECRET_KEY are not configured') {
      return res.status(503).json(formatErrorResponse(503, 'VTU service is not configured'));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process data purchase'));
  }
});

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const { network } = req.query;
    
    if (!vtpassService.isConfigured()) {
      const STATIC_DATA_PLANS = {
        mtn: [
          { variation_code: 'M1024', name: '500MB - 30 Days', variation_amount: '150', fixedPrice: 'Yes' },
          { variation_code: 'M2048', name: '1GB - 30 Days', variation_amount: '250', fixedPrice: 'Yes' },
          { variation_code: 'M3072', name: '2GB - 30 Days', variation_amount: '500', fixedPrice: 'Yes' },
          { variation_code: 'M5120', name: '3GB - 30 Days', variation_amount: '750', fixedPrice: 'Yes' },
          { variation_code: 'M10240', name: '5GB - 30 Days', variation_amount: '1200', fixedPrice: 'Yes' },
        ],
        airtel: [
          { variation_code: 'AIRT500', name: '500MB - 30 Days', variation_amount: '150', fixedPrice: 'Yes' },
          { variation_code: 'AIRT1024', name: '1GB - 30 Days', variation_amount: '250', fixedPrice: 'Yes' },
          { variation_code: 'AIRT2048', name: '2GB - 30 Days', variation_amount: '500', fixedPrice: 'Yes' },
        ],
        glo: [
          { variation_code: 'G500', name: '500MB - 30 Days', variation_amount: '120', fixedPrice: 'Yes' },
          { variation_code: 'G1024', name: '1GB - 30 Days', variation_amount: '230', fixedPrice: 'Yes' },
          { variation_code: 'G2048', name: '2GB - 30 Days', variation_amount: '460', fixedPrice: 'Yes' },
        ],
        '9mobile': [
          { variation_code: '9M500', name: '500MB - 30 Days', variation_amount: '150', fixedPrice: 'Yes' },
          { variation_code: '9M1024', name: '1GB - 30 Days', variation_amount: '250', fixedPrice: 'Yes' },
        ],
      };
      
      if (network && typeof network === 'string') {
        const plans = STATIC_DATA_PLANS[network as keyof typeof STATIC_DATA_PLANS] || [];
        return res.json(formatResponse('success', 200, 'Data plans retrieved', { plans }));
      }
      return res.json(formatResponse('success', 200, 'All data plans retrieved', { plans: STATIC_DATA_PLANS }));
    }

    if (network && typeof network === 'string') {
      const serviceID = NETWORK_SERVICE_IDS[network.toLowerCase()];
      if (!serviceID) {
        return res.status(400).json(formatErrorResponse(400, 'Invalid network provider'));
      }

      if (DATA_PLANS_CACHE[network] && DATA_PLANS_CACHE[network].length > 0) {
        return res.json(formatResponse('success', 200, 'Data plans retrieved (cached)', { 
          plans: DATA_PLANS_CACHE[network],
          network: network.toUpperCase(),
        }));
      }

      const result = await vtpassService.getDataPlans(serviceID);
      if (result.success && result.plans) {
        const plansWithMarkup = result.plans.map((plan: any) => {
          const originalAmount = parseFloat(plan.variation_amount);
          const markupAmount = originalAmount * 1.4; // 40% markup
          return {
            ...plan,
            variation_amount: Math.ceil(markupAmount).toString(),
            original_amount: originalAmount.toString()
          };
        });
        DATA_PLANS_CACHE[network] = plansWithMarkup;
        return res.json(formatResponse('success', 200, 'Data plans retrieved', { 
          plans: plansWithMarkup,
          network: network.toUpperCase(),
        }));
      } else {
        return res.status(500).json(formatErrorResponse(500, result.error || 'Failed to get data plans'));
      }
    }

    const allPlans: Record<string, any[]> = {};
    for (const [net, serviceID] of Object.entries(NETWORK_SERVICE_IDS)) {
      if (DATA_PLANS_CACHE[net]) {
        allPlans[net] = DATA_PLANS_CACHE[net];
      } else {
        const result = await vtpassService.getDataPlans(serviceID);
        if (result.success && result.plans) {
          const plansWithMarkup = result.plans.map((plan: any) => {
            const originalAmount = parseFloat(plan.variation_amount);
            const markupAmount = originalAmount * 1.4; // 40% markup
            return {
              ...plan,
              variation_amount: Math.ceil(markupAmount).toString(),
              original_amount: originalAmount.toString()
            };
          });
          DATA_PLANS_CACHE[net] = plansWithMarkup;
          allPlans[net] = plansWithMarkup;
        }
      }
    }

    res.json(formatResponse('success', 200, 'All data plans retrieved', { plans: allPlans }));
  } catch (error: any) {
    logger.error('Get plans error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get plans'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db.select()
      .from(dataServices)
      .where(eq(dataServices.userId, req.userId!))
      .orderBy(desc(dataServices.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(formatResponse('success', 200, 'Data history retrieved', {
      history,
      pagination: { page, limit },
    }));
  } catch (error: any) {
    logger.error('Data history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

export default router;
