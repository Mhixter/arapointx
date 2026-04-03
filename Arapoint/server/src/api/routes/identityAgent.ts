import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { 
  identityAgents,
  identityServiceRequests, 
  identityRequestActivity,
  adminUsers,
  users,
  servicePricing,
  agentInternalMessages,
  sharedFiles,
} from '../../db/schema';
import { eq, desc, count, and, sql, isNull, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { pricingService } from '../../services/pricingService';
import { walletService } from '../../services/walletService';
import { sendEmail } from '../../services/emailService';
import { ObjectStorageService } from '../../services/objectStorage';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const identityAgentAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatErrorResponse(401, 'Authentication required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'identity_agent') {
      return res.status(403).json(formatErrorResponse(403, 'Access denied. Identity agent role required'));
    }

    const [agent] = await db.select()
      .from(identityAgents)
      .where(eq(identityAgents.id, decoded.agentId))
      .limit(1);

    if (!agent || !agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is inactive'));
    }

    (req as any).agentId = agent.id;
    (req as any).adminUserId = agent.adminUserId;
    next();
  } catch (error: any) {
    logger.error('Identity agent auth error', { error: error.message });
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
      .from(identityAgents)
      .where(eq(identityAgents.adminUserId, adminUser.id))
      .limit(1);

    if (!agent) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized as Identity agent'));
    }

    if (!agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is currently inactive'));
    }

    const token = jwt.sign(
      { 
        agentId: agent.id, 
        adminUserId: adminUser.id, 
        email: adminUser.email,
        role: 'identity_agent' 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, adminUser.id));

    logger.info('Identity agent login', { agentId: agent.id, email });

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
    logger.error('Identity agent login error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

router.get('/me', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;

    const [agent] = await db.select({
      id: identityAgents.id,
      employeeId: identityAgents.employeeId,
      specializations: identityAgents.specializations,
      maxActiveRequests: identityAgents.maxActiveRequests,
      currentActiveRequests: identityAgents.currentActiveRequests,
      totalCompletedRequests: identityAgents.totalCompletedRequests,
      isAvailable: identityAgents.isAvailable,
      name: adminUsers.name,
      email: adminUsers.email,
    })
      .from(identityAgents)
      .leftJoin(adminUsers, eq(identityAgents.adminUserId, adminUsers.id))
      .where(eq(identityAgents.id, agentId))
      .limit(1);

    res.json(formatResponse('success', 200, 'Agent profile', { agent }));
  } catch (error: any) {
    logger.error('Get identity agent profile error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

router.get('/stats', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [stats] = await db.select({
      pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
      pickup: sql<number>`COUNT(*) FILTER (WHERE status = 'pickup')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
      total: count(),
    }).from(identityServiceRequests)
    .where(ne(identityServiceRequests.serviceType, 'birth_attestation'));

    res.json(formatResponse('success', 200, 'Stats retrieved', { stats }));
  } catch (error: any) {
    logger.error('Get identity stats error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get stats'));
  }
});

router.get('/requests', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = db.select({
      id: identityServiceRequests.id,
      trackingId: identityServiceRequests.trackingId,
      serviceType: identityServiceRequests.serviceType,
      nin: identityServiceRequests.nin,
      newTrackingId: identityServiceRequests.newTrackingId,
      updateFields: identityServiceRequests.updateFields,
      status: identityServiceRequests.status,
      isPaid: identityServiceRequests.isPaid,
      customerNotes: identityServiceRequests.customerNotes,
      agentNotes: identityServiceRequests.agentNotes,
      slipUrl: identityServiceRequests.slipUrl,
      resolvedTrackingId: identityServiceRequests.resolvedTrackingId,
      validatedFullName: identityServiceRequests.validatedFullName,
      validatedDateOfBirth: identityServiceRequests.validatedDateOfBirth,
      createdAt: identityServiceRequests.createdAt,
      userName: users.name,
    })
      .from(identityServiceRequests)
      .leftJoin(users, eq(identityServiceRequests.userId, users.id))
      .orderBy(desc(identityServiceRequests.createdAt));

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(and(
        ne(identityServiceRequests.serviceType, 'birth_attestation'),
        eq(identityServiceRequests.status, status as string)
      ));
    } else {
      requests = await query.where(ne(identityServiceRequests.serviceType, 'birth_attestation'));
    }

    res.json(formatResponse('success', 200, 'Requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get identity requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.put('/requests/:id/status', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;
    const { id } = req.params;
    const { status, agentNotes, slipUrl, resolvedTrackingId, validatedFullName, validatedDateOfBirth } = req.body;

    if (!['pending', 'pickup', 'completed'].includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid status'));
    }

    const [request] = await db.select()
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (request.serviceType === 'birth_attestation') {
      return res.status(403).json(formatErrorResponse(403, 'Birth attestation requests are processed by admin only'));
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'pickup' && !request.assignedAgentId) {
      updateData.assignedAgentId = agentId;
      updateData.assignedAt = new Date();
    }

    if (status === 'completed') {
      updateData.completedAt = new Date();
      if (slipUrl) updateData.slipUrl = slipUrl;
      if (resolvedTrackingId) updateData.resolvedTrackingId = resolvedTrackingId;
      if (validatedFullName) updateData.validatedFullName = validatedFullName;
      if (validatedDateOfBirth) updateData.validatedDateOfBirth = validatedDateOfBirth;
    }

    if (agentNotes) {
      updateData.agentNotes = agentNotes;
    }

    await db.update(identityServiceRequests)
      .set(updateData)
      .where(eq(identityServiceRequests.id, id));

    await db.insert(identityRequestActivity).values({
      requestId: id,
      actorType: 'agent',
      actorId: agentId,
      action: `status_changed_to_${status}`,
      previousStatus: request.status,
      newStatus: status,
      comment: agentNotes,
    });

    // Share slip file with the user permanently if provided
    if (status === 'completed' && slipUrl && request.userId) {
      const serviceLabels: Record<string, string> = {
        nin_validation: 'NIN Validation',
        ipe_clearance: 'IPE Clearance',
        nin_personalization: 'NIN Personalization',
      };
      const serviceLabel = serviceLabels[request.serviceType] || 'Identity Service';
      db.insert(sharedFiles).values({
        uploadedByUserId: request.userId,
        uploaderRole: 'agent',
        fileKey: slipUrl,
        fileName: `${serviceLabel} Result - ${request.trackingId}.pdf`,
        mimeType: 'application/pdf',
        relatedRequestId: id,
        relatedRequestType: 'identity',
        accessibleTo: 'user',
        description: `${serviceLabel} result slip — delivered by agent (Ref: ${request.trackingId})`,
      }).catch(e => logger.warn('Failed to sync identity slip to shared_files', { error: e.message }));
    }

    logger.info('Identity request status updated', { requestId: id, status, agentId });

    // Send email notification when completed
    if (status === 'completed') {
      try {
        const [user] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, request.userId)).limit(1);
        if (user?.email) {
          const serviceLabels: Record<string, string> = {
            nin_validation: 'NIN Validation',
            ipe_clearance: 'IPE Clearance',
            nin_personalization: 'NIN Personalization',
          };
          const serviceName = serviceLabels[request.serviceType] || request.serviceType;
          const newTid = resolvedTrackingId || '';
          await sendEmail(
            user.email,
            `Your ${serviceName} Request Has Been Completed — Arapoint`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a7a4a;">Request Completed ✓</h2>
              <p>Dear ${user.name},</p>
              <p>Your <strong>${serviceName}</strong> request (Tracking ID: <strong>${request.trackingId}</strong>) has been completed by our team.</p>
              ${newTid ? `<p>Your new NIMC Tracking ID is: <strong style="font-size:18px;color:#1a7a4a;">${newTid}</strong></p>` : ''}
              ${agentNotes ? `<p><strong>Agent Feedback:</strong> ${agentNotes}</p>` : ''}
              ${slipUrl ? `<p>Your completed document is available. Please log in to your Arapoint account to download it.</p>` : ''}
              <p>Log in to <a href="https://arapoint.com.ng/dashboard/identity">your account</a> to view the full details.</p>
              <p style="color:#666;font-size:12px;">This is an automated notification from Arapoint.</p>
            </div>`,
            `Your ${serviceName} request (${request.trackingId}) has been completed. ${newTid ? `New tracking ID: ${newTid}.` : ''} Log in to view details.`
          );
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send identity completion email', { error: emailErr.message });
      }
    } else if (status === 'rejected') {
      try {
        const [user] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, request.userId)).limit(1);
        if (user?.email) {
          const serviceLabels: Record<string, string> = {
            nin_validation: 'NIN Validation',
            ipe_clearance: 'IPE Clearance',
            nin_personalization: 'NIN Personalization',
          };
          const serviceName = serviceLabels[request.serviceType] || request.serviceType;
          const { userServiceRejectedEmail } = await import('../../utils/userEmailTemplates');
          await sendEmail(
            user.email,
            `Update on Your ${serviceName} Request — Arapoint`,
            userServiceRejectedEmail(user.name, serviceName, request.trackingId, agentNotes),
            undefined, undefined,
            { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
          );
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send identity rejection email', { error: emailErr.message });
      }
    }

    res.json(formatResponse('success', 200, 'Request updated'));
  } catch (error: any) {
    logger.error('Update identity request error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request'));
  }
});

