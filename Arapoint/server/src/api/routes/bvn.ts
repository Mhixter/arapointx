import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { youverifyService } from '../../services/youverifyService';
import { premblyService } from '../../services/premblyService';
import { generateBVNSlip } from '../../utils/slipGenerator';
import { bvnRetrieveSchema, bvnDigitalCardSchema, bvnModifySchema } from '../validators/bvn';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { bvnServices, users, identityAgents } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateReferenceId } from '../../utils/helpers';
import { whatsappService } from '../../services/whatsappService';

const getConfiguredProviders = (): ('prembly' | 'youverify')[] => {
  const providers: ('prembly' | 'youverify')[] = [];
  if (premblyService.isConfigured()) providers.push('prembly');
  if (youverifyService.isConfigured()) providers.push('youverify');
  if (providers.length === 0) throw new Error('No identity verification provider configured');
  return providers;
};

const isRealValue = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim().toLowerCase();
  return v.length > 0 && v !== 'n/a' && v !== 'unknown' && v !== 'null' && v !== 'undefined' && v !== 'none';
};

const hasValidBVNData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  const hasFirstName = isRealValue(data.firstName) || isRealValue(data.first_name);
  const hasLastName = isRealValue(data.lastName) || isRealValue(data.last_name);
  const hasName = hasFirstName || hasLastName;
  if (!hasName) return false;
  const hasDob = isRealValue(data.dateOfBirth) || isRealValue(data.dob) || isRealValue(data.date_of_birth);
  const hasId = isRealValue(data.id) || isRealValue(data.bvn) || isRealValue(data.BVN);
  return hasDob || hasId;
};

const verifyBVNWithFallback = async (bvn: string, isPremium: boolean) => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting BVN verification', { provider, bvn: bvn.substring(0, 4) + '***' });
      const result = provider === 'prembly'
        ? await premblyService.verifyBVN(bvn, isPremium)
        : await youverifyService.verifyBVN(bvn, isPremium);
      
      if (result.success && result.data && hasValidBVNData(result.data)) {
        return { ...result, provider };
      }
      if (result.success && result.data && !hasValidBVNData(result.data)) {
        lastError = 'No record found for the provided BVN. Please double-check and try again.';
        logger.warn('Provider returned empty BVN data', { provider });
      } else {
        lastError = result.error;
      }
      logger.warn('Provider verification failed, trying next', { provider, error: lastError });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'All verification providers failed', reference: '', provider: providers[0] };
};

const router = Router();
router.use(authMiddleware);

const getServicePrice = async (serviceType: string, defaultPrice: number): Promise<number> => {
  try {
    const { pricingService } = await import('../../services/pricingService');
    return await pricingService.getPrice(serviceType);
  } catch {
    return defaultPrice;
  }
};

router.post('/retrieve', async (req: Request, res: Response) => {
  try {
    const validation = bvnRetrieveSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const isPremium = req.body.premium === true;
    const price = await getServicePrice(isPremium ? 'bvn_retrieval_premium' : 'bvn_retrieval', isPremium ? 200 : 100);
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('BVN retrieval started', { userId: req.userId, bvn: validation.data.bvn.substring(0, 4) + '***', premium: isPremium });

    const result = await verifyBVNWithFallback(validation.data.bvn, isPremium);

    if (!result.success || !result.data) {
      logger.warn('BVN verification failed', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'BVN verification failed'));
    }

    await walletService.deductBalance(req.userId!, price, `BVN Retrieval${isPremium ? ' (Premium)' : ''}`, 'bvn_verification');

    const bvnData = result.data as any;
    const slipType = (req.body.slipType as 'standard' | 'premium') || (isPremium ? 'premium' : 'standard');
    const slip = generateBVNSlip(bvnData, result.reference, slipType);
    const requestId = generateReferenceId();

    await db.insert(bvnServices).values({
      userId: req.userId!,
      bvn: validation.data.bvn,
      phone: validation.data.phone,
      serviceType: 'retrieval',
      requestId,
      status: 'completed',
      responseData: result.data,
    });

    logger.info('BVN retrieval successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'BVN verification successful', {
      reference: result.reference,
      data: {
        firstName: bvnData.firstName,
        middleName: bvnData.middleName,
        lastName: bvnData.lastName,
        dateOfBirth: bvnData.dateOfBirth,
        phone: bvnData.phone,
        email: bvnData.email,
        gender: bvnData.gender,
        enrollmentBranch: bvnData.enrollmentBranch,
        enrollmentInstitution: bvnData.enrollmentInstitution,
        watchListed: bvnData.watchListed,
        photo: bvnData.photo,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      price,
    }));
  } catch (error: any) {
    logger.error('BVN retrieval error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    if (error.message === 'YOUVERIFY_API_KEY is not configured') {
      return res.status(503).json(formatErrorResponse(503, 'BVN verification service is not configured'));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process BVN request'));
  }
});

