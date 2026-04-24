import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { walletService } from '../../services/walletService';
import { vtpassService } from '../../services/vtpassService';
import { airtimeNigeriaService } from '../../services/airtimeNigeriaService';
import { vtuGateService } from '../../services/vtuGateService';
import { dataBuySchema } from '../validators/vtu';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { dataServices, scrapedDataPlans, adminSettings } from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';

async function getActiveDataProvider(): Promise<'airtimenigeria' | 'vtugate' | 'vtpass' | null> {
  try {
    const rows = await db.select({ settingKey: adminSettings.settingKey, settingValue: adminSettings.settingValue })
      .from(adminSettings)
      .where(
        eq(adminSettings.settingKey, 'active_vtu_data')
      );
    // Also fetch enabled flags
    const allSettings = await db.select({ settingKey: adminSettings.settingKey, settingValue: adminSettings.settingValue })
      .from(adminSettings);
    const settingsMap: Record<string, string> = {};
    for (const r of allSettings) settingsMap[r.settingKey] = r.settingValue || '';

    const activeProvider = settingsMap['active_vtu_data'] || '';

    // Check if the active provider is explicitly enabled (on/off toggle)
    const airtimeEnabled = settingsMap['vtu_airtimenigeria_enabled'] !== 'false';
    const vtugateEnabled = settingsMap['vtu_vtugate_enabled'] !== 'false';
    const vtpassEnabled = settingsMap['vtu_vtpass_enabled'] !== 'false';

    if (activeProvider === 'vtugate') {
      if (!vtugateEnabled) return null; // off
      if (await vtuGateService.isConfiguredAsync()) return 'vtugate';
    }
    if (activeProvider === 'airtimenigeria') {
      if (!airtimeEnabled) return null; // off
      if (await airtimeNigeriaService.isConfiguredAsync()) return 'airtimenigeria';
    }
    if (activeProvider === 'vtpass') {
      if (!vtpassEnabled) return null; // off
      if (vtpassService.isConfigured()) return 'vtpass';
    }

    // Fallback to first available enabled provider
    if (airtimeEnabled && await airtimeNigeriaService.isConfiguredAsync()) return 'airtimenigeria';
    if (vtugateEnabled && await vtuGateService.isConfiguredAsync()) return 'vtugate';
    if (vtpassEnabled && vtpassService.isConfigured()) return 'vtpass';
  } catch { /* fall through */ }
  return null;
}

