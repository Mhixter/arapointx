import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { vtpassService } from '../../services/vtpassService';
import { pricingService } from '../../services/pricingService';
import { airtimeBuySchema } from '../validators/vtu';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { airtimeServices, a2cRequests, a2cPhoneInventory, a2cAgents, a2cStatusHistory, users } from '../../db/schema';
import { whatsappService } from '../../services/whatsappService';
import { eq, desc, and, sql, asc, gte } from 'drizzle-orm';

const router = Router();
router.use(authMiddleware);

const AIRTIME_PRESETS = [
  { amount: 100, label: '100' },
  { amount: 200, label: '200' },
  { amount: 500, label: '500' },
  { amount: 1000, label: '1,000' },
  { amount: 2000, label: '2,000' },
  { amount: 5000, label: '5,000' },
  { amount: 10000, label: '10,000' },
];

const NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];

const NETWORK_SERVICE_IDS: Record<string, 'mtn' | 'airtel' | 'glo' | 'etisalat'> = {
  'mtn': 'mtn',
  'airtel': 'airtel',
  'glo': 'glo',
  '9mobile': 'etisalat',
};

router.post('/buy', async (req: Request, res: Response) => {
  try {
    const validation = airtimeBuySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { network, phoneNumber, amount, type } = validation.data;

    if (!vtpassService.isConfigured()) {
      return res.status(503).json(formatErrorResponse(503, 'VTU service is not configured'));
    }

    const balance = await walletService.getBalance(req.userId!);
    const userChargedAmount = amount * 0.98; // 2% discount for user (User pays 98% of face value)
    if (balance.balance < userChargedAmount) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('Airtime purchase started', { userId: req.userId, network, amount, phone: phoneNumber.substring(0, 4) + '***' });

    const serviceID = NETWORK_SERVICE_IDS[network.toLowerCase()] || 'mtn';
    const result = await vtpassService.purchaseAirtime(phoneNumber, amount, serviceID);

    if (!result.success || !result.data) {
      logger.warn('Airtime purchase failed', { userId: req.userId, error: result.error });
      return res.status(400).json(formatErrorResponse(400, result.error || 'Airtime purchase failed'));
    }

    await walletService.deductBalance(req.userId!, userChargedAmount, `Airtime Purchase (2% Discount) - ${network.toUpperCase()}`, 'airtime_purchase');

    await db.insert(airtimeServices).values({
      userId: req.userId!,
      network: network,
      phoneNumber: phoneNumber,
      amount: amount.toString(),
      reference: result.reference,
      status: result.data.status === 'delivered' ? 'completed' : 'pending',
      transactionId: result.data.transactionId,
    });

    logger.info('Airtime purchase successful', { userId: req.userId, reference: result.reference, transactionId: result.data.transactionId });

    res.json(formatResponse('success', 200, 'Airtime purchase successful', {
      reference: result.reference,
      transactionId: result.data.transactionId,
      status: result.data.status,
      network: network.toUpperCase(),
      phoneNumber,
      amount,
      productName: result.data.productName,
    }));
  } catch (error: any) {
    logger.error('Airtime purchase error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    if (error.message === 'VTPASS_API_KEY and VTPASS_SECRET_KEY are not configured') {
      return res.status(503).json(formatErrorResponse(503, 'VTU service is not configured'));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process airtime purchase'));
  }
});

router.get('/presets', async (req: Request, res: Response) => {
  try {
    res.json(formatResponse('success', 200, 'Airtime presets retrieved', {
      presets: AIRTIME_PRESETS,
      networks: NETWORKS,
    }));
  } catch (error: any) {
    logger.error('Get presets error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get presets'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db.select()
      .from(airtimeServices)
      .where(eq(airtimeServices.userId, req.userId!))
      .orderBy(desc(airtimeServices.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(formatResponse('success', 200, 'Airtime history retrieved', {
      history,
      pagination: { page, limit },
    }));
  } catch (error: any) {
    logger.error('Airtime history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

const DEFAULT_A2C_RATES: Record<string, number> = {
  'mtn': 80,
  'airtel': 75,
  'glo': 70,
  '9mobile': 70,
};

const generateTrackingId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `A2C${timestamp}${random}`;
};

router.post('/to-cash', async (req: Request, res: Response) => {
  try {
    const { network, amount, phone, bankName, accountNumber, accountName } = req.body;

    if (!network || !amount || !phone) {
      return res.status(400).json(formatErrorResponse(400, 'Network, amount and phone are required'));
    }

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json(formatErrorResponse(400, 'Bank details are required'));
    }

    if (amount < 100) {
      return res.status(400).json(formatErrorResponse(400, 'Minimum amount is ₦100'));
    }

    if (amount > 50000) {
      return res.status(400).json(formatErrorResponse(400, 'Maximum amount is ₦50,000'));
    }

    const rate = await pricingService.getA2CRate(network.toLowerCase()) || DEFAULT_A2C_RATES[network.toLowerCase()] || 70;
    const calculatedCashValue = amount * rate / 100;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availableInventory = await db.select({
      id: a2cPhoneInventory.id,
      phoneNumber: a2cPhoneInventory.phoneNumber,
      network: a2cPhoneInventory.network,
      agentId: a2cPhoneInventory.agentId,
      dailyLimit: a2cPhoneInventory.dailyLimit,
      usedToday: a2cPhoneInventory.usedToday,
    })
      .from(a2cPhoneInventory)
      .where(and(
        eq(a2cPhoneInventory.network, network.toLowerCase()),
        eq(a2cPhoneInventory.isActive, true),
        sql`(${a2cPhoneInventory.dailyLimit} - ${a2cPhoneInventory.usedToday}) >= ${amount}`
      ))
      .orderBy(asc(a2cPhoneInventory.priority), asc(a2cPhoneInventory.usedToday))
      .limit(1);

    if (availableInventory.length === 0) {
      return res.status(503).json(formatErrorResponse(503, 'No receiving numbers available for this network. Please try again later.'));
    }

    const inventoryNumber = availableInventory[0];
    const trackingId = generateTrackingId();

    const [newRequest] = await db.insert(a2cRequests).values({
      userId: req.userId!,
      trackingId,
      network: network.toLowerCase(),
      phoneNumber: phone,
      airtimeAmount: amount.toString(),
      conversionRate: (rate / 100).toString(),
      cashAmount: calculatedCashValue.toString(),
      inventoryId: inventoryNumber.id,
      receivingNumber: inventoryNumber.phoneNumber,
      bankName,
      accountNumber,
      accountName,
      status: 'pending',
      assignedAgentId: inventoryNumber.agentId,
      assignedAt: new Date(),
    }).returning();

    await db.insert(a2cStatusHistory).values({
      requestId: newRequest.id,
      actorType: 'system',
      previousStatus: null,
      newStatus: 'pending',
      note: 'Request created',
    });

    logger.info('Airtime to cash request created', { 
      userId: req.userId, 
      trackingId,
      network, 
      amount, 
      cashValue: calculatedCashValue,
      receivingNumber: inventoryNumber.phoneNumber,
    });

    res.json(formatResponse('success', 200, 'Request created successfully', {
      requestId: newRequest.id,
      trackingId,
      network: network.toUpperCase(),
      amount,
      cashValue: calculatedCashValue,
      rate,
      receivingNumber: inventoryNumber.phoneNumber,
      status: 'pending',
      bankDetails: {
        bankName,
        accountNumber,
        accountName,
      },
      message: `Transfer ₦${amount.toLocaleString()} airtime to ${inventoryNumber.phoneNumber} to complete your request.`,
    }));
  } catch (error: any) {
    logger.error('Airtime to cash error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to submit request'));
  }
});

router.post('/to-cash/:id/confirm-sent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select()
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.id, id),
        eq(a2cRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (request.status !== 'pending') {
      return res.status(400).json(formatErrorResponse(400, 'Request has already been confirmed or processed'));
    }

    await db.update(a2cRequests)
      .set({
        status: 'airtime_sent',
        userConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(a2cRequests.id, id));

    await db.update(a2cPhoneInventory)
      .set({
        usedToday: sql`${a2cPhoneInventory.usedToday} + ${parseFloat(request.airtimeAmount)}`,
        updatedAt: new Date(),
      })
      .where(eq(a2cPhoneInventory.id, request.inventoryId!));

    await db.insert(a2cStatusHistory).values({
      requestId: id,
      actorType: 'user',
      actorId: req.userId,
      previousStatus: 'pending',
      newStatus: 'airtime_sent',
      note: 'User confirmed airtime sent',
    });

    if (request.assignedAgentId) {
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
      whatsappService.notifyAgentOfNewRequest('a2c', request.assignedAgentId, {
        requestId: request.trackingId,
        requestType: 'a2c_request',
        customerName: user?.name || 'Customer',
        amount: parseFloat(request.airtimeAmount),
        description: `Airtime to Cash - ${request.network.toUpperCase()}`,
        userId: req.userId,
      }).catch(err => logger.error('Failed to queue WhatsApp notification', { error: err.message }));
    }

    logger.info('A2C request confirmed by user', { requestId: id, userId: req.userId });

    res.json(formatResponse('success', 200, 'Airtime sent confirmation received', {
      trackingId: request.trackingId,
      status: 'airtime_sent',
      message: 'Your request is being processed. You will receive payment once we confirm the airtime.',
    }));
  } catch (error: any) {
    logger.error('Confirm A2C sent error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to confirm'));
  }
});

router.get('/to-cash/requests', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions: any[] = [eq(a2cRequests.userId, req.userId!)];
    if (status && status !== 'all') {
      whereConditions.push(eq(a2cRequests.status, status as string));
    }

    const requests = await db.select({
      id: a2cRequests.id,
      trackingId: a2cRequests.trackingId,
      network: a2cRequests.network,
      phoneNumber: a2cRequests.phoneNumber,
      airtimeAmount: a2cRequests.airtimeAmount,
      cashAmount: a2cRequests.cashAmount,
      receivingNumber: a2cRequests.receivingNumber,
      bankName: a2cRequests.bankName,
      accountNumber: a2cRequests.accountNumber,
      accountName: a2cRequests.accountName,
      status: a2cRequests.status,
      userConfirmedAt: a2cRequests.userConfirmedAt,
      airtimeReceivedAt: a2cRequests.airtimeReceivedAt,
      cashPaidAt: a2cRequests.cashPaidAt,
      rejectionReason: a2cRequests.rejectionReason,
      createdAt: a2cRequests.createdAt,
    })
      .from(a2cRequests)
      .where(and(...whereConditions))
      .orderBy(desc(a2cRequests.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json(formatResponse('success', 200, 'Requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get A2C requests error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.get('/to-cash/rates', async (req: Request, res: Response) => {
  try {
    const rates = await pricingService.getA2CRates();
    res.json(formatResponse('success', 200, 'Conversion rates', { 
      rates,
      minAmount: 100,
      maxAmount: 50000,
    }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get rates'));
  }
});

export default router;
