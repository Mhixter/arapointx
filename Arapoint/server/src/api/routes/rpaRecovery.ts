import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/auth';
import { rpaRecoveryService } from '../../services/rpaRecoveryService';
import { db } from '../../config/database';
import { rpaRecoverySuggestions, rpaJobs } from '../../db/schema';
import { eq, desc, count, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const rows = await db.select()
      .from(rpaRecoverySuggestions)
      .orderBy(desc(rpaRecoverySuggestions.createdAt))
      .limit(limit)
      .offset(offset);

    const [totals] = await db.select({ count: count() }).from(rpaRecoverySuggestions);

    const [pending] = await db.select({ count: count() })
      .from(rpaRecoverySuggestions)
      .where(eq(rpaRecoverySuggestions.status, 'pending'));

    const [deployed] = await db.select({ count: count() })
      .from(rpaRecoverySuggestions)
      .where(eq(rpaRecoverySuggestions.status, 'deployed'));

    const [otpPending] = await db.select({ count: count() })
      .from(rpaRecoverySuggestions)
      .where(eq(rpaRecoverySuggestions.status, 'otp_pending'));

    res.json({
      status: 'success',
      code: 200,
      message: 'Recovery suggestions retrieved',
      data: {
        suggestions: rows.map(r => ({ ...r, otpToken: undefined })),
        pagination: { page, limit, total: Number(totals.count) },
        stats: {
          total: Number(totals.count),
          pending: Number(pending.count),
          otpPending: Number(otpPending.count),
          deployed: Number(deployed.count),
        },
      },
    });
  } catch (err: any) {
    logger.error('Failed to list recovery suggestions', { error: err.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fetch suggestions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const suggestion = await rpaRecoveryService.getSuggestion(req.params.id);
    if (!suggestion) return res.status(404).json({ status: 'error', code: 404, message: 'Suggestion not found' });

    res.json({
      status: 'success',
      code: 200,
      message: 'Suggestion retrieved',
      data: { suggestion: { ...suggestion, otpToken: undefined } },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', code: 500, message: err.message });
  }
});

router.post('/analyze/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const [job] = await db.select().from(rpaJobs).where(eq(rpaJobs.id, jobId)).limit(1);
    if (!job) return res.status(404).json({ status: 'error', code: 404, message: 'Job not found' });
    if (job.status !== 'failed') {
      return res.status(400).json({ status: 'error', code: 400, message: 'Can only analyze failed jobs' });
    }

    const provider = (job.serviceType as string).split('_')[0].toLowerCase();
    const suggestionId = await rpaRecoveryService.analyzeJobFailure(
      jobId,
      provider,
      job.serviceType as string,
      job.errorMessage || 'Unknown error',
      undefined,
      undefined
    );

    res.json({
      status: 'success',
      code: 200,
      message: 'AI analysis triggered successfully',
      data: { suggestionId },
    });
  } catch (err: any) {
    logger.error('Manual AI analysis failed', { error: err.message });
    res.status(500).json({ status: 'error', code: 500, message: err.message });
  }
});

router.post('/:id/request-approval', async (req, res) => {
  try {
    const adminId = (req as any).adminId;
    await rpaRecoveryService.sendApprovalOTP(req.params.id, adminId);
    res.json({
      status: 'success',
      code: 200,
      message: 'OTP sent to your admin email. Enter it below to confirm deployment.',
    });
  } catch (err: any) {
    logger.error('Failed to send approval OTP', { error: err.message });
    res.status(400).json({ status: 'error', code: 400, message: err.message });
  }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const { otp, adminNotes } = req.body;
    const adminId = (req as any).adminId;

    if (!otp) return res.status(400).json({ status: 'error', code: 400, message: 'OTP is required' });

    await rpaRecoveryService.confirmAndDeploy(req.params.id, otp, adminId, adminNotes);

    logger.info('Recovery suggestion confirmed and deployed', { suggestionId: req.params.id, adminId });
    res.json({
      status: 'success',
      code: 200,
      message: 'Selector fix deployed successfully. RPA workers will use the new selectors immediately.',
    });
  } catch (err: any) {
    logger.error('Failed to confirm recovery suggestion', { error: err.message });
    res.status(400).json({ status: 'error', code: 400, message: err.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const adminId = (req as any).adminId;
    await rpaRecoveryService.reject(req.params.id, adminId, adminNotes);
    res.json({
      status: 'success',
      code: 200,
      message: 'Suggestion rejected.',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', code: 500, message: err.message });
  }
});

router.get('/deployed/:provider', async (req, res) => {
  try {
    const selectors = await rpaRecoveryService.getDeployedSelectors(req.params.provider);
    res.json({
      status: 'success',
      code: 200,
      message: selectors ? 'Deployed selectors retrieved' : 'No deployed selectors for this provider',
      data: { selectors },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', code: 500, message: err.message });
  }
});

export default router;
