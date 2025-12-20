import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { youverifyService } from '../../services/youverifyService';
import { premblyService } from '../../services/premblyService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { generateNINSlip } from '../../utils/slipGenerator';
import { ninLookupSchema, ninPhoneSchema, lostNinSchema } from '../validators/identity';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { identityVerifications } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const getConfiguredProviders = (): ('prembly' | 'youverify')[] => {
  const providers: ('prembly' | 'youverify')[] = [];
  if (premblyService.isConfigured()) providers.push('prembly');
  if (youverifyService.isConfigured()) providers.push('youverify');
  if (providers.length === 0) throw new Error('No identity verification provider configured');
  return providers;
};

const verifyNINWithFallback = async (nin: string) => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting NIN verification', { provider, nin: nin.substring(0, 4) + '***' });
      const result = provider === 'prembly'
        ? await premblyService.verifyNIN(nin)
        : await youverifyService.verifyNIN(nin);
      
      if (result.success && result.data) {
        return { ...result, provider };
      }
      lastError = result.error;
      logger.warn('Provider verification failed, trying next', { provider, error: result.error });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'All verification providers failed', reference: '', provider: providers[0] };
};

const verifyVNINWithFallback = async (vnin: string, validationData?: { firstName?: string; lastName?: string; dateOfBirth?: string }) => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting vNIN verification', { provider });
      const result = provider === 'prembly'
        ? await premblyService.verifyVNIN(vnin, validationData)
        : await youverifyService.verifyVNIN(vnin, validationData);
      
      if (result.success && result.data) {
        return { ...result, provider };
      }
      lastError = result.error;
      logger.warn('Provider verification failed, trying next', { provider, error: result.error });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'All verification providers failed', reference: '', provider: providers[0] };
};

const verifyNINWithPhoneFallback = async (nin: string, phone: string) => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting NIN-Phone verification', { provider, nin: nin.substring(0, 4) + '***' });
      const result = provider === 'prembly'
        ? await premblyService.verifyNINWithPhone(nin, phone)
        : await youverifyService.verifyNIN(nin, { phoneToValidate: phone });
      
      if (result.success && result.data) {
        return { ...result, provider };
      }
      lastError = result.error;
      logger.warn('Provider verification failed, trying next', { provider, error: result.error });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'All verification providers failed', reference: '', provider: providers[0] };
};

const router = Router();
router.use(authMiddleware);

const SERVICE_PRICES = {
  nin_lookup: 150,
  nin_phone: 200,
  lost_nin: 500,
  vnin: 200,
};

router.post('/nin', async (req: Request, res: Response) => {
  try {
    const validation = ninLookupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = SERVICE_PRICES.nin_lookup;
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('NIN lookup started', { userId: req.userId, nin: validation.data.nin.substring(0, 4) + '***' });

    const result = await verifyNINWithFallback(validation.data.nin);

    if (!result.success || !result.data) {
      logger.warn('NIN verification failed', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'NIN verification failed'));
    }

    await walletService.deductBalance(req.userId!, price, 'NIN Lookup', 'nin_verification');

    const slipType = (req.body.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const ninData = result.data as any;
    const slip = generateNINSlip(ninData, result.reference, slipType);

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'nin',
      nin: validation.data.nin,
      status: 'completed',
      verificationData: result.data,
    });

    // Auto-generate PayVessel virtual account after successful NIN verification
    let virtualAccount = null;
    try {
      const accountResult = await virtualAccountService.generateVirtualAccountForUser(
        req.userId!,
        validation.data.nin
      );
      if (accountResult.success && accountResult.account) {
        virtualAccount = accountResult.account;
        logger.info('Virtual account auto-generated after NIN verification', { 
          userId: req.userId, 
          accountNumber: virtualAccount.accountNumber 
        });
      }
    } catch (error: any) {
      logger.error('Failed to auto-generate virtual account after NIN verification', { 
        userId: req.userId, 
        error: error.message 
      });
    }

    logger.info('NIN lookup successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'NIN verification successful', {
      reference: result.reference,
      data: {
        firstName: ninData.firstName,
        middleName: ninData.middleName,
        lastName: ninData.lastName,
        dateOfBirth: ninData.dateOfBirth,
        gender: ninData.gender,
        phone: ninData.phone,
        email: ninData.email,
        address: ninData.address || ninData.residence_address || '',
        state: ninData.state || ninData.residence_state || '',
        lga: ninData.lga || ninData.residence_lga || '',
        photo: ninData.photo,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      virtualAccount: virtualAccount ? {
        bankName: virtualAccount.bankName,
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        message: 'Your PayVessel virtual account has been automatically generated!'
      } : null,
      price,
    }));
  } catch (error: any) {
    logger.error('NIN lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    if (error.message === 'YOUVERIFY_API_KEY is not configured') {
      return res.status(503).json(formatErrorResponse(503, 'Identity verification service is not configured'));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process NIN request'));
  }
});

router.post('/vnin', async (req: Request, res: Response) => {
  try {
    const { vnin, firstName, lastName, dateOfBirth } = req.body;
    
    if (!vnin || typeof vnin !== 'string' || vnin.length < 10) {
      return res.status(400).json(formatErrorResponse(400, 'Valid vNIN is required'));
    }

    const price = SERVICE_PRICES.vnin;
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('vNIN lookup started', { userId: req.userId });

    const validationData = firstName || lastName || dateOfBirth 
      ? { firstName, lastName, dateOfBirth } 
      : undefined;

    const result = await verifyVNINWithFallback(vnin, validationData);

    if (!result.success || !result.data) {
      logger.warn('vNIN verification failed', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'vNIN verification failed'));
    }

    await walletService.deductBalance(req.userId!, price, 'vNIN Verification', 'vnin_verification');

    const slipType = (req.body.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const ninData = result.data as any;
    const slip = generateNINSlip(ninData, result.reference, slipType);

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'vnin',
      status: 'completed',
      verificationData: result.data,
    });

    logger.info('vNIN lookup successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'vNIN verification successful', {
      reference: result.reference,
      data: {
        firstName: ninData.firstName,
        middleName: ninData.middleName,
        lastName: ninData.lastName,
        dateOfBirth: ninData.dateOfBirth,
        gender: ninData.gender,
        phone: ninData.phone,
        email: ninData.email,
        address: ninData.address || ninData.residence_address || '',
        state: ninData.state || ninData.residence_state || '',
        lga: ninData.lga || ninData.residence_lga || '',
        photo: ninData.photo,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      price,
    }));
  } catch (error: any) {
    logger.error('vNIN lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process vNIN request'));
  }
});

