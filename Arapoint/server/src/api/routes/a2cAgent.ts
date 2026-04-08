import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authRateLimiter } from '../middleware/rateLimit';
import { db } from '../../config/database';
import { adminUsers, a2cAgents, a2cRequests, a2cPhoneInventory, a2cStatusHistory, users, servicePricing, agentInternalMessages } from '../../db/schema';
import { eq, and, desc, count, sql, isNull, or, gte } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { walletService } from '../../services/walletService';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      adminUserId?: string;
    }
  }
}

const a2cAgentAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatErrorResponse(401, 'No token provided'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.type !== 'a2c_agent') {
      return res.status(403).json(formatErrorResponse(403, 'Invalid token type'));
    }

    const [agent] = await db.select()
      .from(a2cAgents)
      .where(eq(a2cAgents.id, decoded.agentId))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'Agent not found'));
    }

    req.agentId = decoded.agentId;
    req.adminUserId = agent.adminUserId!;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(formatErrorResponse(401, 'Token expired'));
    }
    return res.status(401).json(formatErrorResponse(401, 'Invalid token'));
  }
};

router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Email and password are required'));
    }

    const [adminUser] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!adminUser || !adminUser.passwordHash) {
      return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    }

    const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
    }

    const [agent] = await db.select()
      .from(a2cAgents)
      .where(eq(a2cAgents.adminUserId, adminUser.id))
      .limit(1);

    if (!agent) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized as A2C agent'));
    }

    if (!adminUser.isActive || !agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Account is not active'));
    }

    const accessToken = jwt.sign(
      { agentId: agent.id, adminUserId: adminUser.id, type: 'a2c_agent' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      { agentId: agent.id, adminUserId: adminUser.id, type: 'a2c_agent_refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('A2C agent login successful', { agentId: agent.id, email });

    res.json(formatResponse('success', 200, 'Login successful', {
      accessToken,
      refreshToken,
      agent: {
        id: agent.id,
        name: adminUser.name,
        email: adminUser.email,
        employeeId: agent.employeeId,
        supportedNetworks: agent.supportedNetworks,
      },
    }));
  } catch (error: any) {
    logger.error('A2C agent login error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

router.get('/profile', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [agent] = await db.select({
      id: a2cAgents.id,
      employeeId: a2cAgents.employeeId,
      supportedNetworks: a2cAgents.supportedNetworks,
      maxActiveRequests: a2cAgents.maxActiveRequests,
      currentActiveRequests: a2cAgents.currentActiveRequests,
      totalCompletedRequests: a2cAgents.totalCompletedRequests,
      totalProcessedAmount: a2cAgents.totalProcessedAmount,
      isAvailable: a2cAgents.isAvailable,
      createdAt: a2cAgents.createdAt,
      name: adminUsers.name,
      email: adminUsers.email,
    })
      .from(a2cAgents)
      .leftJoin(adminUsers, eq(a2cAgents.adminUserId, adminUsers.id))
      .where(eq(a2cAgents.id, req.agentId!))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'Agent not found'));
    }

    res.json(formatResponse('success', 200, 'Profile retrieved', { agent }));
  } catch (error: any) {
    logger.error('Get A2C agent profile error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

router.get('/stats', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [pendingCount] = await db.select({ count: count() })
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.assignedAgentId, req.agentId!),
        eq(a2cRequests.status, 'pending')
      ));

    const [awaitingCount] = await db.select({ count: count() })
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.assignedAgentId, req.agentId!),
        eq(a2cRequests.status, 'awaiting_transfer')
      ));

    const [confirmedCount] = await db.select({ count: count() })
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.assignedAgentId, req.agentId!),
        eq(a2cRequests.status, 'confirmed')
      ));

    const [completedCount] = await db.select({ count: count() })
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.assignedAgentId, req.agentId!),
        eq(a2cRequests.status, 'completed')
      ));

    const [agent] = await db.select({
      totalProcessedAmount: a2cAgents.totalProcessedAmount,
      totalCompletedRequests: a2cAgents.totalCompletedRequests,
    })
      .from(a2cAgents)
      .where(eq(a2cAgents.id, req.agentId!))
      .limit(1);

    res.json(formatResponse('success', 200, 'Stats retrieved', {
      pending: pendingCount?.count || 0,
      awaiting: awaitingCount?.count || 0,
      confirmed: confirmedCount?.count || 0,
      completed: completedCount?.count || 0,
      totalProcessedAmount: agent?.totalProcessedAmount || '0',
      totalCompletedRequests: agent?.totalCompletedRequests || 0,
    }));
  } catch (error: any) {
    logger.error('Get A2C agent stats error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get stats'));
  }
});