router.post('/digital-card', async (req: Request, res: Response) => {
  try {
    const validation = bvnDigitalCardSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('bvn_digital_card', 500);
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('BVN digital card started', { userId: req.userId });

    const result = await verifyBVNWithFallback(validation.data.bvn, true);

    if (!result.success || !result.data) {
      logger.warn('BVN digital card failed', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'BVN verification failed'));
    }

    await walletService.deductBalance(req.userId!, price, 'BVN Digital Card', 'bvn_digital_card');

    const bvnData = result.data as any;
    const slipType = (req.body.slipType as 'standard' | 'premium') || 'premium';
    const slip = generateBVNSlip(bvnData, result.reference, slipType);
    const requestId = generateReferenceId();

    await db.insert(bvnServices).values({
      userId: req.userId!,
      bvn: validation.data.bvn,
      serviceType: 'digital_card',
      requestId,
      status: 'completed',
      responseData: result.data,
    });

    logger.info('BVN digital card successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'BVN Digital Card generated', {
      reference: result.reference,
      data: {
        firstName: bvnData.firstName,
        middleName: bvnData.middleName,
        lastName: bvnData.lastName,
        dateOfBirth: bvnData.dateOfBirth,
        phone: bvnData.phone,
        email: bvnData.email,
        gender: bvnData.gender,
        enrollmentBranch: bvnData.enrollmentBranch,
        enrollmentInstitution: bvnData.enrollmentInstitution,
        photo: bvnData.photo,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      price,
    }));
  } catch (error: any) {
    logger.error('BVN digital card error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.post('/modify', async (req: Request, res: Response) => {
  try {
    const validation = bvnModifySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('bvn_modification', 2500);
    const requestId = generateReferenceId();

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, `Insufficient wallet balance. You need ₦${price.toLocaleString()} but have ₦${balance.balance.toLocaleString()}.`));
    }

    await walletService.deductBalance(req.userId!, price, 'BVN Modification Request', 'bvn_modification');

    await db.insert(bvnServices).values({
      userId: req.userId!,
      bvn: validation.data.bvn,
      phone: validation.data.phone,
      serviceType: 'modification',
      requestId,
      status: 'pending',
    });

    const availableAgents = await db.select()
      .from(identityAgents)
      .where(eq(identityAgents.isAvailable, true))
      .limit(1);
    
    if (availableAgents.length > 0) {
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
      whatsappService.notifyAgentOfNewRequest('bvn', availableAgents[0].id, {
        requestId,
        requestType: 'bvn_modification',
        customerName: user?.name || 'Customer',
        amount: price,
        description: 'BVN Modification - Agent Enrollment',
        userId: req.userId,
      }).catch(err => logger.error('Failed to queue WhatsApp notification', { error: err.message }));
    }

    logger.info('BVN modification request', { userId: req.userId, requestId, price });

    res.status(202).json(formatResponse('success', 202, 'BVN modification request submitted. Processing requires affidavit and agent fees.', {
      requestId,
      message: 'Your request will be processed by our identity agents. This service is ONLY for agent-enrolled BVNs (not bank enrollments). Processing typically takes 3-5 business days.',
      estimatedTime: '3-5 business days',
      price,
      amountCharged: price,
    }));
  } catch (error: any) {
    logger.error('BVN modification error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db.select()
      .from(bvnServices)
      .where(eq(bvnServices.userId, req.userId!))
      .orderBy(desc(bvnServices.createdAt))
      .limit(limit)
      .offset(offset);

    const allRecords = await db.select()
      .from(bvnServices)
      .where(eq(bvnServices.userId, req.userId!));

    res.json(formatResponse('success', 200, 'BVN history retrieved', {
      history,
      pagination: { 
        page, 
        limit,
        total: allRecords.length,
        totalPages: Math.ceil(allRecords.length / limit),
      },
    }));
  } catch (error: any) {
    logger.error('BVN history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

router.get('/slip/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [record] = await db.select()
      .from(bvnServices)
      .where(eq(bvnServices.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json(formatErrorResponse(404, 'BVN record not found'));
    }

    if (record.userId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    if (!record.responseData || record.status !== 'completed') {
      return res.status(400).json(formatErrorResponse(400, 'No slip available for this record'));
    }

    const slip = generateBVNSlip(record.responseData as any, `BVN-${record.id}`);

    res.json(formatResponse('success', 200, 'Slip retrieved', {
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
        type: 'bvn',
      },
    }));
  } catch (error: any) {
    logger.error('Get BVN slip error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get slip'));
  }
});

export default router;
