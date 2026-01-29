import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generatePdfSlip, getSlipPdf, getSlipInfo, SlipData } from '../../services/pdfSlipGenerator';
import { authMiddleware } from '../middleware/auth';
import { publicRateLimiter } from '../middleware/rateLimit';
import { logger } from '../../utils/logger';

const router = Router();

const verifyNinSchema = z.object({
  nin: z.string().min(11).max(11),
  surname: z.string().min(1),
  firstname: z.string().min(1),
  middlename: z.string().optional(),
  date_of_birth: z.string().min(1),
  gender: z.string().optional(),
  photo: z.string().optional(),
  tracking_id: z.string().optional(),
  verification_reference: z.string().optional(),
  slip_type: z.enum(['standard', 'premium']).default('standard')
});

router.post('/verify-nin', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = verifyNinSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Validation error',
        errors: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const { slip_type, ...slipData } = validation.data;

    logger.info('Generating NIN slip', {
      userId: req.userId,
      slipType: slip_type,
      nin: `${slipData.nin.slice(0, 4)}***`
    });

    const result = await generatePdfSlip({
      userId: req.userId,
      slipType: slip_type,
      data: slipData as SlipData
    });

    logger.info('NIN slip generated successfully', {
      slipReference: result.slipReference,
      userId: req.userId
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'NIN slip generated successfully',
      data: {
        slip_reference: result.slipReference,
        download_url: `/api/slips/download/${result.slipReference}`,
        verification_url: result.verificationUrl,
        slip_type: slip_type
      }
    });
  } catch (error: any) {
    logger.error('Failed to generate NIN slip', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to generate NIN slip',
      error: error.message
    });
  }
});

router.get('/download/:reference', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Slip reference is required'
      });
    }

    logger.info('Downloading slip', { reference, userId: req.userId });

    const pdfBuffer = await getSlipPdf(reference, req.userId);

    if (!pdfBuffer) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Slip not found or you do not have permission to access it'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reference}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to download slip', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to download slip'
    });
  }
});

router.get('/verify/:reference', publicRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Slip reference is required'
      });
    }

    const slipInfo = await getSlipInfo(reference);

    if (!slipInfo) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Slip not found',
        data: {
          verified: false,
          reference
        }
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Slip verification successful',
      data: {
        verified: slipInfo.verified,
        slip_reference: reference,
        slip_type: slipInfo.slipType,
        holder_name: `${slipInfo.firstname} ${slipInfo.surname}`,
        nin_masked: slipInfo.ninMasked,
        verification_status: slipInfo.verificationStatus,
        issued_at: slipInfo.createdAt
      }
    });
  } catch (error: any) {
    logger.error('Failed to verify slip', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to verify slip'
    });
  }
});

router.get('/verify-page/:reference', publicRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const slipInfo = await getSlipInfo(reference);

    const verifiedHtml = slipInfo ? `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Slip Verification - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, #228b22 0%, #32cd32 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .icon { font-size: 60px; margin-bottom: 15px; }
    .content { padding: 30px; }
    .field { margin-bottom: 20px; }
    .field-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .field-value { font-size: 18px; font-weight: 600; color: #333; }
    .status-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .footer { padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">✓</div>
      <h1>Verified NIN Slip</h1>
      <p>This slip has been verified</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">Holder Name</div>
        <div class="field-value">${slipInfo.firstname} ${slipInfo.surname}</div>
      </div>
      <div class="field">
        <div class="field-label">NIN (Masked)</div>
        <div class="field-value">${slipInfo.ninMasked}</div>
      </div>
      <div class="field">
        <div class="field-label">Slip Type</div>
        <div class="field-value" style="text-transform: capitalize;">${slipInfo.slipType}</div>
      </div>
      <div class="field">
        <div class="field-label">Status</div>
        <div class="status-badge">${slipInfo.verificationStatus?.toUpperCase()}</div>
      </div>
      <div class="field">
        <div class="field-label">Reference</div>
        <div class="field-value">${reference}</div>
      </div>
    </div>
    <div class="footer">
      Verified by Arapoint Solutions | Powered by NIMC
    </div>
  </div>
</body>
</html>
    ` : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Slip Verification Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, #c41e3a 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .icon { font-size: 60px; margin-bottom: 15px; }
    .content { padding: 30px; text-align: center; }
    .message { font-size: 16px; color: #666; line-height: 1.6; }
    .footer { padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">✗</div>
      <h1>Verification Failed</h1>
    </div>
    <div class="content">
      <p class="message">
        The slip reference <strong>${reference}</strong> could not be verified.<br><br>
        This slip may be invalid, expired, or does not exist in our records.
      </p>
    </div>
    <div class="footer">
      Arapoint Solutions | Nigeria Identity Verification
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(verifiedHtml);
  } catch (error: any) {
    logger.error('Failed to render verification page', { error: error.message });
    res.status(500).send('Failed to load verification page');
  }
});

export default router;
