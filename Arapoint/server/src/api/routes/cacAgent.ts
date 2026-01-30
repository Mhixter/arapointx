import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { 
  cacAgents,
  cacRegistrationRequests, 
  cacRequestDocuments,
  cacRequestActivity,
  cacRequestMessages,
  cacServiceTypes,
  adminUsers,
  users
} from '../../db/schema';
import { eq, desc, count, and, isNull, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const CAC_STATUS = {
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  AWAITING_CUSTOMER: 'awaiting_customer',
  SUBMITTED_TO_CAC: 'submitted_to_cac',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

const cacAgentAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatErrorResponse(401, 'Authentication required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'cac_agent') {
      return res.status(403).json(formatErrorResponse(403, 'Access denied. CAC agent role required'));
    }

    const [agent] = await db.select()
      .from(cacAgents)
      .where(eq(cacAgents.id, decoded.agentId))
      .limit(1);

    if (!agent || !agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is inactive'));
    }

    (req as any).agentId = agent.id;
    (req as any).adminUserId = agent.adminUserId;
    next();
  } catch (error: any) {
    logger.error('CAC agent auth error', { error: error.message });
    return res.status(401).json(formatErrorResponse(401, 'Invalid or expired token'));
  }
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Email and password are required'));
    }

    const [adminUser] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    }

    const passwordValid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!passwordValid) {
      return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    }

    const [agent] = await db.select()
      .from(cacAgents)
      .where(eq(cacAgents.adminUserId, adminUser.id))
      .limit(1);

    if (!agent) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized as CAC agent'));
    }

    if (!agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is currently inactive'));
    }

    const token = jwt.sign(
      { 
        agentId: agent.id, 
        adminUserId: adminUser.id, 
        email: adminUser.email,
        role: 'cac_agent' 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, adminUser.id));

    logger.info('CAC agent login', { agentId: agent.id, email });

    res.json(formatResponse('success', 200, 'Login successful', {
      token,
      agent: {
        id: agent.id,
        name: adminUser.name,
        email: adminUser.email,
        employeeId: agent.employeeId,
        currentActiveRequests: agent.currentActiveRequests,
        totalCompletedRequests: agent.totalCompletedRequests,
      },
    }));
  } catch (error: any) {
    logger.error('CAC agent login error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

router.get('/me', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;

    const [agent] = await db.select({
      id: cacAgents.id,
      employeeId: cacAgents.employeeId,
      specializations: cacAgents.specializations,
      maxActiveRequests: cacAgents.maxActiveRequests,
      currentActiveRequests: cacAgents.currentActiveRequests,
      totalCompletedRequests: cacAgents.totalCompletedRequests,
      isAvailable: cacAgents.isAvailable,
      name: adminUsers.name,
      email: adminUsers.email,
    })
      .from(cacAgents)
      .leftJoin(adminUsers, eq(cacAgents.adminUserId, adminUsers.id))
      .where(eq(cacAgents.id, agentId))
      .limit(1);

    res.json(formatResponse('success', 200, 'Agent profile retrieved', { agent }));
  } catch (error: any) {
    logger.error('Get agent profile error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

router.get('/requests', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const assigned = req.query.assigned as string;

    let whereCondition: any;

    if (assigned === 'me') {
      whereCondition = eq(cacRegistrationRequests.assignedAgentId, agentId);
    } else if (assigned === 'unassigned') {
      whereCondition = isNull(cacRegistrationRequests.assignedAgentId);
    } else if (status) {
      whereCondition = eq(cacRegistrationRequests.status, status);
    }

    const query = db.select({
      id: cacRegistrationRequests.id,
      serviceType: cacRegistrationRequests.serviceType,
      businessName: cacRegistrationRequests.businessName,
      proprietorName: cacRegistrationRequests.proprietorName,
      proprietorPhone: cacRegistrationRequests.proprietorPhone,
      status: cacRegistrationRequests.status,
      fee: cacRegistrationRequests.fee,
      assignedAgentId: cacRegistrationRequests.assignedAgentId,
      assignedAt: cacRegistrationRequests.assignedAt,
      createdAt: cacRegistrationRequests.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(cacRegistrationRequests)
      .leftJoin(users, eq(cacRegistrationRequests.userId, users.id))
      .orderBy(desc(cacRegistrationRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const requests = whereCondition 
      ? await query.where(whereCondition)
      : await query;

    const [totalCount] = await db.select({ count: count() }).from(cacRegistrationRequests);

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
    logger.error('Get agent requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.get('/requests/:id', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select({
      request: cacRegistrationRequests,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
    })
      .from(cacRegistrationRequests)
      .leftJoin(users, eq(cacRegistrationRequests.userId, users.id))
      .where(eq(cacRegistrationRequests.id, id))
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

    res.json(formatResponse('success', 200, 'Request details retrieved', {
      ...request.request,
      customer: {
        name: request.userName,
        email: request.userEmail,
        phone: request.userPhone,
      },
      documents,
      activity,
    }));
  } catch (error: any) {
    logger.error('Get request details error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get request details'));
  }
});

router.post('/requests/:id/assign', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (request.assignedAgentId) {
      return res.status(400).json(formatErrorResponse(400, 'Request is already assigned'));
    }

    const previousStatus = request.status;

    await db.update(cacRegistrationRequests)
      .set({
        assignedAgentId: agentId,
        assignedAt: new Date(),
        status: CAC_STATUS.IN_REVIEW,
        updatedAt: new Date(),
      })
      .where(eq(cacRegistrationRequests.id, id));

    await db.update(cacAgents)
      .set({
        currentActiveRequests: sql`${cacAgents.currentActiveRequests} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(cacAgents.id, agentId));

    await db.insert(cacRequestActivity).values({
      requestId: id,
      actorType: 'agent',
      actorId: agentId,
      action: 'assigned',
      previousStatus,
      newStatus: CAC_STATUS.IN_REVIEW,
      comment: 'Request assigned to agent',
    });

    logger.info('Request assigned', { requestId: id, agentId });

    res.json(formatResponse('success', 200, 'Request assigned successfully'));
  } catch (error: any) {
    logger.error('Assign request error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to assign request'));
  }
});

router.put('/requests/:id/status', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;
    const { status, comment, cacRegistrationNumber, certificateUrl, statusReportUrl, rejectionReason } = req.body;

    const validStatuses = Object.values(CAC_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid status'));
    }

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const previousStatus = request.status;
    const updateData: any = {
      status,
      updatedAt: new Date(),
      agentNotes: comment || request.agentNotes,
    };

    if (status === CAC_STATUS.SUBMITTED_TO_CAC) {
      updateData.submittedToCacAt = new Date();
    }

    if (status === CAC_STATUS.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.cacRegistrationNumber = cacRegistrationNumber;
      updateData.certificateUrl = certificateUrl;

      await db.update(cacAgents)
        .set({
          currentActiveRequests: sql`GREATEST(${cacAgents.currentActiveRequests} - 1, 0)`,
          totalCompletedRequests: sql`${cacAgents.totalCompletedRequests} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(cacAgents.id, agentId));
    }

    if (status === CAC_STATUS.REJECTED) {
      updateData.rejectionReason = rejectionReason;

      await db.update(cacAgents)
        .set({
          currentActiveRequests: sql`GREATEST(${cacAgents.currentActiveRequests} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(cacAgents.id, agentId));
    }

    await db.update(cacRegistrationRequests)
      .set(updateData)
      .where(eq(cacRegistrationRequests.id, id));

    await db.insert(cacRequestActivity).values({
      requestId: id,
      actorType: 'agent',
      actorId: agentId,
      action: 'status_updated',
      previousStatus,
      newStatus: status,
      comment: comment || `Status changed to ${status}`,
    });

    logger.info('Request status updated', { requestId: id, agentId, previousStatus, newStatus: status });

    res.json(formatResponse('success', 200, 'Status updated successfully'));
  } catch (error: any) {
    logger.error('Update status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update status'));
  }
});

router.get('/stats', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;

    const [assignedCount] = await db.select({ count: count() })
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.assignedAgentId, agentId));

    const [pendingCount] = await db.select({ count: count() })
      .from(cacRegistrationRequests)
      .where(isNull(cacRegistrationRequests.assignedAgentId));

    const [inReviewCount] = await db.select({ count: count() })
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.assignedAgentId, agentId),
        eq(cacRegistrationRequests.status, CAC_STATUS.IN_REVIEW)
      ));

    const [completedCount] = await db.select({ count: count() })
      .from(cacRegistrationRequests)
      .where(and(
        eq(cacRegistrationRequests.assignedAgentId, agentId),
        eq(cacRegistrationRequests.status, CAC_STATUS.COMPLETED)
      ));

    const [agent] = await db.select()
      .from(cacAgents)
      .where(eq(cacAgents.id, agentId))
      .limit(1);

    res.json(formatResponse('success', 200, 'Stats retrieved', {
      myAssigned: assignedCount?.count || 0,
      unassigned: pendingCount?.count || 0,
      inReview: inReviewCount?.count || 0,
      completed: completedCount?.count || 0,
      totalCompleted: agent?.totalCompletedRequests || 0,
    }));
  } catch (error: any) {
    logger.error('Get agent stats error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get stats'));
  }
});

router.get('/requests/:id/messages', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (request.assignedAgentId && request.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'Not assigned to this request'));
    }

    const messages = await db.select()
      .from(cacRequestMessages)
      .where(eq(cacRequestMessages.requestId, id))
      .orderBy(cacRequestMessages.createdAt);

    await db.update(cacRequestMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(cacRequestMessages.requestId, id),
        eq(cacRequestMessages.senderType, 'user'),
        eq(cacRequestMessages.isRead, false)
      ));

    res.json(formatResponse('success', 200, 'Messages retrieved', { messages }));
  } catch (error: any) {
    logger.error('Get CAC messages error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get messages'));
  }
});

router.post('/requests/:id/messages', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;
    const agentId = (req as any).agentId;

    if (!message || !message.trim()) {
      return res.status(400).json(formatErrorResponse(400, 'Message is required'));
    }

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (request.assignedAgentId && request.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'Not assigned to this request'));
    }

    const [newMessage] = await db.insert(cacRequestMessages).values({
      requestId: id,
      senderType: 'agent',
      senderId: agentId,
      message: message.trim(),
      attachments: attachments || [],
    }).returning();

    logger.info('CAC message sent by agent', { agentId, requestId: id });

    res.status(201).json(formatResponse('success', 201, 'Message sent', { message: newMessage }));
  } catch (error: any) {
    logger.error('Send CAC message error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send message'));
  }
});

router.get('/requests/:id/unread-count', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await db.select({ count: count() })
      .from(cacRequestMessages)
      .where(and(
        eq(cacRequestMessages.requestId, id),
        eq(cacRequestMessages.senderType, 'user'),
        eq(cacRequestMessages.isRead, false)
      ));

    res.json(formatResponse('success', 200, 'Unread count retrieved', { unreadCount: result?.count || 0 }));
  } catch (error: any) {
    logger.error('Get unread count error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get unread count'));
  }
});

router.post('/requests/:id/upload-document', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;
    const { documentType, fileName, fileUrl, fileSize, mimeType } = req.body;

    const validDocTypes = ['cac_certificate', 'status_report', 'incorporation_document', 'other'];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid document type'));
    }

    if (!fileName || !fileUrl) {
      return res.status(400).json(formatErrorResponse(400, 'File name and URL are required'));
    }

    try {
      const url = new URL(fileUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return res.status(400).json(formatErrorResponse(400, 'Invalid URL protocol - only http/https allowed'));
      }
    } catch {
      return res.status(400).json(formatErrorResponse(400, 'Invalid URL format'));
    }

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (request.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'Not assigned to this request'));
    }

    const [document] = await db.insert(cacRequestDocuments).values({
      requestId: id,
      documentType,
      fileName,
      fileUrl,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/pdf',
      verifiedBy: agentId,
      verifiedAt: new Date(),
      isVerified: true,
    }).returning();

    if (documentType === 'cac_certificate') {
      await db.update(cacRegistrationRequests)
        .set({ certificateUrl: fileUrl, updatedAt: new Date() })
        .where(eq(cacRegistrationRequests.id, id));
    }

    await db.insert(cacRequestActivity).values({
      requestId: id,
      actorType: 'agent',
      actorId: agentId,
      action: 'document_uploaded',
      comment: `Document uploaded: ${documentType} - ${fileName}`,
    });

    logger.info('Agent uploaded document', { agentId, requestId: id, documentType });

    res.status(201).json(formatResponse('success', 201, 'Document uploaded successfully', { document }));
  } catch (error: any) {
    logger.error('Agent document upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to upload document'));
  }
});

router.get('/requests/:id/documents', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const documents = await db.select()
      .from(cacRequestDocuments)
      .where(eq(cacRequestDocuments.requestId, id))
      .orderBy(desc(cacRequestDocuments.createdAt));

    res.json(formatResponse('success', 200, 'Documents retrieved', { documents }));
  } catch (error: any) {
    logger.error('Get documents error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get documents'));
  }
});

router.get('/service-types', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const services = await db.select()
      .from(cacServiceTypes)
      .orderBy(cacServiceTypes.name);

    res.json(formatResponse('success', 200, 'CAC service types retrieved', { services }));
  } catch (error: any) {
    logger.error('Get CAC service types error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get service types'));
  }
});

router.put('/service-types/:id', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;
    const { price, processingDays, isActive } = req.body;

    if (!id) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid service ID'));
    }

    const [existingService] = await db.select()
      .from(cacServiceTypes)
      .where(eq(cacServiceTypes.id, id))
      .limit(1);

    if (!existingService) {
      return res.status(404).json(formatErrorResponse(404, 'Service type not found'));
    }

    const updateData: any = { updatedAt: new Date() };
    
    if (price !== undefined) {
      updateData.price = price.toString();
    }
    if (processingDays !== undefined) {
      updateData.processingDays = processingDays;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const [updated] = await db.update(cacServiceTypes)
      .set(updateData)
      .where(eq(cacServiceTypes.id, id))
      .returning();

    logger.info('CAC service type updated', { agentId, serviceId: id, updates: updateData });

    res.json(formatResponse('success', 200, 'Service type updated successfully', { service: updated }));
  } catch (error: any) {
    logger.error('Update service type error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update service type'));
  }
});

router.post('/service-types', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;
    const { code, name, description, price, processingDays, requiredDocuments } = req.body;

    if (!code || !name || !price) {
      return res.status(400).json(formatErrorResponse(400, 'Code, name, and price are required'));
    }

    const [existing] = await db.select()
      .from(cacServiceTypes)
      .where(eq(cacServiceTypes.code, code))
      .limit(1);

    if (existing) {
      return res.status(400).json(formatErrorResponse(400, 'Service type code already exists'));
    }

    const [newService] = await db.insert(cacServiceTypes).values({
      code,
      name,
      description: description || '',
      price: price.toString(),
      processingDays: processingDays || 7,
      requiredDocuments: requiredDocuments || [],
      isActive: true,
    }).returning();

    logger.info('CAC service type created', { agentId, serviceId: newService.id });

    res.status(201).json(formatResponse('success', 201, 'Service type created successfully', { service: newService }));
  } catch (error: any) {
    logger.error('Create service type error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create service type'));
  }
});

router.delete('/service-types/:id', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;

    if (!id) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid service ID'));
    }

    const [existingService] = await db.select()
      .from(cacServiceTypes)
      .where(eq(cacServiceTypes.id, id))
      .limit(1);

    if (!existingService) {
      return res.status(404).json(formatErrorResponse(404, 'Service type not found'));
    }

    await db.delete(cacServiceTypes)
      .where(eq(cacServiceTypes.id, id));

    logger.info('CAC service type deleted', { agentId, serviceId: id, serviceName: existingService.name });

    res.json(formatResponse('success', 200, 'Service type deleted successfully', { deletedId: id }));
  } catch (error: any) {
    logger.error('Delete service type error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete service type'));
  }
});

router.get('/requests/:id/user-files/:fileType', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, fileType } = req.params;
    const agentId = (req as any).agentId;

    const validFileTypes = ['passport', 'signature', 'nin_slip'];
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid file type. Must be: passport, signature, or nin_slip'));
    }

    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    let fileUrl: string | null = null;
    let fileName = '';

    switch (fileType) {
      case 'passport':
        fileUrl = request.passportPhotoUrl;
        fileName = 'passport_photo';
        break;
      case 'signature':
        fileUrl = request.signatureUrl;
        fileName = 'signature';
        break;
      case 'nin_slip':
        fileUrl = request.ninSlipUrl;
        fileName = 'nin_slip';
        break;
    }

    if (!fileUrl) {
      return res.status(404).json(formatErrorResponse(404, `${fileType} file not uploaded by user`));
    }

    logger.info('CAC agent downloading user file', { agentId, requestId: id, fileType });

    res.json(formatResponse('success', 200, 'File URL retrieved', { 
      fileUrl, 
      fileName,
      fileType 
    }));
  } catch (error: any) {
    logger.error('Download user file error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get file'));
  }
});

router.get('/documents/:docId/download', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const agentId = (req as any).agentId;

    const [document] = await db.select()
      .from(cacRequestDocuments)
      .where(eq(cacRequestDocuments.id, docId))
      .limit(1);

    if (!document) {
      return res.status(404).json(formatErrorResponse(404, 'Document not found'));
    }

    if (!document.fileUrl) {
      return res.status(404).json(formatErrorResponse(404, 'File URL not available'));
    }

    logger.info('CAC agent downloading document', { agentId, documentId: docId, documentType: document.documentType });

    res.json(formatResponse('success', 200, 'Document URL retrieved', { 
      fileUrl: document.fileUrl, 
      fileName: document.fileName,
      documentType: document.documentType,
      mimeType: document.mimeType
    }));
  } catch (error: any) {
    logger.error('Download document error (agent)', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to download document'));
  }
});

export default router;