const objectStorage = new ObjectStorageService();

router.post('/upload-url', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { uploadURL, objectPath } = await objectStorage.getObjectEntityUploadURL('identity-slips');
    res.json({ uploadURL, objectPath });
  } catch (error: any) {
    logger.error('Agent upload URL error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get upload URL'));
  }
});

router.get('/requests/:id/slip-download', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [request] = await db.select({ slipUrl: identityServiceRequests.slipUrl })
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.id, id))
      .limit(1);
    if (!request?.slipUrl) {
      return res.status(404).json(formatErrorResponse(404, 'No slip file available for this request'));
    }
    const file = await objectStorage.getObjectEntityFile(request.slipUrl);
    await objectStorage.downloadObject(file, res);
  } catch (error: any) {
    logger.error('Slip download error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to download slip'));
  }
});

// ============================================================
// User-facing routes (regular user auth, not agent auth)
// ============================================================

const MANUAL_SERVICE_TYPES = ['nin_validation', 'ipe_clearance', 'nin_personalization'];

router.get('/manual-services', authMiddleware, async (req: Request, res: Response) => {
  try {
    const services = [];
    for (const serviceType of MANUAL_SERVICE_TYPES) {
      const pricing = await pricingService.getPricing(serviceType);
      if (pricing.isActive) {
        services.push({
          serviceType: pricing.serviceType,
          serviceName: pricing.serviceName,
          price: pricing.price,
          description: pricing.description,
        });
      }
    }
    res.json(formatResponse('success', 200, 'Services retrieved', { services }));
  } catch (error: any) {
    logger.error('Get manual services error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get services'));
  }
});

