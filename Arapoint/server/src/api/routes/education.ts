import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { jobService } from '../../services/jobService';
import { walletService } from '../../services/walletService';
import { jambSchema, waecSchema, necoSchema, nabtebSchema, nbaisSchema } from '../validators/education';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { educationServices, servicePricing } from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';

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

export default router;