router.get('/requests', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions: any[] = [eq(a2cRequests.assignedAgentId, req.agentId!)];
    if (status && status !== 'all') {
      whereConditions.push(eq(a2cRequests.status, status as string));
    }

    let requestsQuery = db.select({
      id: a2cRequests.id,
      trackingId: a2cRequests.trackingId,
      network: a2cRequests.network,
      phoneNumber: a2cRequests.phoneNumber,
      airtimeAmount: a2cRequests.airtimeAmount,
      conversionRate: a2cRequests.conversionRate,
      cashAmount: a2cRequests.cashAmount,
      receivingNumber: a2cRequests.receivingNumber,
      bankName: a2cRequests.bankName,
      accountNumber: a2cRequests.accountNumber,
      accountName: a2cRequests.accountName,
      status: a2cRequests.status,
      customerNotes: a2cRequests.customerNotes,
      agentNotes: a2cRequests.agentNotes,
      rejectionReason: a2cRequests.rejectionReason,
      createdAt: a2cRequests.createdAt,
      userConfirmedAt: a2cRequests.userConfirmedAt,
      airtimeReceivedAt: a2cRequests.airtimeReceivedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(a2cRequests)
      .leftJoin(users, eq(a2cRequests.userId, users.id));

    if (whereConditions.length > 0) {
      requestsQuery = requestsQuery.where(and(...whereConditions)) as any;
    }

    const requests = await requestsQuery
      .orderBy(desc(a2cRequests.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    let countQuery = db.select({ count: count() }).from(a2cRequests);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions)) as any;
    }
    const [totalCount] = await countQuery;

    res.json(formatResponse('success', 200, 'Requests retrieved', {
      requests,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount?.count || 0,
      }
    }));
  } catch (error: any) {
    logger.error('Get A2C agent requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.put('/requests/:id/status', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, agentNotes } = req.body;

    const [request] = await db.select()
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.id, id),
        eq(a2cRequests.assignedAgentId, req.agentId!)
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['awaiting_transfer', 'cancelled'],
      awaiting_transfer: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
    };

    if (!validTransitions[request.status]?.includes(status)) {
      return res.status(400).json(formatErrorResponse(400, `Cannot transition from ${request.status} to ${status}`));
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (agentNotes) updateData.agentNotes = agentNotes;
    if (status === 'confirmed') updateData.airtimeReceivedAt = new Date();
    if (status === 'completed') {
      updateData.cashPaidAt = new Date();
      await db.update(a2cAgents)
        .set({
          totalCompletedRequests: sql`${a2cAgents.totalCompletedRequests} + 1`,
          totalProcessedAmount: sql`${a2cAgents.totalProcessedAmount} + ${parseFloat(request.cashAmount)}`,
          currentActiveRequests: sql`GREATEST(${a2cAgents.currentActiveRequests} - 1, 0)`,
        })
        .where(eq(a2cAgents.id, req.agentId!));
    }

    await db.update(a2cRequests)
      .set(updateData)
      .where(eq(a2cRequests.id, id));

    logger.info('A2C request status updated', { requestId: id, status, agentId: req.agentId });

    if (status === 'completed' && request.userId) {
      try {
        const [user] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, request.userId)).limit(1);
        if (user?.email) {
          const { sendEmail } = await import('../../services/emailService');
          await sendEmail(
            user.email,
            'Your Airtime to Cash Request Has Been Completed — Arapoint',
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a7a4a;">Airtime to Cash Completed ✓</h2>
              <p>Dear ${user.name},</p>
              <p>Your airtime to cash request (Tracking ID: <strong>${request.trackingId}</strong>) has been completed and your cash has been paid out.</p>
              ${agentNotes ? `<p><strong>Notes:</strong> ${agentNotes}</p>` : ''}
              <p>Log in to <a href="https://arapoint.com.ng/dashboard">your account</a> to view the details.</p>
              <p style="color:#666;font-size:12px;">This is an automated notification from Arapoint.</p>
            </div>`,
            `Your airtime to cash request (${request.trackingId}) is complete. Log in to view details.`,
            undefined,
            { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
          );
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send A2C completion email', { error: emailErr.message });
      }
    }

    res.json(formatResponse('success', 200, 'Request status updated'));
  } catch (error: any) {
    logger.error('Update A2C request status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request'));
  }
});

router.post('/requests/:id/pickup', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receivingNumber } = req.body;

    if (!receivingNumber) {
      return res.status(400).json(formatErrorResponse(400, 'Receiving number is required'));
    }

    const [request] = await db.select()
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.id, id),
        eq(a2cRequests.status, 'pending')
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found or not available'));
    }

    if (request.assignedAgentId && request.assignedAgentId !== req.agentId) {
      return res.status(403).json(formatErrorResponse(403, 'Request already assigned to another agent'));
    }

    await db.update(a2cRequests)
      .set({
        assignedAgentId: req.agentId!,
        assignedAt: new Date(),
        receivingNumber,
        status: 'awaiting_transfer',
        updatedAt: new Date(),
      })
      .where(eq(a2cRequests.id, id));

    await db.update(a2cAgents)
      .set({
        currentActiveRequests: sql`${a2cAgents.currentActiveRequests} + 1`,
      })
      .where(eq(a2cAgents.id, req.agentId!));

    logger.info('A2C request picked up', { requestId: id, agentId: req.agentId, receivingNumber });

    res.json(formatResponse('success', 200, 'Request picked up', { receivingNumber }));
  } catch (error: any) {
    logger.error('Pickup A2C request error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to pickup request'));
  }
});

router.get('/available-requests', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { network, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions: any[] = [eq(a2cRequests.status, 'pending')];
    if (network && network !== 'all') {
      whereConditions.push(eq(a2cRequests.network, network as string));
    }

    let requestsQuery = db.select({
      id: a2cRequests.id,
      trackingId: a2cRequests.trackingId,
      network: a2cRequests.network,
      phoneNumber: a2cRequests.phoneNumber,
      airtimeAmount: a2cRequests.airtimeAmount,
      conversionRate: a2cRequests.conversionRate,
      cashAmount: a2cRequests.cashAmount,
      customerNotes: a2cRequests.customerNotes,
      createdAt: a2cRequests.createdAt,
    })
      .from(a2cRequests);

    if (whereConditions.length > 0) {
      requestsQuery = requestsQuery.where(and(...whereConditions)) as any;
    }

    const requests = await requestsQuery
      .orderBy(desc(a2cRequests.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json(formatResponse('success', 200, 'Available requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get available A2C requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.get('/conversion-rates', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const rates = await db.select()
      .from(servicePricing)
      .where(sql`${servicePricing.serviceType} LIKE 'a2c_%'`);

    res.json(formatResponse('success', 200, 'Conversion rates retrieved', { rates }));
  } catch (error: any) {
    logger.error('Get A2C conversion rates error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get conversion rates'));
  }
});

// ==================== INVENTORY MANAGEMENT ====================

router.get('/inventory', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const inventory = await db.select()
      .from(a2cPhoneInventory)
      .where(eq(a2cPhoneInventory.agentId, req.agentId!))
      .orderBy(desc(a2cPhoneInventory.createdAt));

    res.json(formatResponse('success', 200, 'Inventory retrieved', { inventory }));
  } catch (error: any) {
    logger.error('Get A2C inventory error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get inventory'));
  }
});

router.post('/inventory', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, network, dailyLimit, label, priority } = req.body;

    if (!phoneNumber || !network) {
      return res.status(400).json(formatErrorResponse(400, 'Phone number and network are required'));
    }

    const validNetworks = ['mtn', 'airtel', 'glo', '9mobile'];
    if (!validNetworks.includes(network.toLowerCase())) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid network'));
    }

    const [existing] = await db.select()
      .from(a2cPhoneInventory)
      .where(and(
        eq(a2cPhoneInventory.agentId, req.agentId!),
        eq(a2cPhoneInventory.phoneNumber, phoneNumber)
      ))
      .limit(1);

    if (existing) {
      return res.status(400).json(formatErrorResponse(400, 'This phone number is already in your inventory'));
    }

    const activeCount = await db.select({ count: count() })
      .from(a2cPhoneInventory)
      .where(and(
        eq(a2cPhoneInventory.agentId, req.agentId!),
        eq(a2cPhoneInventory.isActive, true)
      ));

    if ((activeCount[0]?.count || 0) >= 5) {
      return res.status(400).json(formatErrorResponse(400, 'Maximum 5 active phone numbers allowed'));
    }

    const [newInventory] = await db.insert(a2cPhoneInventory).values({
      agentId: req.agentId!,
      phoneNumber,
      network: network.toLowerCase(),
      dailyLimit: dailyLimit?.toString() || '500000',
      label: label || null,
      priority: priority || 1,
      isActive: true,
    }).returning();

    logger.info('A2C inventory added', { agentId: req.agentId, phoneNumber, network });

    res.json(formatResponse('success', 201, 'Phone number added to inventory', { inventory: newInventory }));
  } catch (error: any) {
    logger.error('Add A2C inventory error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to add phone number'));
  }
});

router.patch('/inventory/:id', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, dailyLimit, label, priority } = req.body;

    const [existing] = await db.select()
      .from(a2cPhoneInventory)
      .where(and(
        eq(a2cPhoneInventory.id, id),
        eq(a2cPhoneInventory.agentId, req.agentId!)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json(formatErrorResponse(404, 'Inventory item not found'));
    }

    if (isActive === false && existing.isActive) {
      const activeCount = await db.select({ count: count() })
        .from(a2cPhoneInventory)
        .where(and(
          eq(a2cPhoneInventory.agentId, req.agentId!),
          eq(a2cPhoneInventory.isActive, true)
        ));
      if ((activeCount[0]?.count || 0) <= 3) {
        return res.status(400).json(formatErrorResponse(400, 'You must keep at least 3 active phone numbers. Add another number before deactivating this one.'));
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (dailyLimit) updateData.dailyLimit = dailyLimit.toString();
    if (label !== undefined) updateData.label = label;
    if (priority) updateData.priority = priority;

    await db.update(a2cPhoneInventory)
      .set(updateData)
      .where(eq(a2cPhoneInventory.id, id));

    logger.info('A2C inventory updated', { agentId: req.agentId, inventoryId: id });

    res.json(formatResponse('success', 200, 'Inventory updated'));
  } catch (error: any) {
    logger.error('Update A2C inventory error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update inventory'));
  }
});

router.delete('/inventory/:id', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(a2cPhoneInventory)
      .where(and(
        eq(a2cPhoneInventory.id, id),
        eq(a2cPhoneInventory.agentId, req.agentId!)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json(formatErrorResponse(404, 'Inventory item not found'));
    }

    if (existing.isActive) {
      const activeCount = await db.select({ count: count() })
        .from(a2cPhoneInventory)
        .where(and(
          eq(a2cPhoneInventory.agentId, req.agentId!),
          eq(a2cPhoneInventory.isActive, true)
        ));
      if ((activeCount[0]?.count || 0) <= 3) {
        return res.status(400).json(formatErrorResponse(400, 'You must keep at least 3 active phone numbers. Deactivate this number or add another before removing it.'));
      }
    }

    await db.delete(a2cPhoneInventory).where(eq(a2cPhoneInventory.id, id));

    logger.info('A2C inventory deleted', { agentId: req.agentId, inventoryId: id });

    res.json(formatResponse('success', 200, 'Phone number removed from inventory'));
  } catch (error: any) {
    logger.error('Delete A2C inventory error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to remove phone number'));
  }
});

router.post('/inventory/:id/reset-daily', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.update(a2cPhoneInventory)
      .set({
        usedToday: '0',
        lastResetDate: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(a2cPhoneInventory.id, id),
        eq(a2cPhoneInventory.agentId, req.agentId!)
      ));

    res.json(formatResponse('success', 200, 'Daily usage reset'));
  } catch (error: any) {
    logger.error('Reset A2C inventory error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to reset daily usage'));
  }
});

// Update request status with audit trail
router.patch('/requests/:id/update-status', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, agentNotes, rejectionReason } = req.body;

    const [request] = await db.select()
      .from(a2cRequests)
      .where(and(
        eq(a2cRequests.id, id),
        or(
          eq(a2cRequests.assignedAgentId, req.agentId!),
          isNull(a2cRequests.assignedAgentId)
        )
      ))
      .limit(1);

    if (!request) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['completed_and_paid', 'not_received_contact_support', 'cancelled'],
      pending_confirmation: ['completed_and_paid', 'not_received_contact_support', 'cancelled'],
      airtime_sent: ['airtime_received', 'rejected'],
      airtime_received: ['processing', 'rejected'],
      processing: ['completed', 'rejected'],
    };

    if (!validTransitions[request.status]?.includes(status)) {
      return res.status(400).json(formatErrorResponse(400, `Cannot transition from ${request.status} to ${status}`));
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (agentNotes) updateData.agentNotes = agentNotes;
    if (status === 'airtime_received') updateData.airtimeReceivedAt = new Date();
    if (status === 'rejected') updateData.rejectionReason = rejectionReason || 'No reason provided';
    if (status === 'not_received_contact_support') updateData.rejectionReason = rejectionReason || 'Not received - contact support';
    
    if (status === 'completed' || status === 'completed_and_paid') {
      updateData.cashPaidAt = new Date();
      await db.update(a2cAgents)
        .set({
          totalCompletedRequests: sql`${a2cAgents.totalCompletedRequests} + 1`,
          totalProcessedAmount: sql`${a2cAgents.totalProcessedAmount} + ${parseFloat(request.cashAmount)}`,
          currentActiveRequests: sql`GREATEST(${a2cAgents.currentActiveRequests} - 1, 0)`,
        })
        .where(eq(a2cAgents.id, req.agentId!));
    }

    await db.update(a2cRequests)
      .set(updateData)
      .where(eq(a2cRequests.id, id));

    await db.insert(a2cStatusHistory).values({
      requestId: id,
      actorType: 'agent',
      actorId: req.agentId,
      previousStatus: request.status,
      newStatus: status,
      note: agentNotes || rejectionReason || null,
    });

    logger.info('A2C request status updated', { requestId: id, previousStatus: request.status, newStatus: status, agentId: req.agentId });

    if (['completed', 'completed_and_paid', 'rejected', 'not_received_contact_support'].includes(status) && request.userId) {
      try {
        const [user] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, request.userId)).limit(1);
        if (user?.email) {
          const { sendEmail } = await import('../../services/emailService');
          if (status === 'completed' || status === 'completed_and_paid') {
            await sendEmail(
              user.email,
              'Your Airtime to Cash Request Has Been Completed — Arapoint',
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a7a4a;">Airtime to Cash Completed ✓</h2>
                <p>Dear ${user.name},</p>
                <p>Your airtime to cash request (Tracking ID: <strong>${request.trackingId}</strong>) has been completed and your cash has been paid out successfully.</p>
                ${agentNotes ? `<p><strong>Notes:</strong> ${agentNotes}</p>` : ''}
                <p>Log in to <a href="https://arapoint.com.ng/dashboard">your account</a> to view the details.</p>
                <p style="color:#666;font-size:12px;">This is an automated notification from Arapoint.</p>
              </div>`,
              `Your airtime to cash request (${request.trackingId}) is complete. Log in to view details.`,
              undefined,
              { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
            );
          } else {
            const { userServiceRejectedEmail } = await import('../../utils/userEmailTemplates');
            const reason = status === 'not_received_contact_support'
              ? (rejectionReason || 'We did not receive the airtime transfer. Please contact support for assistance.')
              : (rejectionReason || agentNotes);
            await sendEmail(
              user.email,
              'Update on Your Airtime to Cash Request — Arapoint',
              userServiceRejectedEmail(user.name, 'Airtime to Cash', request.trackingId, reason),
              undefined, undefined,
              { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
            );
          }
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send A2C status email', { error: emailErr.message });
      }
    }

    res.json(formatResponse('success', 200, 'Request status updated'));
  } catch (error: any) {
    logger.error('Update A2C request status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request'));
  }
});