const router = Router();
router.use(authMiddleware);
router.use(idempotencyMiddleware);

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

    const { network, phoneNumber, planId, planName, amount } = validation.data;

    const activeProvider = await getActiveDataProvider();
    const useAirtimeNigeria = activeProvider === 'airtimenigeria';
    const useVtuGate = activeProvider === 'vtugate';

    if (!useAirtimeNigeria && !useVtuGate && !vtpassService.isConfigured()) {
      return res.status(503).json(formatErrorResponse(503, 'Data service is not configured. Please contact support.'));
    }

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < amount) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('Data purchase started', { userId: req.userId, network, planId, provider: activeProvider, phone: phoneNumber.substring(0, 4) + '***' });

    const serviceID = NETWORK_SERVICE_IDS[network.toLowerCase()];
    if (!serviceID && !useAirtimeNigeria && !useVtuGate) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid network provider'));
    }

    // Deduct wallet BEFORE calling provider — refund immediately on any failure
    const deduction = await walletService.deductBalance(req.userId!, amount, `Data Purchase - ${network.toUpperCase()}`, 'data_purchase');

    let result: { success: boolean; reference?: string; data?: any; error?: string };

    if (useAirtimeNigeria) {
      const baseUrl = process.env.WEBHOOK_BASE_URL ||
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://arapoint.com.ng');
      result = await airtimeNigeriaService.purchaseData({
        phone: phoneNumber,
        packageCode: planId,
        maxAmount: Math.ceil(amount * 1.05),
        callbackUrl: `${baseUrl}/api/webhooks/airtimenigeria`,
      });
    } else if (useVtuGate) {
      result = await vtuGateService.purchaseData({ network, phone: phoneNumber, planId, amount });
    } else {
      const vtResult = await vtpassService.purchaseData(phoneNumber, planId, amount, serviceID!);
      result = vtResult;
    }

    if (!result.success) {
      logger.warn('Data purchase failed — refunding wallet', { userId: req.userId, error: result.error });
      await walletService.refundBalance(req.userId!, amount, deduction.reference).catch(
        refundErr => logger.error('CRITICAL: Data refund failed', { userId: req.userId, amount, error: refundErr.message })
      );
      // Provider "Insufficient Funds" = Arapoint vendor account low — don't expose internal detail
      const isProviderFundsError = (result.error || '').toLowerCase().includes('insufficient funds') ||
        (result.error || '').toLowerCase().includes('insufficient fund');
      const userMessage = isProviderFundsError
        ? 'Data service is temporarily unavailable. Your wallet has been refunded. Please try again later.'
        : result.error || 'Data purchase failed';
      return res.status(400).json(formatErrorResponse(400, userMessage));
    }

    const deliveredStatuses = ['delivered', 'success', 'completed', 'successful', 'processed'];
    const txStatus = deliveredStatuses.includes((result.data?.status || '').toLowerCase()) ? 'completed' : 'pending';

    await db.insert(dataServices).values({
      userId: req.userId!,
      network,
      phoneNumber,
      planName: planName || planId,
      amount: amount.toString(),
      reference: result.reference,
      status: txStatus,
      transactionId: result.data?.transactionId || result.reference,
      provider: activeProvider,
    });

    logger.info('Data purchase successful', { userId: req.userId, reference: result.reference, provider: activeProvider });

    res.json(formatResponse('success', 200, 'Data purchase successful', {
      reference: result.reference,
      transactionId: result.data?.transactionId || result.reference,
      status: txStatus,
      network: network.toUpperCase(),
      phoneNumber,
      planId,
      amount,
      productName: result.data?.productName,
    }));
  } catch (error: any) {
    logger.error('Data purchase error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to process data purchase'));
  }
});

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const { network } = req.query;

    // Determine active provider — if null, data service is off
    const activeProvider = await getActiveDataProvider();
    if (!activeProvider) {
      return res.json(formatResponse('success', 200, 'Data service is currently unavailable', { plans: network ? [] : {} }));
    }

    if (network && typeof network === 'string') {
      const scrapedPlans = await db.select()
        .from(scrapedDataPlans)
        .where(and(
          eq(scrapedDataPlans.network, network.toLowerCase()),
          eq(scrapedDataPlans.isActive, true),
          eq(scrapedDataPlans.provider, activeProvider)
        ))
        .orderBy(scrapedDataPlans.planName);

      if (scrapedPlans && scrapedPlans.length > 0) {
        const plans = scrapedPlans.map(p => ({
          variation_code: p.planId,
          name: p.planName,
          variation_amount: p.sellingPrice,
          original_amount: p.costPrice,
          fixedPrice: 'Yes',
        }));
        return res.json(formatResponse('success', 200, 'Data plans retrieved', { plans, network: network.toUpperCase() }));
      }
    } else if (!network) {
      const allScraped = await db.select()
        .from(scrapedDataPlans)
        .where(and(eq(scrapedDataPlans.isActive, true), eq(scrapedDataPlans.provider, activeProvider)))
        .orderBy(scrapedDataPlans.network, scrapedDataPlans.planName);
      if (allScraped && allScraped.length > 0) {
        const plans: Record<string, any[]> = {};
        allScraped.forEach(p => {
          if (!plans[p.network]) plans[p.network] = [];
          plans[p.network].push({
            variation_code: p.planId,
            name: p.planName,
            variation_amount: p.sellingPrice,
            original_amount: p.costPrice,
            fixedPrice: 'Yes',
          });
        });
        return res.json(formatResponse('success', 200, 'All data plans retrieved', { plans }));
      }
    }

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
