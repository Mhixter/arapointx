import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { 
  jambAgents,
  jambServiceRequests,
  jambRequestDocuments,
  adminUsers,
  users,
  agentInternalMessages,
  sharedFiles,
} from '../../db/schema';
import { eq, desc, count, sql, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { objectStorageService, ObjectNotFoundError } from '../../services/objectStorage';
import { sendEmail } from '../../services/emailService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const AGENT_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'jamb-docs');
fs.mkdirSync(AGENT_UPLOAD_DIR, { recursive: true });

const agentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const jambAgentAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatErrorResponse(401, 'Authentication required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'jamb_agent') {
      return res.status(403).json(formatErrorResponse(403, 'Access denied. JAMB agent role required'));
    }

    const [agent] = await db.select()
      .from(jambAgents)
      .where(eq(jambAgents.id, decoded.agentId))
      .limit(1);

    if (!agent || !agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is inactive'));
    }

    (req as any).agentId = agent.id;
    (req as any).adminUserId = agent.adminUserId;
    next();
  } catch (error: any) {
    logger.error('JAMB agent auth error', { error: error.message });
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
      .from(jambAgents)
      .where(eq(jambAgents.adminUserId, adminUser.id))
      .limit(1);

    if (!agent) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized as JAMB agent'));
    }

    if (!agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is currently inactive'));
    }

    const token = jwt.sign(
      { 
        agentId: agent.id, 
        adminUserId: adminUser.id, 
        email: adminUser.email,
        role: 'jamb_agent' 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, adminUser.id));

    logger.info('JAMB agent login', { agentId: agent.id, email });

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
    logger.error('JAMB agent login error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

router.get('/me', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;

    const [agent] = await db.select({
      id: jambAgents.id,
      employeeId: jambAgents.employeeId,
      specializations: jambAgents.specializations,
      maxActiveRequests: jambAgents.maxActiveRequests,
      currentActiveRequests: jambAgents.currentActiveRequests,
      totalCompletedRequests: jambAgents.totalCompletedRequests,
      isAvailable: jambAgents.isAvailable,
      name: adminUsers.name,
      email: adminUsers.email,
    })
      .from(jambAgents)
      .leftJoin(adminUsers, eq(jambAgents.adminUserId, adminUsers.id))
      .where(eq(jambAgents.id, agentId))
      .limit(1);

    res.json(formatResponse('success', 200, 'Agent profile', { agent }));
  } catch (error: any) {
    logger.error('Get JAMB agent profile error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

router.get('/stats', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [stats] = await db.select({
      pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
      pickup: sql<number>`COUNT(*) FILTER (WHERE status = 'pickup')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
      total: count(),
    }).from(jambServiceRequests);

    res.json(formatResponse('success', 200, 'Stats retrieved', { stats }));
  } catch (error: any) {
    logger.error('Get JAMB stats error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get stats'));
  }
});

router.get('/requests', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = db.select({
      id: jambServiceRequests.id,
      trackingId: jambServiceRequests.trackingId,
      serviceType: jambServiceRequests.serviceType,
      registrationNumber: jambServiceRequests.registrationNumber,
      candidateName: jambServiceRequests.candidateName,
      examYear: jambServiceRequests.examYear,
      requestData: jambServiceRequests.requestData,
      status: jambServiceRequests.status,
      fee: jambServiceRequests.fee,
      isPaid: jambServiceRequests.isPaid,
      customerNotes: jambServiceRequests.customerNotes,
      agentNotes: jambServiceRequests.agentNotes,
      resultUrl: jambServiceRequests.resultUrl,
      createdAt: jambServiceRequests.createdAt,
      userName: users.name,
    })
      .from(jambServiceRequests)
      .leftJoin(users, eq(jambServiceRequests.userId, users.id))
      .orderBy(desc(jambServiceRequests.createdAt));

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(jambServiceRequests.status, status as string));
    } else {
      requests = await query;
    }

    res.json(formatResponse('success', 200, 'Requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get JAMB requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.get('/requests/:id', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select({
      id: jambServiceRequests.id,
      trackingId: jambServiceRequests.trackingId,
      serviceType: jambServiceRequests.serviceType,
      registrationNumber: jambServiceRequests.registrationNumber,
      candidateName: jambServiceRequests.candidateName,
      examYear: jambServiceRequests.examYear,
      requestData: jambServiceRequests.requestData,
      status: jambServiceRequests.status,
      fee: jambServiceRequests.fee,
      isPaid: jambServiceRequests.isPaid,
      customerNotes: jambServiceRequests.customerNotes,
      agentNotes: jambServiceRequests.agentNotes,
      resultUrl: jambServiceRequests.resultUrl,
      resultData: jambServiceRequests.resultData,
      createdAt: jambServiceRequests.createdAt,
      userName: users.name,
    })
      .from(jambServiceRequests)
      .leftJoin(users, eq(jambServiceRequests.userId, users.id))
      .where(eq(jambServiceRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const documents = await db.select()
      .from(jambRequestDocuments)
      .where(eq(jambRequestDocuments.requestId, id))
      .orderBy(desc(jambRequestDocuments.createdAt));

    res.json(formatResponse('success', 200, 'Request details', { request, documents }));
  } catch (error: any) {
    logger.error('Get JAMB request details error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get request details'));
  }
});

router.put('/requests/:id/status', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;
    const { id } = req.params;
    const { status, agentNotes, resultUrl, resultData } = req.body;

    if (!['pending', 'pickup', 'completed'].includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid status'));
    }

    const [request] = await db.select()
      .from(jambServiceRequests)
      .where(eq(jambServiceRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
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
      if (resultUrl) updateData.resultUrl = resultUrl;
      if (resultData) updateData.resultData = resultData;
    }

    if (agentNotes) {
      updateData.agentNotes = agentNotes;
    }

    await db.update(jambServiceRequests)
      .set(updateData)
      .where(eq(jambServiceRequests.id, id));

    logger.info('JAMB request status updated', { requestId: id, status, agentId });

    // Send email notification when completed
    if (status === 'completed') {
      try {
        const [user] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, request.userId)).limit(1);
        if (user?.email) {
          const serviceLabels: Record<string, string> = {
            'olevel-upload': 'O-Level Result Upload',
            'admission-letter': 'Admission Letter',
            'original-result': 'Original JAMB Result',
            'reprinting-caps': 'CAPS Reprinting',
            'check-result': 'JAMB Score Check',
          };
          const serviceName = serviceLabels[request.serviceType] || request.serviceType;
          await sendEmail(
            user.email,
            `Your ${serviceName} Request Has Been Completed — Arapoint`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a7a4a;">JAMB Request Completed ✓</h2>
              <p>Dear ${user.name},</p>
              <p>Your <strong>${serviceName}</strong> request (Tracking ID: <strong>${request.trackingId}</strong>) has been completed by our team.</p>
              ${agentNotes ? `<p><strong>Agent Feedback:</strong> ${agentNotes}</p>` : ''}
              ${resultData ? `<p>Your result/data has been recorded. Please log in to view the details.</p>` : ''}
              <p>Log in to <a href="https://arapoint.com.ng/dashboard/education">your account</a> to view the full details and any uploaded documents.</p>
              <p style="color:#666;font-size:12px;">This is an automated notification from Arapoint.</p>
            </div>`,
            `Your ${serviceName} request (${request.trackingId}) has been completed. Log in to your Arapoint account to view details.`
          );
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send JAMB completion email', { error: emailErr.message });
      }
    }

    res.json(formatResponse('success', 200, 'Request updated'));
  } catch (error: any) {
    logger.error('Update JAMB request error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request'));
  }
});