router.get('/my-requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const requests = await db.select({
      id: identityServiceRequests.id,
      trackingId: identityServiceRequests.trackingId,
      serviceType: identityServiceRequests.serviceType,
      nin: identityServiceRequests.nin,
      newTrackingId: identityServiceRequests.newTrackingId,
      updateFields: identityServiceRequests.updateFields,
      status: identityServiceRequests.status,
      fee: identityServiceRequests.fee,
      isPaid: identityServiceRequests.isPaid,
      customerNotes: identityServiceRequests.customerNotes,
      agentNotes: identityServiceRequests.agentNotes,
      slipUrl: identityServiceRequests.slipUrl,
      resolvedTrackingId: identityServiceRequests.resolvedTrackingId,
      validatedFullName: identityServiceRequests.validatedFullName,
      validatedDateOfBirth: identityServiceRequests.validatedDateOfBirth,
      createdAt: identityServiceRequests.createdAt,
      updatedAt: identityServiceRequests.updatedAt,
    })
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.userId, userId))
      .orderBy(desc(identityServiceRequests.createdAt));

    res.json(formatResponse('success', 200, 'Requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get user identity requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.post('/request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { serviceType, nin, newTrackingId, updateFields, customerNotes, validationType, slipType } = req.body;

    if (!serviceType || !MANUAL_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid service type'));
    }

    if (!nin || !/^\d{11}$/.test(nin)) {
      return res.status(400).json(formatErrorResponse(400, 'Valid 11-digit NIN is required'));
    }

    if (serviceType === 'nin_validation' && !validationType) {
      return res.status(400).json(formatErrorResponse(400, 'Validation type is required for NIN Validation'));
    }

    const price = await pricingService.getPrice(serviceType);
    await walletService.deductBalance(userId, price, `Identity Service: ${serviceType}`);

    const trackingId = `ISR-${Date.now().toString(36).toUpperCase()}`;

    const updateFieldsData: any = {};
    if (validationType) updateFieldsData.validationType = validationType;
    if (slipType) updateFieldsData.slipType = slipType;
    if (updateFields) updateFieldsData.fields = updateFields;

    const [request] = await db.insert(identityServiceRequests).values({
      userId,
      trackingId,
      serviceType,
      nin,
      newTrackingId: newTrackingId || null,
      updateFields: Object.keys(updateFieldsData).length > 0 ? updateFieldsData : null,
      fee: price.toFixed(2),
      isPaid: true,
      customerNotes: customerNotes || null,
    }).returning();

    await db.insert(identityRequestActivity).values({
      requestId: request.id,
      actorType: 'user',
      actorId: userId,
      action: 'request_created',
      newStatus: 'pending',
      comment: `User submitted ${serviceType} request`,
    });

    logger.info('Identity service request created', { userId, trackingId, serviceType });

    res.json(formatResponse('success', 200, 'Request submitted successfully', { request }));
  } catch (error: any) {
    logger.error('Create identity request error', { error: error.message, userId: req.userId });

    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }

    res.status(500).json(formatErrorResponse(500, 'Failed to submit request'));
  }
});

