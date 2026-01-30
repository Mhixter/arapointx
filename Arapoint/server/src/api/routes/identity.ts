import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { youverifyService } from '../../services/youverifyService';
import { premblyService } from '../../services/premblyService';
import { techhubService } from '../../services/techhubService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { generateNINSlip } from '../../utils/slipGenerator';
import { generatePdfSlip, SlipData } from '../../services/pdfSlipGenerator';
import { ninLookupSchema, ninPhoneSchema, lostNinSchema } from '../validators/identity';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse, generateReferenceId } from '../../utils/helpers';
import { db } from '../../config/database';
import { identityVerifications, identityServiceRequests, servicePricing } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const getConfiguredProviders = (): ('techhub' | 'prembly' | 'youverify')[] => {
  const providers: ('techhub' | 'prembly' | 'youverify')[] = [];
  if (premblyService.isConfigured()) providers.push('prembly');
  if (techhubService.isConfigured()) providers.push('techhub');
  if (youverifyService.isConfigured()) providers.push('youverify');
  if (providers.length === 0) throw new Error('No identity verification provider configured');
  return providers;
};

const verifyNINWithFallback = async (nin: string) => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  let techhubSlipHtml: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting NIN verification', { provider, nin: nin.substring(0, 4) + '***' });
      let result;
      
      if (provider === 'techhub') {
        result = await techhubService.verifyNIN(nin);
        if (result.slipHtml) {
          techhubSlipHtml = result.slipHtml;
        }
      } else if (provider === 'prembly') {
        result = await premblyService.verifyNIN(nin);
      } else {
        result = await youverifyService.verifyNIN(nin);
      }
      
      if (result.success && result.data) {
        return { ...result, provider, techhubSlipHtml };
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
      let result;
      
      if (provider === 'techhub') {
        result = await techhubService.verifyVNIN(vnin, validationData);
      } else if (provider === 'prembly') {
        result = await premblyService.verifyVNIN(vnin, validationData);
      } else {
        result = await youverifyService.verifyVNIN(vnin, validationData);
      }
      
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
      let result;
      
      if (provider === 'techhub') {
        result = await techhubService.verifyNINWithPhone(nin, phone);
      } else if (provider === 'prembly') {
        result = await premblyService.verifyNINWithPhone(nin, phone);
      } else {
        result = await youverifyService.verifyNIN(nin, { phoneToValidate: phone });
      }
      
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

router.get('/template-image', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const type = (req.query.type as string) || 'premium';
    
    let templatePath = path.join(process.cwd(), 'server/src/templates/premium_slip_template.jpg');
    let contentType = 'image/jpeg';
    
    if (type === 'standard') {
      templatePath = path.join(process.cwd(), 'server/src/templates/standard_slip_template.jpg');
    } else if (type === 'regular') {
      templatePath = path.join(process.cwd(), 'server/src/templates/regular_slip_template.jpg');
    }
    
    logger.info('Serving template image', { templatePath, exists: fs.existsSync(templatePath) });
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template image not found', path: templatePath });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(templatePath).pipe(res);
  } catch (error: any) {
    logger.error('Error serving template image', { error: error.message });
    res.status(500).json({ error: 'Failed to serve template', details: error.message });
  }
});