router.post('/requests/:id/upload', jambAgentAuthMiddleware, agentUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;
    const { id } = req.params;

    const [request] = await db.select()
      .from(jambServiceRequests)
      .where(eq(jambServiceRequests.id, id))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    if (!req.file) {
      return res.status(400).json(formatErrorResponse(400, 'No file uploaded'));
    }

    const ext = path.extname(req.file.originalname) || '';
    let fileKey: string;

    // Try object storage first; fall back to local disk
    const objectPath = await objectStorageService.uploadBuffer(
      req.file.buffer,
      req.file.mimetype || 'application/octet-stream',
      'jamb-docs',
      ext
    );

    if (objectPath) {
      fileKey = objectPath;
    } else {
      const filename = `${randomUUID()}${ext}`;
      const localPath = path.join(AGENT_UPLOAD_DIR, filename);
      fs.writeFileSync(localPath, req.file.buffer);
      fileKey = `uploads/jamb-docs/${filename}`;
    }

    const [doc] = await db.insert(jambRequestDocuments).values({
      requestId: id,
      uploadedBy: agentId,
      uploaderRole: 'agent',
      fileType: req.file.mimetype || 'application/octet-stream',
      fileName: req.file.originalname,
      fileKey,
      fileSize: req.file.size,
      isResult: true,
    }).returning();

    // Share this result with the user permanently (no expiry, no token)
    if (request.userId) {
      const serviceLabels: Record<string, string> = {
        'olevel-upload': 'O-Level Result',
        'admission-letter': 'Admission Letter',
        'original-result': 'JAMB Original Result',
        'reprinting-caps': 'CAPS Reprint',
        'check-result': 'JAMB Score',
      };
      db.insert(sharedFiles).values({
        uploadedByUserId: request.userId,
        uploaderRole: 'agent',
        fileKey,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype || 'application/octet-stream',
        fileSize: req.file.size,
        relatedRequestId: id,
        relatedRequestType: 'jamb',
        accessibleTo: 'user',
        description: `${serviceLabels[request.serviceType] || 'JAMB result'} — delivered by agent (Ref: ${request.trackingId})`,
      }).catch(e => logger.warn('Failed to sync JAMB doc to shared_files', { error: e.message }));
    }

    logger.info('JAMB agent document uploaded', { agentId, requestId: id, fileName: req.file.originalname, storage: fileKey.startsWith('/objects/') ? 'object' : 'disk' });
    res.json(formatResponse('success', 200, 'Document uploaded successfully', { document: doc }));
  } catch (error: any) {
    logger.error('JAMB agent upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to upload document'));
  }
});

