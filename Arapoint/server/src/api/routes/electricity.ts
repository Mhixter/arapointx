import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { walletService } from '../../services/walletService';
import { vtpassService } from '../../services/vtpassService';
import { vtuGateService } from '../../services/vtuGateService';
import { electricityBuySchema, electricityValidateSchema } from '../validators/vtu';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { electricityServices, adminSettings } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();
router.use(authMiddleware);
router.use(idempotencyMiddleware);

async function getActiveElectricityProvider(): Promise<'vtpass' | 'vtugate'> {
  try {
    const [row] = await db.select({ settingValue: adminSettings.settingValue })
      .from(adminSettings).where(eq(adminSettings.settingKey, 'active_vtu_electricity')).limit(1);
    const val = row?.settingValue?.toLowerCase();
    if (val === 'vtugate' && await vtuGateService.isConfiguredAsync()) return 'vtugate';
  } catch { /* fall through */ }
  return 'vtpass';
}

// VTUGate uses shorter disco names
const VTPASS_TO_VTUGATE_DISCO: Record<string, string> = {
  'ikeja-electric': 'ikeja', 'eko-electric': 'eko', 'abuja-electric': 'abuja',
  'kano-electric': 'kano', 'portharcourt-electric': 'portharcourt', 'jos-electric': 'jos',
  'ibadan-electric': 'ibadan', 'kaduna-electric': 'kaduna', 'enugu-electric': 'enugu',
  'benin-electric': 'benin', 'yola-electric': 'yola',
};

const DISCO_PROVIDERS = [
  { id: 'ikeja-electric', name: 'Ikeja Electricity Distribution Company', shortName: 'IKEDC' },
  { id: 'eko-electric', name: 'Eko Electricity Distribution Company', shortName: 'EKEDC' },
  { id: 'abuja-electric', name: 'Abuja Electricity Distribution Company', shortName: 'AEDC' },
  { id: 'kano-electric', name: 'Kano Electricity Distribution Company', shortName: 'KEDCO' },
  { id: 'portharcourt-electric', name: 'Port Harcourt Electricity Distribution Company', shortName: 'PHEDC' },
  { id: 'jos-electric', name: 'Jos Electricity Distribution Company', shortName: 'JEDC' },
  { id: 'ibadan-electric', name: 'Ibadan Electricity Distribution Company', shortName: 'IBEDC' },
  { id: 'kaduna-electric', name: 'Kaduna Electricity Distribution Company', shortName: 'KAEDCO' },
  { id: 'enugu-electric', name: 'Enugu Electricity Distribution Company', shortName: 'EEDC' },
  { id: 'benin-electric', name: 'Benin Electricity Distribution Company', shortName: 'BEDC' },
  { id: 'yola-electric', name: 'Yola Electricity Distribution Company', shortName: 'YEDC' },
];

const DISCO_MAP: Record<string, string> = {
  'ekedc': 'eko-electric',
  'ikedc': 'ikeja-electric',
  'ibedc': 'ibadan-electric',
  'aedc': 'abuja-electric',
  'phedc': 'portharcourt-electric',
  'kedco': 'kano-electric',
  'kaedco': 'kaduna-electric',
  'jedc': 'jos-electric',
  'bedc': 'benin-electric',
  'eedc': 'enugu-electric',
  'yedc': 'yola-electric',
};