// Slip Position Analyzer - public endpoint for calibration
router.get('/slip-analyzer', async (req: Request, res: Response) => {
  try {
    const slipType = (req.query.type as string) || 'premium';
    
    const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slip Position Analyzer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #333; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: white; margin-bottom: 20px; text-align: center; }
    .controls { background: #444; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white; }
    .controls h3 { margin-bottom: 10px; }
    .control-group { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px; }
    .control-item { display: flex; flex-direction: column; }
    .control-item label { font-size: 12px; margin-bottom: 3px; }
    .control-item input { width: 80px; padding: 5px; }
    .slip-wrapper { position: relative; width: 100%; background: white; margin-bottom: 20px; }
    .template-bg { width: 100%; height: auto; display: block; }
    .overlay-marker { position: absolute; border: 2px dashed red; background: rgba(255,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 10px; color: red; font-weight: bold; }
    .position-info { background: #222; color: #0f0; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; }
    .update-btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Slip Position Analyzer - ${slipType.toUpperCase()}</h1>
    
    <div class="controls">
      <h3>Adjust Positions</h3>
      <div class="control-group">
        <div class="control-item"><label>Photo Top %</label><input type="number" id="photo-top" value="26" step="0.5"></div>
        <div class="control-item"><label>Photo Left %</label><input type="number" id="photo-left" value="7" step="0.5"></div>
        <div class="control-item"><label>Photo Width %</label><input type="number" id="photo-width" value="15" step="0.5"></div>
        <div class="control-item"><label>Photo Height %</label><input type="number" id="photo-height" value="17" step="0.5"></div>
      </div>
      <div class="control-group">
        <div class="control-item"><label>Surname Top %</label><input type="number" id="surname-top" value="27" step="0.5"></div>
        <div class="control-item"><label>Surname Left %</label><input type="number" id="surname-left" value="27" step="0.5"></div>
        <div class="control-item"><label>Given Names Top %</label><input type="number" id="given-top" value="32" step="0.5"></div>
        <div class="control-item"><label>Given Names Left %</label><input type="number" id="given-left" value="27" step="0.5"></div>
      </div>
      <div class="control-group">
        <div class="control-item"><label>DOB Top %</label><input type="number" id="dob-top" value="38" step="0.5"></div>
        <div class="control-item"><label>DOB Left %</label><input type="number" id="dob-left" value="27" step="0.5"></div>
        <div class="control-item"><label>Sex Top %</label><input type="number" id="sex-top" value="38" step="0.5"></div>
        <div class="control-item"><label>Sex Left %</label><input type="number" id="sex-left" value="42" step="0.5"></div>
      </div>
      <div class="control-group">
        <div class="control-item"><label>NIN Top %</label><input type="number" id="nin-top" value="45" step="0.5"></div>
        <div class="control-item"><label>QR Top %</label><input type="number" id="qr-top" value="25" step="0.5"></div>
        <div class="control-item"><label>QR Right %</label><input type="number" id="qr-right" value="18" step="0.5"></div>
        <div class="control-item"><label>Issue Date Top %</label><input type="number" id="issue-top" value="40" step="0.5"></div>
      </div>
      <button class="update-btn" onclick="updatePositions()">Update Positions</button>
    </div>
    
    <div class="slip-wrapper">
      <img src="/api/identity/template-image?type=${slipType}" alt="Template" class="template-bg" id="template-img">
      <div class="overlay-marker" id="photo-marker" style="top:26%;left:7%;width:15%;height:17%;">PHOTO</div>
      <div class="overlay-marker" id="surname-marker" style="top:27%;left:27%;width:25%;height:4%;">SURNAME</div>
      <div class="overlay-marker" id="given-marker" style="top:32%;left:27%;width:30%;height:4%;">GIVEN NAMES</div>
      <div class="overlay-marker" id="dob-marker" style="top:38%;left:27%;width:12%;height:3%;">DOB</div>
      <div class="overlay-marker" id="sex-marker" style="top:38%;left:42%;width:5%;height:3%;">SEX</div>
      <div class="overlay-marker" id="nin-marker" style="top:45%;left:30%;width:40%;height:5%;">NIN NUMBER</div>
      <div class="overlay-marker" id="qr-marker" style="top:25%;right:18%;width:12%;height:14%;">QR CODE</div>
      <div class="overlay-marker" id="issue-marker" style="top:40%;right:6%;width:10%;height:4%;">ISSUE DATE</div>
    </div>
    
    <div class="position-info" id="position-output">
Adjust the inputs above and click "Update Positions" to see changes.
Copy these values to update slipGenerator.ts
    </div>
  </div>
  
  <script>
    function updatePositions() {
      document.getElementById('photo-marker').style.top = document.getElementById('photo-top').value + '%';
      document.getElementById('photo-marker').style.left = document.getElementById('photo-left').value + '%';
      document.getElementById('photo-marker').style.width = document.getElementById('photo-width').value + '%';
      document.getElementById('photo-marker').style.height = document.getElementById('photo-height').value + '%';
      document.getElementById('surname-marker').style.top = document.getElementById('surname-top').value + '%';
      document.getElementById('surname-marker').style.left = document.getElementById('surname-left').value + '%';
      document.getElementById('given-marker').style.top = document.getElementById('given-top').value + '%';
      document.getElementById('given-marker').style.left = document.getElementById('given-left').value + '%';
      document.getElementById('dob-marker').style.top = document.getElementById('dob-top').value + '%';
      document.getElementById('dob-marker').style.left = document.getElementById('dob-left').value + '%';
      document.getElementById('sex-marker').style.top = document.getElementById('sex-top').value + '%';
      document.getElementById('sex-marker').style.left = document.getElementById('sex-left').value + '%';
      document.getElementById('nin-marker').style.top = document.getElementById('nin-top').value + '%';
      document.getElementById('qr-marker').style.top = document.getElementById('qr-top').value + '%';
      document.getElementById('qr-marker').style.right = document.getElementById('qr-right').value + '%';
      document.getElementById('issue-marker').style.top = document.getElementById('issue-top').value + '%';
      
      document.getElementById('position-output').textContent = 
        'UPDATED POSITIONS:\\n' +
        'photo: { top: ' + document.getElementById('photo-top').value + '%, left: ' + document.getElementById('photo-left').value + '%, width: ' + document.getElementById('photo-width').value + '%, height: ' + document.getElementById('photo-height').value + '% }\\n' +
        'surname: { top: ' + document.getElementById('surname-top').value + '%, left: ' + document.getElementById('surname-left').value + '% }\\n' +
        'givenNames: { top: ' + document.getElementById('given-top').value + '%, left: ' + document.getElementById('given-left').value + '% }\\n' +
        'dob: { top: ' + document.getElementById('dob-top').value + '%, left: ' + document.getElementById('dob-left').value + '% }\\n' +
        'sex: { top: ' + document.getElementById('sex-top').value + '%, left: ' + document.getElementById('sex-left').value + '% }\\n' +
        'nin: { top: ' + document.getElementById('nin-top').value + '% }\\n' +
        'qrCode: { top: ' + document.getElementById('qr-top').value + '%, right: ' + document.getElementById('qr-right').value + '% }\\n' +
        'issueDate: { top: ' + document.getElementById('issue-top').value + '% }';
    }
  </script>
</body>
</html>
    `.trim();

    res.setHeader('Content-Type', 'text/html');
    res.send(testHtml);
  } catch (error: any) {
    logger.error('Slip analyzer error', { error: error.message });
    res.status(500).json({ error: 'Failed to analyze slip' });
  }
});

router.use(authMiddleware);

const getServicePrice = async (serviceType: string, defaultPrice: number): Promise<number> => {
  try {
    const { pricingService } = await import('../../services/pricingService');
    return await pricingService.getPrice(serviceType);
  } catch {
    return defaultPrice;
  }
};

router.post('/nin', async (req: Request, res: Response) => {
  try {
    const validation = ninLookupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('nin_lookup', 150);
    
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

    const pdfSlipTypeMap: Record<string, 'standard' | 'premium' | 'long'> = {
      'information': 'standard',
      'regular': 'long',
      'standard': 'standard',
      'premium': 'premium',
    };
    const pdfSlipType = pdfSlipTypeMap[slipType] || 'standard';

    let pdfSlipResult = null;
    try {
      const slipData: SlipData = {
        nin: validation.data.nin,
        surname: ninData.lastName || ninData.surname || '',
        firstname: ninData.firstName || ninData.firstname || '',
        middlename: ninData.middleName || ninData.middlename || '',
        date_of_birth: ninData.dateOfBirth || ninData.dob || '',
        gender: ninData.gender || '',
        photo: ninData.photo || '',
        tracking_id: ninData.trackingId || '',
        verification_reference: result.reference,
      };

      pdfSlipResult = await generatePdfSlip({
        userId: req.userId,
        slipType: pdfSlipType,
        data: slipData,
      });

      logger.info('PDF slip generated', { slipReference: pdfSlipResult.slipReference, userId: req.userId });
    } catch (pdfError: any) {
      logger.error('Failed to generate PDF slip', { error: pdfError.message, userId: req.userId });
    }

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'nin',
      nin: validation.data.nin,
      status: 'completed',
      verificationData: result.data,
      slipHtml: slip.html,
      slipType: slipType,
      slipReference: pdfSlipResult?.slipReference || null,
      reference: result.reference,
    });

    // Capture TechHub slip design for RPA analysis
    if (result.provider === 'techhub' && (result as any).techhubSlipHtml) {
      const { captureSlipDesign } = await import('../../services/slipCaptureService');
      await captureSlipDesign({
        provider: 'techhub',
        slipHtml: (result as any).techhubSlipHtml,
        rawResponse: (result as any).rawResponse,
        nin: validation.data.nin,
        reference: result.reference,
      });
      logger.info('TechHub slip design captured for RPA analysis', { reference: result.reference });
    }

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
        slipReference: pdfSlipResult?.slipReference || null,
        downloadUrl: pdfSlipResult ? `/api/slips/download/${pdfSlipResult.slipReference}` : null,
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

    const price = await getServicePrice('vnin', 200);
    
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

    const price = await getServicePrice('nin_phone', 200);
    
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

    const price = await getServicePrice('lost_nin', 500);

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

const generateTrackingId = (): string => {
  const prefix = 'ARP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 15);
};


router.post('/ipe-clearance', async (req: Request, res: Response) => {
  try {
    const { trackingId, statusType, slipType, customerNotes } = req.body;
    
    if (!trackingId || !statusType) {
      return res.status(400).json(formatErrorResponse(400, 'Tracking ID and status type are required'));
    }

    const basePrice = await getServicePrice('ipe_clearance', 1000);
    const slipPrice = slipType === 'premium' ? 150 : 0;
    const totalPrice = basePrice + slipPrice;

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < totalPrice) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, totalPrice, 'IPE Clearance Request', 'ipe_clearance');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'ipe_clearance',
      newTrackingId: trackingId,
      updateFields: { statusType, slipType },
      status: 'pending',
      fee: totalPrice.toFixed(2),
      isPaid: true,
      customerNotes,
    });

    logger.info('IPE Clearance request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'IPE Clearance request submitted successfully', {
      trackingId: requestTrackingId,
      statusType,
      slipType,
      price: totalPrice,
      message: 'Your request has been submitted and will be processed within 1-30 minutes.',
    }));
  } catch (error: any) {
    logger.error('IPE Clearance error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit IPE Clearance request'));
  }
});

router.post('/validation', async (req: Request, res: Response) => {
  try {
    const { nin, validationType, slipType, customerNotes } = req.body;
    
    if (!nin || !validationType) {
      return res.status(400).json(formatErrorResponse(400, 'NIN and validation type are required'));
    }

    if (nin.length !== 11 || !/^\d+$/.test(nin)) {
      return res.status(400).json(formatErrorResponse(400, 'NIN must be exactly 11 digits'));
    }

    const basePrice = await getServicePrice('validation_nin', 1000);
    const slipPrice = slipType === 'regular' ? 150 : 0;
    const totalPrice = basePrice + slipPrice;

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < totalPrice) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, totalPrice, 'NIN Validation Request', 'nin_validation');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'nin_validation',
      nin,
      updateFields: { validationType, slipType },
      status: 'pending',
      fee: totalPrice.toFixed(2),
      isPaid: true,
      customerNotes,
    });

    logger.info('NIN Validation request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'NIN Validation request submitted successfully', {
      trackingId: requestTrackingId,
      validationType,
      slipType,
      price: totalPrice,
      message: 'Your request has been submitted and will be processed within 1-30 minutes.',
    }));
  } catch (error: any) {
    logger.error('NIN Validation error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit NIN Validation request'));
  }
});

router.post('/birth-attestation', async (req: Request, res: Response) => {
  try {
    const { fullName, dateOfBirth, placeOfBirth, customerNotes } = req.body;
    
    if (!fullName || !dateOfBirth || !placeOfBirth) {
      return res.status(400).json(formatErrorResponse(400, 'Full name, date of birth, and place of birth are required'));
    }

    const price = await getServicePrice('birth_attestation', 2000);

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, price, 'Birth Attestation Request', 'birth_attestation');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'birth_attestation',
      updateFields: { fullName, dateOfBirth, placeOfBirth },
      status: 'pending',
      fee: price.toFixed(2),
      isPaid: true,
      customerNotes,
    });

    logger.info('Birth Attestation request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'Birth Attestation request submitted successfully', {
      trackingId: requestTrackingId,
      price,
      message: 'Your request has been submitted and will be processed within 24-48 hours.',
    }));
  } catch (error: any) {
    logger.error('Birth Attestation error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit Birth Attestation request'));
  }
});

router.post('/nin-tracking', async (req: Request, res: Response) => {
  try {
    const { trackingId, slipType } = req.body;
    
    if (!trackingId) {
      return res.status(400).json(formatErrorResponse(400, 'Tracking ID is required'));
    }

    const price = await getServicePrice('nin_tracking', 250);

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, price, 'NIN With Tracking ID', 'nin_tracking');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'nin_tracking',
      newTrackingId: trackingId,
      updateFields: { slipType: slipType || 'standard' },
      status: 'pending',
      fee: price.toFixed(2),
      isPaid: true,
    });

    logger.info('NIN Tracking request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'NIN With Tracking ID request submitted successfully', {
      trackingId: requestTrackingId,
      price,
      message: 'Your request has been submitted and will be processed within 1-30 minutes.',
    }));
  } catch (error: any) {
    logger.error('NIN Tracking error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit NIN Tracking request'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [history, countResult] = await Promise.all([
      db.select()
        .from(identityVerifications)
        .where(eq(identityVerifications.userId, req.userId!))
        .orderBy(desc(identityVerifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(identityVerifications)
        .where(eq(identityVerifications.userId, req.userId!))
    ]);

    const total = countResult[0]?.count || 0;

    const historyWithDownloadUrls = history.map(record => ({
      ...record,
      downloadUrl: record.slipReference ? `/api/slips/download/${record.slipReference}` : null,
    }));

    res.json(formatResponse('success', 200, 'Identity verification history retrieved', {
      history: historyWithDownloadUrls,
      pagination: { 
        page, 
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Identity history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

router.get('/service-requests', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const requests = await db.select()
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.userId, req.userId!))
      .orderBy(desc(identityServiceRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const allRecords = await db.select()
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.userId, req.userId!));

    res.json(formatResponse('success', 200, 'Identity service requests retrieved', {
      requests,
      pagination: { 
        page, 
        limit,
        total: allRecords.length,
        totalPages: Math.ceil(allRecords.length / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Identity service requests error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get service requests'));
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

    const slipType = (req.query.slipType as 'information' | 'regular' | 'standard' | 'premium') || (record.slipType as any) || 'standard';
    
    let slipHtml = record.slipHtml;
    if (!slipHtml) {
      const slip = generateNINSlip(record.verificationData as any, record.reference || `NIN-${record.id}`, slipType);
      slipHtml = slip.html;
    }

    res.json(formatResponse('success', 200, 'Slip retrieved', {
      slip: {
        html: slipHtml,
        generatedAt: record.createdAt,
        type: record.verificationType,
        slipType: record.slipType || slipType,
        reference: record.reference,
      },
    }));
  } catch (error: any) {
    logger.error('Get slip error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get slip'));
  }
});

router.get('/slip/:id/download', async (req: Request, res: Response) => {
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

    const slipType = (req.query.slipType as 'information' | 'regular' | 'standard' | 'premium') || (record.slipType as any) || 'standard';
    
    let slipHtml = record.slipHtml;
    if (!slipHtml) {
      const slip = generateNINSlip(record.verificationData as any, record.reference || `NIN-${record.id}`, slipType);
      slipHtml = slip.html;
    }

    const filename = `NIN_Slip_${record.nin || record.id}_${slipType}.html`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(slipHtml);
  } catch (error: any) {
    logger.error('Download slip error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to download slip'));
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

