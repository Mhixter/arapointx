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
  users,
  agentInternalMessages,
  sharedFiles,
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
    const agentId = (req as any).agentId;

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

    // Authorization check: agent must be assigned to this request or request must be unassigned (for viewing before assignment)
    const isAssigned = request.request.assignedAgentId === agentId;
    const isUnassigned = !request.request.assignedAgentId;
    
    if (!isAssigned && !isUnassigned) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized to access this request'));
    }

    const documents = await db.select()
      .from(cacRequestDocuments)
      .where(eq(cacRequestDocuments.requestId, id));

    const activity = await db.select()
      .from(cacRequestActivity)
      .where(eq(cacRequestActivity.requestId, id))
      .orderBy(desc(cacRequestActivity.createdAt));

    // Only include file URLs if agent is assigned - hide sensitive data from unassigned agents
    const safeDocuments = isAssigned 
      ? documents 
      : documents.map(doc => ({ ...doc, fileUrl: undefined }));

    const safeRequest = isAssigned 
      ? request.request 
      : {
          ...request.request,
          passportPhotoUrl: undefined,
          signatureUrl: undefined,
          ninSlipUrl: undefined,
        };

    res.json(formatResponse('success', 200, 'Request details retrieved', {
      ...safeRequest,
      customer: {
        name: request.userName,
        email: request.userEmail,
        phone: request.userPhone,
      },
      documents: safeDocuments,
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

      // Only update agent counters when transitioning TO completed for the first time
      if (previousStatus !== CAC_STATUS.COMPLETED) {
        await db.update(cacAgents)
          .set({
            currentActiveRequests: sql`GREATEST(${cacAgents.currentActiveRequests} - 1, 0)`,
            totalCompletedRequests: sql`${cacAgents.totalCompletedRequests} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(cacAgents.id, agentId));
      }

      // Share result files with the user via shared_files (skip if already shared)
      if (certificateUrl && request.userId) {
        const [existingCert] = await db.select({ id: sharedFiles.id })
          .from(sharedFiles)
          .where(and(eq(sharedFiles.fileKey, certificateUrl), eq(sharedFiles.relatedRequestId, id)))
          .limit(1);
        if (!existingCert) {
          db.insert(sharedFiles).values({
            uploadedByUserId: request.userId,
            uploaderRole: 'agent',
            fileKey: certificateUrl,
            fileName: `CAC Certificate - ${request.businessName || 'Registration'}.pdf`,
            mimeType: 'application/pdf',
            relatedRequestId: id,
            relatedRequestType: 'cac',
            accessibleTo: 'user',
            description: `CAC registration certificate for ${request.businessName || 'your business'} (RC: ${cacRegistrationNumber || 'N/A'})`,
          }).catch(e => logger.warn('Failed to sync CAC cert to shared_files', { error: e.message }));
        }
      }
      if (statusReportUrl && request.userId) {
        const [existingReport] = await db.select({ id: sharedFiles.id })
          .from(sharedFiles)
          .where(and(eq(sharedFiles.fileKey, statusReportUrl), eq(sharedFiles.relatedRequestId, id)))
          .limit(1);
        if (!existingReport) {
          db.insert(sharedFiles).values({
            uploadedByUserId: request.userId,
            uploaderRole: 'agent',
            fileKey: statusReportUrl,
            fileName: `CAC Status Report - ${request.businessName || 'Registration'}.pdf`,
            mimeType: 'application/pdf',
            relatedRequestId: id,
            relatedRequestType: 'cac',
            accessibleTo: 'user',
            description: `CAC status report for ${request.businessName || 'your business'}`,
          }).catch(e => logger.warn('Failed to sync CAC status report to shared_files', { error: e.message }));
        }
      }

      // Send completion email to the user who submitted this request
      const [requestRow] = await db.select({
        businessName: cacRegistrationRequests.businessName,
        serviceType: cacRegistrationRequests.serviceType,
        userId: cacRegistrationRequests.userId,
        userEmail: users.email,
        userName: users.name,
      })
        .from(cacRegistrationRequests)
        .leftJoin(users, eq(cacRegistrationRequests.userId, users.id))
        .where(eq(cacRegistrationRequests.id, id))
        .limit(1);

      if (requestRow?.userEmail) {
        const { sendEmail } = await import('../../services/emailService');
        await sendEmail(
          requestRow.userEmail,
          'Your CAC Registration Has Been Completed',
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #15803d, #22c55e); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">CAC Registration Complete</h1>
            </div>
            <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
              <p style="color: #374151; font-size: 16px;">Dear ${requestRow.userName || 'Valued Customer'},</p>
              <p style="color: #374151;">Your CAC registration for <strong>${requestRow.businessName || 'your business'}</strong> has been completed successfully.</p>
              <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #15803d; font-weight: bold;">✓ Registration Number: ${cacRegistrationNumber || 'N/A'}</p>
                <p style="margin: 8px 0 0; color: #15803d;">Service Type: ${requestRow.serviceType || 'N/A'}</p>
                ${certificateUrl ? `<p style="margin: 8px 0 0;"><a href="${certificateUrl}" style="color: #1d4ed8;">Download Certificate</a></p>` : ''}
              </div>
              <p style="color: #6b7280; font-size: 14px;">Log in to your Arapoint dashboard to view your registration documents.</p>
              <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Thank you for choosing Arapoint!</p>
            </div>
          </div>
          `,
        ).catch(err => logger.error('CAC completion email failed', { error: err.message }));
      }
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

    if (status === CAC_STATUS.REJECTED && request.userId) {
      try {
        const [userRow] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, request.userId)).limit(1);
        if (userRow?.email) {
          const { sendEmail } = await import('../../services/emailService');
          const { userServiceRejectedEmail } = await import('../../utils/userEmailTemplates');
          await sendEmail(
            userRow.email,
            'Update on Your CAC Registration Request — Arapoint',
            userServiceRejectedEmail(
              userRow.name || 'Valued Customer',
              `CAC ${request.serviceType || 'Registration'}`,
              request.id,
              rejectionReason,
            ),
            undefined, undefined,
            { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
          );
        }
      } catch (emailErr: any) {
        logger.error('CAC rejection email failed', { error: emailErr.message });
      }
    }

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

    const isValidUrl = fileUrl.startsWith('/objects/') || fileUrl.startsWith('/uploads/') || (() => {
      try {
        const u = new URL(fileUrl);
        return ['http:', 'https:'].includes(u.protocol);
      } catch { return false; }
    })();
    if (!isValidUrl) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid file URL format'));
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

    // Upsert: update existing document record if one already exists for this type
    const [existingDoc] = await db.select()
      .from(cacRequestDocuments)
      .where(and(
        eq(cacRequestDocuments.requestId, id),
        eq(cacRequestDocuments.documentType, documentType)
      ))
      .limit(1);

    let document;
    if (existingDoc) {
      [document] = await db.update(cacRequestDocuments)
        .set({ fileName, fileUrl, fileSize: fileSize || 0, mimeType: mimeType || 'application/pdf', verifiedBy: agentId, verifiedAt: new Date(), isVerified: true })
        .where(eq(cacRequestDocuments.id, existingDoc.id))
        .returning();
    } else {
      [document] = await db.insert(cacRequestDocuments).values({
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
    }

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

    // Share this document with the user permanently (skip if already shared)
    if (request.userId) {
      const docTypeLabel: Record<string, string> = {
        cac_certificate: 'CAC Certificate',
        status_report: 'CAC Status Report',
        incorporation_document: 'Incorporation Document',
        other: 'CAC Document',
      };
      const [existingShared] = await db.select({ id: sharedFiles.id })
        .from(sharedFiles)
        .where(and(eq(sharedFiles.fileKey, fileUrl), eq(sharedFiles.relatedRequestId, id)))
        .limit(1);
      if (!existingShared) {
        db.insert(sharedFiles).values({
          uploadedByUserId: request.userId,
          uploaderRole: 'agent',
          fileKey: fileUrl,
          fileName: fileName,
          mimeType: mimeType || 'application/pdf',
          fileSize: fileSize || null,
          relatedRequestId: id,
          relatedRequestType: 'cac',
          accessibleTo: 'user',
          description: `${docTypeLabel[documentType] || 'CAC Document'} — uploaded by agent`,
        }).catch(e => logger.warn('Failed to sync CAC doc to shared_files', { error: e.message }));
      }
    }

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

    // Authorization check: agent must be assigned to this request
    if (request.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized to access files for this request'));
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

    // Authorization check: verify agent is assigned to the request this document belongs to
    const [request] = await db.select()
      .from(cacRegistrationRequests)
      .where(eq(cacRegistrationRequests.id, document.requestId))
      .limit(1);

    if (!request || request.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized to access this document'));
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

// =====================================================
// SUPPORT INTERNAL MESSAGES
// =====================================================

router.get('/support-messages', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const messages = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.toDepartment, 'cac'))
      .orderBy(desc(agentInternalMessages.createdAt))
      .limit(100);
    res.json(formatResponse('success', 200, 'Support messages', { messages }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get support messages'));
  }
});

router.post('/support-messages/:messageId/reply', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const agentId = (req as any).agentId;
    if (!message?.trim()) return res.status(400).json(formatErrorResponse(400, 'Message is required'));

    const [original] = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.id, messageId)).limit(1);
    if (!original) return res.status(404).json(formatErrorResponse(404, 'Message not found'));

    const [agentRecord] = await db.select({ name: adminUsers.name })
      .from(cacAgents).leftJoin(adminUsers, eq(cacAgents.adminUserId, adminUsers.id))
      .where(eq(cacAgents.id, agentId)).limit(1);

    const [reply] = await db.insert(agentInternalMessages).values({
      ticketId: original.ticketId,
      fromType: 'cac_agent',
      fromId: agentId,
      fromName: agentRecord?.name || 'CAC Agent',
      toDepartment: 'support',
      message: message.trim(),
      linkedOrderId: original.linkedOrderId || null,
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'Reply sent', { message: reply }));
  } catch (error: any) {
    logger.error('CAC agent reply error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send reply'));
  }
});

router.put('/support-messages/mark-read', cacAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    await db.update(agentInternalMessages)
      .set({ readAt: new Date() })
      .where(and(eq(agentInternalMessages.toDepartment, 'cac'), isNull(agentInternalMessages.readAt)));
    res.json(formatResponse('success', 200, 'Messages marked as read'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to mark messages as read'));
  }
});

export default router;