// =====================================================
// SUPPORT INTERNAL MESSAGES
// =====================================================

router.get('/support-messages', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const messages = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.toDepartment, 'identity'))
      .orderBy(desc(agentInternalMessages.createdAt))
      .limit(100);
    res.json(formatResponse('success', 200, 'Support messages', { messages }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get support messages'));
  }
});

router.post('/support-messages/:messageId/reply', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const agentId = (req as any).agentId;
    if (!message?.trim()) return res.status(400).json(formatErrorResponse(400, 'Message is required'));

    const [original] = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.id, messageId)).limit(1);
    if (!original) return res.status(404).json(formatErrorResponse(404, 'Message not found'));

    const [agentRecord] = await db.select({ name: adminUsers.name })
      .from(identityAgents).leftJoin(adminUsers, eq(identityAgents.adminUserId, adminUsers.id))
      .where(eq(identityAgents.id, agentId)).limit(1);

    const [reply] = await db.insert(agentInternalMessages).values({
      ticketId: original.ticketId,
      fromType: 'identity_agent',
      fromId: agentId,
      fromName: agentRecord?.name || 'Identity Agent',
      toDepartment: 'support',
      message: message.trim(),
      linkedOrderId: original.linkedOrderId || null,
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'Reply sent', { message: reply }));
  } catch (error: any) {
    logger.error('Identity agent reply error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send reply'));
  }
});

router.put('/support-messages/mark-read', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    await db.update(agentInternalMessages)
      .set({ readAt: new Date() })
      .where(and(eq(agentInternalMessages.toDepartment, 'identity'), isNull(agentInternalMessages.readAt)));
    res.json(formatResponse('success', 200, 'Messages marked as read'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to mark messages as read'));
  }
});

export default router;