router.post('/nin-phone', async (req: Request, res: Response) => {
  try {
    const validation = ninPhoneSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = SERVICE_PRICES.nin_phone;
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('NIN-Phone verification started', { userId: req.userId });

    const result = await verifyNINWithPhoneFallback(validation.data.nin, validation.data.phone);

    if (!result.success || !result.data) {
      logger.warn('NIN-Phone verification failed', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'NIN verification failed'));
    }

    const ninData = result.data as any;
    const phoneMatch = ninData.phone === validation.data.phone || 
                       ninData.phone?.replace(/\D/g, '').includes(validation.data.phone.replace(/\D/g, ''));

    await walletService.deductBalance(req.userId!, price, 'NIN + Phone Verification', 'nin_phone_verification');

    const slipType = (req.body.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const slip = generateNINSlip(ninData, result.reference, slipType);

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'nin_phone',
      nin: validation.data.nin,
      phone: validation.data.phone,
      status: 'completed',
      verificationData: { ...result.data, phoneMatch },
    });

    logger.info('NIN-Phone verification successful', { userId: req.userId, reference: result.reference, phoneMatch });

    res.json(formatResponse('success', 200, 'NIN-Phone verification successful', {
      reference: result.reference,
      phoneMatch,
      data: {
        firstName: ninData.firstName,
        middleName: ninData.middleName,
        lastName: ninData.lastName,
        dateOfBirth: ninData.dateOfBirth,
        gender: ninData.gender,
        phone: ninData.phone,
        registeredPhone: ninData.phone,
        providedPhone: validation.data.phone,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      price,
    }));
  } catch (error: any) {
    logger.error('NIN-Phone verification error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.post('/lost-nin', async (req: Request, res: Response) => {
  try {
    const validation = lostNinSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = SERVICE_PRICES.lost_nin;

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'lost_nin',
      phone: validation.data.phone,
      secondEnrollmentId: validation.data.enrollmentId,
      status: 'pending',
    });

    logger.info('Lost NIN recovery request', { userId: req.userId });

    res.status(202).json(formatResponse('success', 202, 'Lost NIN recovery request submitted. This service requires manual processing and may take 24-48 hours.', {
      message: 'Our team will process your request and contact you via the provided phone number.',
      estimatedTime: '24-48 hours',
      price,
    }));
  } catch (error: any) {
    logger.error('Lost NIN recovery error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db.select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, req.userId!))
      .orderBy(desc(identityVerifications.createdAt))
      .limit(limit)
      .offset(offset);

    const allRecords = await db.select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, req.userId!));

    res.json(formatResponse('success', 200, 'Identity verification history retrieved', {
      history,
      pagination: { 
        page, 
        limit,
        total: allRecords.length,
        totalPages: Math.ceil(allRecords.length / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Identity history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

router.get('/slip/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [record] = await db.select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json(formatErrorResponse(404, 'Verification record not found'));
    }

    if (record.userId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    if (!record.verificationData || record.status !== 'completed') {
      return res.status(400).json(formatErrorResponse(400, 'No slip available for this verification'));
    }

    const slipType = (req.query.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const slip = generateNINSlip(record.verificationData as any, `NIN-${record.id}`, slipType);

    res.json(formatResponse('success', 200, 'Slip retrieved', {
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
        type: record.verificationType,
      },
    }));
  } catch (error: any) {
    logger.error('Get slip error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get slip'));
  }
});

router.get('/sample-slip/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const validTypes = ['information', 'regular', 'standard', 'premium'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid slip type'));
    }

    const sampleData = {
      nin: '12345678901',
      firstName: 'JOHN',
      lastName: 'DOE',
      middleName: 'SAMPLE',
      dateOfBirth: '1990-01-15',
      gender: 'Male',
      phone: '08012345678',
      email: 'sample@example.com',
      stateOfOrigin: 'Lagos',
      lgaOfOrigin: 'Ikeja',
      residentialAddress: '123 Sample Street, Victoria Island',
      residentialState: 'Lagos',
      residentialLga: 'Eti-Osa',
      maritalStatus: 'Single',
      educationLevel: 'BSc',
      nationality: 'Nigerian',
      photo: '',
      signature: '',
      trackingId: 'TRK-SAMPLE-001',
      centralId: 'CID-SAMPLE-001',
      birthCountry: 'Nigeria',
      birthState: 'Lagos',
      birthLga: 'Lagos Island',
      employmentStatus: 'Employed',
      profession: 'Software Engineer',
      nokFirstName: 'JANE',
      nokLastName: 'DOE',
      nokPhone: '08098765432',
      nokAddress: '456 Sample Avenue, Lekki',
    };

    const slip = generateNINSlip(sampleData as any, `SAMPLE-${type.toUpperCase()}`, type as any);

    res.setHeader('Content-Type', 'text/html');
    res.send(slip.html);
  } catch (error: any) {
    logger.error('Get sample slip error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get sample slip'));
  }
});

export default router;
