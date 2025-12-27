import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { jobService } from '../../services/jobService';
import { walletService } from '../../services/walletService';
import { jambSchema, waecSchema, necoSchema, nabtebSchema, nbaisSchema } from '../validators/education';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { educationServices, servicePricing, educationPins, educationPinOrders, users, nbaisSchools } from '../../db/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { sendEmail } from '../../services/emailService';
import { getSchoolsByState, getSchoolsCount } from '../../rpa/workers/nbaisSchoolScraper';

const router = Router();
router.use(authMiddleware);

const DEFAULT_PRICES: Record<string, number> = {
  jamb: 1000,
  waec: 1000,
  neco: 1000,
  nabteb: 1000,
  nbais: 1000,
};

async function getServicePrice(serviceType: string): Promise<number> {
  try {
    const [pricing] = await db.select()
      .from(servicePricing)
      .where(and(
        eq(servicePricing.serviceType, serviceType),
        eq(servicePricing.isActive, true)
      ))
      .limit(1);
    
    if (pricing?.price) {
      return parseFloat(pricing.price);
    }
    return DEFAULT_PRICES[serviceType] || 1000;
  } catch (error: any) {
    logger.error('Error fetching service price', { serviceType, error: error.message });
    return DEFAULT_PRICES[serviceType] || 1000;
  }
}

router.post('/jamb', async (req: Request, res: Response) => {
  try {
    const validation = jambSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('jamb');
    await walletService.deductBalance(req.userId!, price, 'JAMB Score Lookup');

    const job = await jobService.createEducationJob(req.userId!, {
      serviceType: 'jamb',
      registrationNumber: validation.data.registrationNumber,
      examYear: validation.data.examYear,
    });

    logger.info('JAMB lookup request', { userId: req.userId, jobId: job.jobId });

    res.status(202).json(formatResponse('success', 202, 'JAMB score lookup submitted', {
      ...job,
      price,
    }));
  } catch (error: any) {
    logger.error('JAMB lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process JAMB request'));
  }
});

router.post('/waec', async (req: Request, res: Response) => {
  try {
    const validation = waecSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('waec');
    await walletService.deductBalance(req.userId!, price, 'WAEC Result Lookup');

    const job = await jobService.createEducationJob(req.userId!, {
      serviceType: 'waec',
      registrationNumber: validation.data.registrationNumber,
      examYear: validation.data.examYear,
      cardSerialNumber: validation.data.cardSerialNumber,
      cardPin: validation.data.cardPin,
      examType: validation.data.examType,
    });

    logger.info('WAEC lookup request', { userId: req.userId, jobId: job.jobId });

    res.status(202).json(formatResponse('success', 202, 'WAEC result lookup submitted', {
      ...job,
      price,
    }));
  } catch (error: any) {
    logger.error('WAEC lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process WAEC request'));
  }
});

router.post('/neco', async (req: Request, res: Response) => {
  try {
    const validation = necoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('neco');
    await walletService.deductBalance(req.userId!, price, 'NECO Result Lookup');

    const job = await jobService.createEducationJob(req.userId!, {
      serviceType: 'neco',
      registrationNumber: validation.data.registrationNumber,
      examYear: validation.data.examYear,
      examType: validation.data.examType,
      cardPin: validation.data.cardPin,
    });

    logger.info('NECO lookup request', { userId: req.userId, jobId: job.jobId });

    res.status(202).json(formatResponse('success', 202, 'NECO result lookup submitted', {
      ...job,
      price,
    }));
  } catch (error: any) {
    logger.error('NECO lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process NECO request'));
  }
});

router.post('/nabteb', async (req: Request, res: Response) => {
  try {
    const validation = nabtebSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('nabteb');
    await walletService.deductBalance(req.userId!, price, 'NABTEB Result Lookup');

    const job = await jobService.createEducationJob(req.userId!, {
      serviceType: 'nabteb',
      registrationNumber: validation.data.registrationNumber,
      examYear: validation.data.examYear,
      cardSerialNumber: validation.data.cardSerialNumber,
      cardPin: validation.data.cardPin,
    });

    logger.info('NABTEB lookup request', { userId: req.userId, jobId: job.jobId });

    res.status(202).json(formatResponse('success', 202, 'NABTEB result lookup submitted', {
      ...job,
      price,
    }));
  } catch (error: any) {
    logger.error('NABTEB lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process NABTEB request'));
  }
});