router.get('/documents/:docId/download', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;

    const [doc] = await db.select()
      .from(jambRequestDocuments)
      .where(eq(jambRequestDocuments.id, docId))
      .limit(1);

    if (!doc) {
      return res.status(404).json(formatErrorResponse(404, 'Document not found'));
    }

    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName || 'document'}"`);

    // Serve from object storage if stored there
    if (doc.fileKey.startsWith('/objects/')) {
      try {
        const file = await objectStorageService.getObjectEntityFile(doc.fileKey);
        await objectStorageService.downloadObject(file, res);
      } catch (storageErr: any) {
        if (storageErr instanceof ObjectNotFoundError) {
          return res.status(404).json(formatErrorResponse(404, 'File not found in storage'));
        }
        throw storageErr;
      }
      return;
    }

    // Fall back to local disk
    const relativeKey = doc.fileKey.replace(/^\//, '');
    const localPath = path.join(process.cwd(), relativeKey);
    if (!fs.existsSync(localPath)) {
      return res.status(404).json(formatErrorResponse(404, 'File not found on server'));
    }
    res.sendFile(localPath, (sendErr) => {
      if (sendErr && !res.headersSent) {
        logger.error('Send JAMB file error', { error: sendErr.message, localPath });
        res.status(500).json(formatErrorResponse(500, 'Failed to send file'));
      }
    });
  } catch (error: any) {
    logger.error('Download JAMB document error', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json(formatErrorResponse(500, 'Failed to download document'));
    }
  }
});

// =====================================================
// SUPPORT INTERNAL MESSAGES
// =====================================================

router.get('/support-messages', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const messages = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.toDepartment, 'jamb'))
      .orderBy(desc(agentInternalMessages.createdAt))
      .limit(100);
    res.json(formatResponse('success', 200, 'Support messages', { messages }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get support messages'));
  }
});

router.post('/support-messages/:messageId/reply', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const agentId = (req as any).agentId;
    if (!message?.trim()) return res.status(400).json(formatErrorResponse(400, 'Message is required'));

    const [original] = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.id, messageId)).limit(1);
    if (!original) return res.status(404).json(formatErrorResponse(404, 'Message not found'));

    const [agentRecord] = await db.select({ name: adminUsers.name })
      .from(jambAgents).leftJoin(adminUsers, eq(jambAgents.adminUserId, adminUsers.id))
      .where(eq(jambAgents.id, agentId)).limit(1);

    const [reply] = await db.insert(agentInternalMessages).values({
      ticketId: original.ticketId,
      fromType: 'jamb_agent',
      fromId: agentId,
      fromName: agentRecord?.name || 'JAMB Agent',
      toDepartment: 'support',
      message: message.trim(),
      linkedOrderId: original.linkedOrderId || null,
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'Reply sent', { message: reply }));
  } catch (error: any) {
    logger.error('JAMB agent reply error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send reply'));
  }
});

router.put('/support-messages/mark-read', jambAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    await db.update(agentInternalMessages)
      .set({ readAt: new Date() })
      .where(and(eq(agentInternalMessages.toDepartment, 'jamb'), isNull(agentInternalMessages.readAt)));
    res.json(formatResponse('success', 200, 'Messages marked as read'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to mark messages as read'));
  }
});

export default router;