// =====================================================
// SUPPORT INTERNAL MESSAGES
// =====================================================

router.get('/support-messages', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const messages = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.toDepartment, 'a2c'))
      .orderBy(desc(agentInternalMessages.createdAt))
      .limit(100);
    res.json(formatResponse('success', 200, 'Support messages', { messages }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get support messages'));
  }
});

router.post('/support-messages/:messageId/reply', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const agentId = (req as any).agentId;
    if (!message?.trim()) return res.status(400).json(formatErrorResponse(400, 'Message is required'));

    const [original] = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.id, messageId)).limit(1);
    if (!original) return res.status(404).json(formatErrorResponse(404, 'Message not found'));

    const [agentRecord] = await db.select({ name: adminUsers.name })
      .from(a2cAgents).leftJoin(adminUsers, eq(a2cAgents.adminUserId, adminUsers.id))
      .where(eq(a2cAgents.id, agentId)).limit(1);

    const [reply] = await db.insert(agentInternalMessages).values({
      ticketId: original.ticketId,
      fromType: 'a2c_agent',
      fromId: agentId,
      fromName: agentRecord?.name || 'A2C Agent',
      toDepartment: 'support',
      message: message.trim(),
      linkedOrderId: original.linkedOrderId || null,
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'Reply sent', { message: reply }));
  } catch (error: any) {
    logger.error('A2C agent reply error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send reply'));
  }
});

router.put('/support-messages/mark-read', a2cAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    await db.update(agentInternalMessages)
      .set({ readAt: new Date() })
      .where(and(eq(agentInternalMessages.toDepartment, 'a2c'), isNull(agentInternalMessages.readAt)));
    res.json(formatResponse('success', 200, 'Messages marked as read'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to mark messages as read'));
  }
});

export default router;
