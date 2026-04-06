import { Router } from 'express';
import {
  Request, Response, db, logger, sql, eq,
  developerUsers, devJwtAuth, kybUpload,
  objectStorageService, ObjectNotFoundError,
} from './shared';

const router = Router();

router.get('/kyc/status', devJwtAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  res.json({
    status: 'success', code: 200, message: 'KYC status retrieved',
    data: {
      accountType: dev.accountType || 'individual',
      kycStatus: dev.kycStatus || 'not_required',
      kycDocuments: dev.kycDocuments || null,
      kycSubmittedAt: dev.kycSubmittedAt,
      kycReviewedAt: dev.kycReviewedAt,
      kycReviewNote: dev.kycReviewNote,
    }
  });
});

router.post('/kyc/submit', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { accountType, documents, kybData } = req.body;

    const validTypes = ['individual', 'business', 'enterprise'];
    if (!accountType || !validTypes.includes(accountType)) {
      return res.status(400).json({ status: 'error', code: 400, message: `Account type required. Valid: ${validTypes.join(', ')}` });
    }

    let kycStatus: string;
    let kycDocumentsPayload: any = null;

    if (accountType === 'individual') {
      kycStatus = 'not_required';
    } else if (kybData) {
      const { companyInfo, directors, apiUseCase, compliance, uploadedDocuments } = kybData;
      if (!companyInfo?.legalName || !companyInfo?.cacNumber) {
        return res.status(400).json({ status: 'error', code: 400, message: 'Company legal name and CAC number are required' });
      }
      if (!directors || !directors.length || !directors[0].fullName) {
        return res.status(400).json({ status: 'error', code: 400, message: 'At least one director is required' });
      }
      if (!apiUseCase?.purpose || !apiUseCase?.expectedVolume) {
        return res.status(400).json({ status: 'error', code: 400, message: 'API use case and expected volume are required' });
      }
      kycStatus = 'submitted';
      kycDocumentsPayload = {
        companyInfo, directors, apiUseCase, compliance,
        uploadedDocuments: uploadedDocuments || {},
        submittedAt: new Date().toISOString()
      };
    } else {
      if (!documents || !documents.length) {
        return res.status(400).json({ status: 'error', code: 400, message: 'KYC documents required for business/enterprise accounts' });
      }
      kycStatus = 'submitted';
      kycDocumentsPayload = Array.isArray(documents) ? documents : [{ description: documents }];
    }

    await db.update(developerUsers).set({
      accountType,
      kycStatus,
      kycDocuments: kycDocumentsPayload,
      kycSubmittedAt: kycStatus === 'submitted' ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(developerUsers.id, dev.id));

    res.json({
      status: 'success', code: 200,
      message: accountType === 'individual' ? 'Account type updated' : 'Business verification submitted for review. We will notify you within 24–72 hours.',
      data: { accountType, kycStatus }
    });
  } catch (e: any) {
    logger.error('KYC submit error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to submit KYC' });
  }
});

router.post('/kyc/upload-document', devJwtAuth, kybUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', code: 400, message: 'No file provided' });
    }
    const { docType } = req.body;
    const validDocTypes = ['cac_certificate', 'status_report', 'address_verification', 'utility_bill', 'other'];
    if (!docType || !validDocTypes.includes(docType)) {
      return res.status(400).json({ status: 'error', code: 400, message: `docType must be one of: ${validDocTypes.join(', ')}` });
    }
    const ext = req.file.originalname.split('.').pop() || 'pdf';
    const fileKey = await objectStorageService.uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
      `kyb-docs/${docType}`,
      ext
    );
    if (!fileKey) {
      return res.status(500).json({ status: 'error', code: 500, message: 'Object storage not configured' });
    }
    res.json({
      status: 'success', code: 200, message: 'Document uploaded',
      data: { fileKey, docType, originalName: req.file.originalname, size: req.file.size }
    });
  } catch (e: any) {
    logger.error('KYB document upload error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to upload document' });
  }
});

router.get('/kyc/document/:encodedKey', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const fileKey = decodeURIComponent(req.params.encodedKey);
    if (!fileKey.includes('kyb-docs/')) {
      return res.status(403).json({ status: 'error', code: 403, message: 'Access denied' });
    }
    const file = await objectStorageService.getObjectEntityFile(fileKey);
    await objectStorageService.downloadObject(file, res);
  } catch (e: any) {
    if (e instanceof ObjectNotFoundError) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Document not found' });
    }
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to download document' });
  }
});

export default router;
