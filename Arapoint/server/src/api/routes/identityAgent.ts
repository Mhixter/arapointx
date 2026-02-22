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
  servicePricing
} from '../../db/schema';
import { eq, desc, count, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { pricingService } from '../../services/pricingService';
import { walletService } from '../../services/walletService';
import { objectStorageService } from '../../services/objectStorage';

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
    }).from(identityServiceRequests);

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
      createdAt: identityServiceRequests.createdAt,
      userName: users.name,
    })
      .from(identityServiceRequests)
      .leftJoin(users, eq(identityServiceRequests.userId, users.id))
      .orderBy(desc(identityServiceRequests.createdAt));

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(identityServiceRequests.status, status as string));
    } else {
      requests = await query;
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
    const { status, agentNotes, slipUrl } = req.body;

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
      if (slipUrl) {
        updateData.slipUrl = slipUrl;
      }
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

    logger.info('Identity request status updated', { requestId: id, status, agentId });

    res.json(formatResponse('success', 200, 'Request updated'));
  } catch (error: any) {
    logger.error('Update identity request error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request'));
  }
});

router.post('/upload-url', identityAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await objectStorageService.getObjectEntityUploadURL('identity-slips');
    res.json(result);
  } catch (error: any) {
    logger.error('Agent upload URL error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get upload URL'));
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
    const requests = await db.select()
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
    const { serviceType, nin, newTrackingId, updateFields, customerNotes } = req.body;

    if (!serviceType || !MANUAL_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid service type'));
    }

    if (!nin || !/^\d{11}$/.test(nin)) {
      return res.status(400).json(formatErrorResponse(400, 'Valid 11-digit NIN is required'));
    }

    const price = await pricingService.getPrice(serviceType);
    await walletService.deductBalance(userId, price, `Identity Service: ${serviceType}`);

    const trackingId = `ISR-${Date.now().toString(36).toUpperCase()}`;

    const [request] = await db.insert(identityServiceRequests).values({
      userId,
      trackingId,
      serviceType,
      nin,
      newTrackingId: newTrackingId || null,
      updateFields: updateFields ? { fields: updateFields } : null,
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

export default router;