router.post('/buy', async (req: Request, res: Response) => {
  try {
    const validation = electricityBuySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { discoName, meterNumber, amount, meterType = 'prepaid', phone } = validation.data;

    const activeProvider = await getActiveElectricityProvider();

    if (activeProvider === 'vtpass' && !vtpassService.isConfigured()) {
      return res.status(503).json(formatErrorResponse(503, 'Electricity service is not configured'));
    }

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < amount) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const serviceID = DISCO_MAP[discoName.toLowerCase()] || discoName;
    const phoneNumber = phone || '08000000000';

    logger.info('Electricity purchase started', { userId: req.userId, provider: activeProvider, serviceID, meterNumber: meterNumber.substring(0, 4) + '***', amount });

    // ATOMIC SAFETY: deduct wallet BEFORE calling provider so a crash after delivery
    // cannot give service for free. Refund immediately on any failure.
    await walletService.deductBalance(req.userId!, amount, `Electricity - ${discoName.toUpperCase()}`, 'electricity_purchase');

    let result: { success: boolean; reference?: string; token?: string; data?: any; error?: string };

    if (activeProvider === 'vtugate') {
      const vtgDisco = VTPASS_TO_VTUGATE_DISCO[serviceID] || serviceID.replace('-electric', '');
      result = await vtuGateService.purchaseElectricity({
        disco: vtgDisco,
        meterNumber,
        meterType: meterType as 'prepaid' | 'postpaid',
        amount,
        phone: phoneNumber,
      });
    } else {
      result = await vtpassService.purchaseElectricity(
        meterNumber,
        amount,
        serviceID,
        meterType as 'prepaid' | 'postpaid',
        phoneNumber
      );
    }

    if (!result.success || !result.data) {
      logger.warn('Electricity purchase failed — refunding wallet', { userId: req.userId, provider: activeProvider, error: result.error });
      await walletService.addBalance(req.userId!, amount, `Refund: Failed Electricity Purchase - ${discoName.toUpperCase()}`, 'electricity_refund').catch(
        refundErr => logger.error('CRITICAL: Electricity refund failed', { userId: req.userId, amount, error: refundErr.message })
      );
      return res.status(400).json(formatErrorResponse(400, result.error || 'Electricity purchase failed'));
    }

    await db.insert(electricityServices).values({
      userId: req.userId!,
      discoName: discoName,
      meterNumber: meterNumber,
      amount: amount.toString(),
      reference: result.reference,
      status: result.data.status === 'delivered' ? 'completed' : 'pending',
      transactionId: result.data.transactionId,
      provider: activeProvider,
    });

    logger.info('Electricity purchase successful', { userId: req.userId, provider: activeProvider, reference: result.reference });

    res.json(formatResponse('success', 200, 'Electricity purchase successful', {
      reference: result.reference,
      transactionId: result.data.transactionId,
      status: result.data.status,
      disco: discoName.toUpperCase(),
      meterNumber,
      amount,
      token: result.token || result.data.token,
      units: result.data.units,
      customerName: result.data.customerName,
      productName: result.data.productName,
      provider: activeProvider,
    }));
  } catch (error: any) {
    logger.error('Electricity purchase error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to process electricity purchase'));
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const validation = electricityValidateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { discoName, meterNumber, meterType } = validation.data;

    const activeProvider = await getActiveElectricityProvider();
    const serviceID = DISCO_MAP[discoName.toLowerCase()] || discoName;

    logger.info('Meter validation request', { userId: req.userId, provider: activeProvider, serviceID, meterNumber: meterNumber.substring(0, 4) + '***' });

    let result: { success: boolean; data?: any; customerName?: string; address?: string; error?: string };

    if (activeProvider === 'vtugate') {
      const vtgDisco = VTPASS_TO_VTUGATE_DISCO[serviceID] || serviceID.replace('-electric', '');
      result = await vtuGateService.verifyElectricity({
        disco: vtgDisco,
        meterNumber,
        meterType: meterType as 'prepaid' | 'postpaid',
      });
    } else {
      if (!vtpassService.isConfigured()) {
        return res.status(503).json(formatErrorResponse(503, 'Electricity service is not configured'));
      }
      result = await vtpassService.verifyMeter(meterNumber, serviceID, meterType as 'prepaid' | 'postpaid');
    }

    if (!result.success || !result.data) {
      return res.status(400).json(formatErrorResponse(400, result.error || 'Meter validation failed'));
    }

    res.json(formatResponse('success', 200, 'Meter validated successfully', {
      meterNumber: result.data.meterNumber || meterNumber,
      customerName: result.customerName || result.data.customerName,
      address: result.address || result.data.address,
      meterType: result.data.meterType || meterType,
      disco: discoName,
      canVend: result.data.canVend ?? true,
    }));
  } catch (error: any) {
    logger.error('Meter validation error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to validate meter'));
  }
});

router.get('/providers', async (req: Request, res: Response) => {
  try {
    res.json(formatResponse('success', 200, 'Electricity providers retrieved', {
      providers: DISCO_PROVIDERS,
    }));
  } catch (error: any) {
    logger.error('Get providers error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get providers'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db.select()
      .from(electricityServices)
      .where(eq(electricityServices.userId, req.userId!))
      .orderBy(desc(electricityServices.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(formatResponse('success', 200, 'Electricity history retrieved', {
      history,
      pagination: { page, limit },
    }));
  } catch (error: any) {
    logger.error('Electricity history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

export default router;
