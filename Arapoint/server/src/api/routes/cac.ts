import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { 
  cacServiceTypes, 
  cacRegistrationRequests, 
  cacRequestDocuments,
  cacRequestActivity,
  cacRequestMessages,
  users
} from '../../db/schema';
import { eq, desc, count, and } from 'drizzle-orm';

const router = Router();
router.use(authMiddleware);

const CAC_STATUS = {
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  AWAITING_CUSTOMER: 'awaiting_customer',
  SUBMITTED_TO_CAC: 'submitted_to_cac',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

router.get('/service-types', async (req: Request, res: Response) => {
  try {
    const services = await db.select()
      .from(cacServiceTypes)
      .where(eq(cacServiceTypes.isActive, true))
      .orderBy(cacServiceTypes.name);

    res.json(formatResponse('success', 200, 'CAC service types retrieved', { services }));
  } catch (error: any) {
    logger.error('Get CAC service types error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get service types'));
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      serviceType,
      businessName,
      businessNature,
      businessAddress,
      businessState,
      businessLga,
      proprietorName,
      proprietorPhone,
      proprietorEmail,
      proprietorNin,
      additionalProprietors,
      shareCapital,
      objectives,
      customerNotes,
    } = req.body;

    if (!serviceType || !businessName || !proprietorName) {
      return res.status(400).json(formatErrorResponse(400, 'Service type, business name, and proprietor name are required'));
    }

    const [service] = await db.select()
      .from(cacServiceTypes)
      .where(and(eq(cacServiceTypes.code, serviceType), eq(cacServiceTypes.isActive, true)))
      .limit(1);

    if (!service) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid or inactive service type'));
    }

    const fee = parseFloat(service.price || '0');

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < fee) {
      return res.status(402).json(formatErrorResponse(402, `Insufficient wallet balance. Required: ₦${fee.toLocaleString()}`));
    }

    const paymentRef = `CAC_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await walletService.deductBalance(req.userId!, fee, `CAC Registration - ${service.name}`, 'cac_registration');

    const [request] = await db.insert(cacRegistrationRequests).values({
      userId: req.userId!,
      serviceTypeId: service.id,
      serviceType: serviceType,
      businessName,
      businessNature,
      businessAddress,
      businessState,
      businessLga,
      proprietorName,
      proprietorPhone,
      proprietorEmail,
      proprietorNin,
      additionalProprietors: additionalProprietors || [],
      shareCapital: shareCapital?.toString(),
      objectives,
      customerNotes,
      status: CAC_STATUS.SUBMITTED,
      fee: fee.toString(),
      isPaid: true,
      paymentReference: paymentRef,
    }).returning();

    await db.insert(cacRequestActivity).values({
      requestId: request.id,
      actorType: 'user',
      actorId: req.userId!,
      action: 'submitted',
      newStatus: CAC_STATUS.SUBMITTED,
      comment: 'Registration request submitted',
    });

    logger.info('CAC registration submitted', { userId: req.userId, requestId: request.id, serviceType });

    res.status(201).json(formatResponse('success', 201, 'CAC registration request submitted successfully', {
      request: {
        id: request.id,
        businessName: request.businessName,
        serviceType: request.serviceType,
        status: request.status,
        fee: parseFloat(request.fee || '0'),
        createdAt: request.createdAt,
      },
      paymentReference: paymentRef,
    }));
  } catch (error: any) {
    logger.error('CAC registration error', { error: error.message, userId: req.userId });

    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }

    res.status(500).json(formatErrorResponse(500, 'Failed to submit CAC registration'));
  }
});

router.get('/requests', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const requests = await db.select({
      id: cacRegistrationRequests.id,
      serviceType: cacRegistrationRequests.serviceType,
      businessName: cacRegistrationRequests.businessName,
      status: cacRegistrationRequests.status,
      fee: cacRegistrationRequests.fee,
      cacRegistrationNumber: cacRegistrationRequests.cacRegistrationNumber,
      certificateUrl: cacRegistrationRequests.certificateUrl,
      createdAt: cacRegistrationRequests.createdAt,
      completedAt: cacRegistrationRequests.completedAt,
    })
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.userId, req.userId!))
      .orderBy(desc(cacRegistrationRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() })
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.userId, req.userId!));

    res.json(formatResponse('success', 200, 'CAC requests retrieved', {
      requests,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get CAC requests error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get CAC requests'));
  }
});

router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.id, id),
        eq(cacRegistrationRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const documents = await db.select()
      .from(cacRequestDocuments)
      .where(eq(cacRequestDocuments.requestId, id));

    const activity = await db.select()
      .from(cacRequestActivity)
      .where(eq(cacRequestActivity.requestId, id))
      .orderBy(desc(cacRequestActivity.createdAt));

    res.json(formatResponse('success', 200, 'CAC request details retrieved', {
      request,
      documents,
      activity,
    }));
  } catch (error: any) {
    logger.error('Get CAC request details error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get request details'));
  }
});

router.post('/requests/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { documentType, fileName, fileUrl, fileSize, mimeType } = req.body;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.id, id),
        eq(cacRegistrationRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const [document] = await db.insert(cacRequestDocuments).values({
      requestId: id,
      documentType,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
    }).returning();

    await db.insert(cacRequestActivity).values({
      requestId: id,
      actorType: 'user',
      actorId: req.userId!,
      action: 'document_uploaded',
      comment: `Document uploaded: ${documentType}`,
    });

    logger.info('CAC document uploaded', { userId: req.userId, requestId: id, documentType });

    res.status(201).json(formatResponse('success', 201, 'Document uploaded successfully', { document }));
  } catch (error: any) {
    logger.error('CAC document upload error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to upload document'));
  }
});

router.get('/requests/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.id, id),
        eq(cacRegistrationRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const messages = await db.select()
      .from(cacRequestMessages)
      .where(eq(cacRequestMessages.requestId, id))
      .orderBy(cacRequestMessages.createdAt);

    await db.update(cacRequestMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(cacRequestMessages.requestId, id),
        eq(cacRequestMessages.senderType, 'agent'),
        eq(cacRequestMessages.isRead, false)
      ));

    res.json(formatResponse('success', 200, 'Messages retrieved', { messages }));
  } catch (error: any) {
    logger.error('Get CAC messages error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get messages'));
  }
});

router.post('/requests/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json(formatErrorResponse(400, 'Message is required'));
    }

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.id, id),
        eq(cacRegistrationRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const [newMessage] = await db.insert(cacRequestMessages).values({
      requestId: id,
      senderType: 'user',
      senderId: req.userId!,
      message: message.trim(),
      attachments: attachments || [],
    }).returning();

    logger.info('CAC message sent by user', { userId: req.userId, requestId: id });

    res.status(201).json(formatResponse('success', 201, 'Message sent', { message: newMessage }));
  } catch (error: any) {
    logger.error('Send CAC message error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to send message'));
  }
});

router.get('/requests/:id/unread-count', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.id, id),
        eq(cacRegistrationRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const [result] = await db.select({ count: count() })
      .from(cacRequestMessages)
      .where(and(
        eq(cacRequestMessages.requestId, id),
        eq(cacRequestMessages.senderType, 'agent'),
        eq(cacRequestMessages.isRead, false)
      ));

    res.json(formatResponse('success', 200, 'Unread count retrieved', { unreadCount: result?.count || 0 }));
  } catch (error: any) {
    logger.error('Get unread count error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get unread count'));
  }
});

router.get('/requests/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.id, id),
        eq(cacRegistrationRequests.userId, req.userId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const documents = await db.select()
      .from(cacRequestDocuments)
      .where(eq(cacRequestDocuments.requestId, id))
      .orderBy(desc(cacRequestDocuments.createdAt));

    res.json(formatResponse('success', 200, 'Documents retrieved', { documents }));
  } catch (error: any) {
    logger.error('Get documents error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get documents'));
  }
});

export default router;