router.post('/nbais', async (req: Request, res: Response) => {
  try {
    const validation = nbaisSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('nbais');
    await walletService.deductBalance(req.userId!, price, 'NBAIS Result Lookup');

    const job = await jobService.createEducationJob(req.userId!, {
      serviceType: 'nbais',
      registrationNumber: validation.data.registrationNumber,
      examYear: validation.data.examYear,
      cardSerialNumber: validation.data.cardSerialNumber,
      cardPin: validation.data.cardPin,
    });

    logger.info('NBAIS lookup request', { userId: req.userId, jobId: job.jobId });

    res.status(202).json(formatResponse('success', 202, 'NBAIS result lookup submitted', {
      ...job,
      price,
    }));
  } catch (error: any) {
    logger.error('NBAIS lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process NBAIS request'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db.select()
      .from(educationServices)
      .where(eq(educationServices.userId, req.userId!))
      .orderBy(desc(educationServices.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(formatResponse('success', 200, 'Education services history retrieved', {
      history,
      pagination: { page, limit },
    }));
  } catch (error: any) {
    logger.error('Education history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await jobService.getJobStatus(jobId, req.userId!);

    res.json(formatResponse('success', 200, 'Job status retrieved', job));
  } catch (error: any) {
    logger.error('Get job status error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Job not found') {
      return res.status(404).json(formatErrorResponse(404, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to get job status'));
  }
});

router.get('/job/:jobId/download', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const format = (req.query.format as string) || 'pdf';
    
    const [educationService] = await db.select()
      .from(educationServices)
      .where(eq(educationServices.jobId, jobId))
      .limit(1);

    if (!educationService) {
      return res.status(404).json(formatErrorResponse(404, 'Result not found'));
    }

    if (educationService.userId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    const resultData = educationService.resultData as Record<string, any> | null;
    
    if (!resultData) {
      return res.status(404).json(formatErrorResponse(404, 'No result data available'));
    }

    if (format === 'pdf' && resultData.pdfBase64) {
      const pdfBuffer = Buffer.from(resultData.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${educationService.serviceType}_result_${educationService.registrationNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    }
    
    if (resultData.screenshotBase64) {
      const imageBuffer = Buffer.from(resultData.screenshotBase64, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${educationService.serviceType}_result_${educationService.registrationNumber}.png"`);
      res.setHeader('Content-Length', imageBuffer.length);
      return res.send(imageBuffer);
    }

    return res.status(404).json(formatErrorResponse(404, 'No downloadable result available. The result may only contain text data.'));
  } catch (error: any) {
    logger.error('Download result error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to download result'));
  }
});

router.get('/job/:jobId/preview', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const [educationService] = await db.select()
      .from(educationServices)
      .where(eq(educationServices.jobId, jobId))
      .limit(1);

    if (!educationService) {
      return res.status(404).json(formatErrorResponse(404, 'Result not found'));
    }

    if (educationService.userId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    const resultData = educationService.resultData as Record<string, any> | null;
    
    if (!resultData) {
      return res.status(404).json(formatErrorResponse(404, 'No result data available'));
    }

    if (resultData.pdfBase64) {
      const pdfBuffer = Buffer.from(resultData.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    }

    if (resultData.screenshotBase64) {
      const imgBuffer = Buffer.from(resultData.screenshotBase64, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', imgBuffer.length);
      return res.send(imgBuffer);
    }

    return res.status(404).json(formatErrorResponse(404, 'No preview available'));
  } catch (error: any) {
    logger.error('Preview result error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to preview result'));
  }
});

router.get('/job/:jobId/has-download', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const [educationService] = await db.select()
      .from(educationServices)
      .where(eq(educationServices.jobId, jobId))
      .limit(1);

    if (!educationService || educationService.userId !== req.userId) {
      return res.json(formatResponse('success', 200, 'Download availability checked', { 
        hasDownload: false,
        hasPdf: false,
        hasScreenshot: false,
      }));
    }

    const resultData = educationService.resultData as Record<string, any> | null;
    
    res.json(formatResponse('success', 200, 'Download availability checked', { 
      hasDownload: !!(resultData?.pdfBase64 || resultData?.screenshotBase64),
      hasPdf: !!resultData?.pdfBase64,
      hasScreenshot: !!resultData?.screenshotBase64,
    }));
  } catch (error: any) {
    logger.error('Check download availability error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to check download availability'));
  }
});

// ============================================
// EDUCATION PIN PURCHASE ENDPOINTS
// ============================================

// Get PIN stock availability for customer
router.get('/pins/stock', async (req: Request, res: Response) => {
  try {
    const examTypes = ['waec', 'neco', 'nabteb', 'nbais'];
    const stock: Record<string, { available: boolean; price: number }> = {};

    for (const examType of examTypes) {
      const [stockCount] = await db.select({ count: count() })
        .from(educationPins)
        .where(sql`${educationPins.examType} = ${examType} AND ${educationPins.status} = 'unused'`);
      
      const price = await getServicePrice(`${examType}_pin`);
      
      stock[examType] = {
        available: (stockCount?.count || 0) > 0,
        price,
      };
    }

    res.json(formatResponse('success', 200, 'PIN stock retrieved', { stock }));
  } catch (error: any) {
    logger.error('Get PIN stock error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PIN stock'));
  }
});

// Purchase education PIN
router.post('/pins/purchase', async (req: Request, res: Response) => {
  try {
    const { examType } = req.body;

    if (!examType) {
      return res.status(400).json(formatErrorResponse(400, 'Exam type is required'));
    }

    const validExamTypes = ['waec', 'neco', 'nabteb', 'nbais'];
    if (!validExamTypes.includes(examType.toLowerCase())) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid exam type. Supported: WAEC, NECO, NABTEB, NBAIS'));
    }

    const normalizedExamType = examType.toLowerCase();
    const price = await getServicePrice(`${normalizedExamType}_pin`);

    // Check stock availability first
    const [stockCount] = await db.select({ count: count() })
      .from(educationPins)
      .where(sql`${educationPins.examType} = ${normalizedExamType} AND ${educationPins.status} = 'unused'`);

    if (!stockCount?.count || stockCount.count === 0) {
      return res.status(400).json(formatErrorResponse(400, `No ${examType.toUpperCase()} PINs available. Please try again later.`));
    }

    // Deduct wallet balance first
    await walletService.deductBalance(req.userId!, price, `${examType.toUpperCase()} PIN Purchase`);

    // Create order with status 'paid'
    const [order] = await db.insert(educationPinOrders).values({
      userId: req.userId!,
      examType: normalizedExamType,
      amount: price.toFixed(2),
      status: 'paid',
    }).returning();

    // ARP Robot: Auto-assign PIN within transaction
    try {
      // Start transaction - select and lock one unused PIN
      const [selectedPin] = await db.select()
        .from(educationPins)
        .where(sql`${educationPins.examType} = ${normalizedExamType} AND ${educationPins.status} = 'unused'`)
        .limit(1)
        .for('update');

      if (!selectedPin) {
        // No PIN available - refund and fail order
        await walletService.addBalance(req.userId!, price, `Refund: ${examType.toUpperCase()} PIN - Out of stock`);
        await db.update(educationPinOrders)
          .set({ status: 'failed', failureReason: 'Out of stock' })
          .where(eq(educationPinOrders.id, order.id));

        logger.warn('PIN purchase failed - out of stock', { examType, userId: req.userId, orderId: order.id });
        return res.status(400).json(formatErrorResponse(400, `${examType.toUpperCase()} PINs are currently out of stock. Your wallet has been refunded.`));
      }

      // Mark PIN as used
      await db.update(educationPins)
        .set({
          status: 'used',
          usedByOrderId: order.id,
          usedByUserId: req.userId!,
          usedAt: new Date(),
        })
        .where(eq(educationPins.id, selectedPin.id));

      // Update order to completed with PIN details
      await db.update(educationPinOrders)
        .set({
          status: 'completed',
          pinId: selectedPin.id,
          deliveredPin: selectedPin.pinCode,
          deliveredSerial: selectedPin.serialNumber,
          completedAt: new Date(),
        })
        .where(eq(educationPinOrders.id, order.id));

      // Get user email for notification
      const [user] = await db.select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      // Send email notification (async, don't block response)
      if (user?.email) {
        sendEmail(
          user.email,
          `Your ${examType.toUpperCase()} PIN - Arapoint`,
          `
            <h2>Your ${examType.toUpperCase()} PIN</h2>
            <p>Dear ${user.name || 'Customer'},</p>
            <p>Your ${examType.toUpperCase()} examination PIN has been successfully delivered:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>PIN:</strong> ${selectedPin.pinCode}</p>
              ${selectedPin.serialNumber ? `<p><strong>Serial Number:</strong> ${selectedPin.serialNumber}</p>` : ''}
            </div>
            <p><strong>Important:</strong> This PIN cannot be refunded after delivery. Please keep it safe.</p>
            <p>Thank you for using Arapoint!</p>
          `
        ).catch((err: any) => logger.error('Failed to send PIN email', { error: err.message }));
      }

      logger.info('PIN delivered successfully', { 
        examType: normalizedExamType, 
        userId: req.userId, 
        orderId: order.id,
        pinId: selectedPin.id 
      });

      res.json(formatResponse('success', 200, `${examType.toUpperCase()} PIN delivered successfully`, {
        orderId: order.id,
        examType: normalizedExamType.toUpperCase(),
        pin: selectedPin.pinCode,
        serialNumber: selectedPin.serialNumber,
        amount: price,
        deliveredAt: new Date().toISOString(),
        warning: 'This PIN cannot be refunded after delivery.',
      }));

    } catch (pinError: any) {
      // PIN assignment failed - refund customer
      logger.error('PIN assignment failed', { error: pinError.message, orderId: order.id });
      
      await walletService.addBalance(req.userId!, price, `Refund: ${examType.toUpperCase()} PIN - System error`);
      await db.update(educationPinOrders)
        .set({ status: 'failed', failureReason: pinError.message })
        .where(eq(educationPinOrders.id, order.id));

      return res.status(500).json(formatErrorResponse(500, 'Failed to assign PIN. Your wallet has been refunded.'));
    }

  } catch (error: any) {
    logger.error('PIN purchase error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process PIN purchase'));
  }
});

// Get user's PIN orders
router.get('/pins/orders', async (req: Request, res: Response) => {
  try {
    const orders = await db.select()
      .from(educationPinOrders)
      .where(eq(educationPinOrders.userId, req.userId!))
      .orderBy(desc(educationPinOrders.createdAt))
      .limit(50);

    // Mask PIN for security in listing (only show first 4 chars)
    const maskedOrders = orders.map(order => ({
      ...order,
      deliveredPin: order.deliveredPin 
        ? `${order.deliveredPin.substring(0, 4)}****${order.deliveredPin.substring(order.deliveredPin.length - 4)}`
        : null,
    }));

    res.json(formatResponse('success', 200, 'PIN orders retrieved', { orders: maskedOrders }));
  } catch (error: any) {
    logger.error('Get PIN orders error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PIN orders'));
  }
});

// Get specific PIN order details (shows full PIN)
router.get('/pins/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const [order] = await db.select()
      .from(educationPinOrders)
      .where(and(
        eq(educationPinOrders.id, orderId),
        eq(educationPinOrders.userId, req.userId!)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json(formatErrorResponse(404, 'Order not found'));
    }

    res.json(formatResponse('success', 200, 'PIN order retrieved', { order }));
  } catch (error: any) {
    logger.error('Get PIN order error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PIN order'));
  }
});

router.get('/nbais/schools/:state', async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json(formatErrorResponse(400, 'State is required'));
    }

    const schools = await getSchoolsByState(state);
    
    res.json(formatResponse('success', 200, 'Schools retrieved', { 
      state,
      schools,
      count: schools.length 
    }));
  } catch (error: any) {
    logger.error('Get NBAIS schools error', { error: error.message, state: req.params.state });
    res.status(500).json(formatErrorResponse(500, 'Failed to get schools'));
  }
});

router.get('/nbais/schools-count', async (req: Request, res: Response) => {
  try {
    const count = await getSchoolsCount();
    res.json(formatResponse('success', 200, 'Schools count retrieved', { count }));
  } catch (error: any) {
    logger.error('Get schools count error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get schools count'));
  }
});

export default router;
