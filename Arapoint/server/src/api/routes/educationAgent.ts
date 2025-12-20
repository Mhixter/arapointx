import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { 
  educationAgents,
  educationServiceRequests, 
  adminUsers,
  users,
  educationPins,
  educationPinOrders,
  servicePricing
} from '../../db/schema';
import { eq, desc, count, sql, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

const educationAgentAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatErrorResponse(401, 'Authentication required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'education_agent') {
      return res.status(403).json(formatErrorResponse(403, 'Access denied. Education agent role required'));
    }

    const [agent] = await db.select()
      .from(educationAgents)
      .where(eq(educationAgents.id, decoded.agentId))
      .limit(1);

    if (!agent || !agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is inactive'));
    }

    (req as any).agentId = agent.id;
    (req as any).adminUserId = agent.adminUserId;
    next();
  } catch (error: any) {
    logger.error('Education agent auth error', { error: error.message });
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
      .from(educationAgents)
      .where(eq(educationAgents.adminUserId, adminUser.id))
      .limit(1);

    if (!agent) {
      return res.status(403).json(formatErrorResponse(403, 'Not authorized as Education agent'));
    }

    if (!agent.isAvailable) {
      return res.status(403).json(formatErrorResponse(403, 'Agent account is currently inactive'));
    }

    const token = jwt.sign(
      { 
        agentId: agent.id, 
        adminUserId: adminUser.id, 
        email: adminUser.email,
        role: 'education_agent' 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, adminUser.id));

    logger.info('Education agent login', { agentId: agent.id, email });

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
    logger.error('Education agent login error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Login failed'));
  }
});

router.get('/me', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;

    const [agent] = await db.select({
      id: educationAgents.id,
      employeeId: educationAgents.employeeId,
      specializations: educationAgents.specializations,
      maxActiveRequests: educationAgents.maxActiveRequests,
      currentActiveRequests: educationAgents.currentActiveRequests,
      totalCompletedRequests: educationAgents.totalCompletedRequests,
      isAvailable: educationAgents.isAvailable,
      name: adminUsers.name,
      email: adminUsers.email,
    })
      .from(educationAgents)
      .leftJoin(adminUsers, eq(educationAgents.adminUserId, adminUsers.id))
      .where(eq(educationAgents.id, agentId))
      .limit(1);

    res.json(formatResponse('success', 200, 'Agent profile', { agent }));
  } catch (error: any) {
    logger.error('Get education agent profile error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

router.get('/stats', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [stats] = await db.select({
      pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
      pickup: sql<number>`COUNT(*) FILTER (WHERE status = 'pickup')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
      total: count(),
    }).from(educationServiceRequests);

    res.json(formatResponse('success', 200, 'Stats retrieved', { stats }));
  } catch (error: any) {
    logger.error('Get education stats error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get stats'));
  }
});

router.get('/requests', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = db.select({
      id: educationServiceRequests.id,
      trackingId: educationServiceRequests.trackingId,
      serviceType: educationServiceRequests.serviceType,
      examYear: educationServiceRequests.examYear,
      registrationNumber: educationServiceRequests.registrationNumber,
      candidateName: educationServiceRequests.candidateName,
      status: educationServiceRequests.status,
      fee: educationServiceRequests.fee,
      isPaid: educationServiceRequests.isPaid,
      customerNotes: educationServiceRequests.customerNotes,
      agentNotes: educationServiceRequests.agentNotes,
      resultUrl: educationServiceRequests.resultUrl,
      createdAt: educationServiceRequests.createdAt,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
    })
      .from(educationServiceRequests)
      .leftJoin(users, eq(educationServiceRequests.userId, users.id))
      .orderBy(desc(educationServiceRequests.createdAt));

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(educationServiceRequests.status, status as string));
    } else {
      requests = await query;
    }

    res.json(formatResponse('success', 200, 'Requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get education requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get requests'));
  }
});

router.put('/requests/:id/status', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agentId;
    const { id } = req.params;
    const { status, agentNotes, resultUrl, resultData } = req.body;

    if (!['pending', 'pickup', 'completed'].includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid status'));
    }

    const [request] = await db.select()
      .from(educationServiceRequests)
      .where(eq(educationServiceRequests.id, id))
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

    await db.update(educationServiceRequests)
      .set(updateData)
      .where(eq(educationServiceRequests.id, id));

    logger.info('Education request status updated', { requestId: id, status, agentId });

    res.json(formatResponse('success', 200, 'Request updated'));
  } catch (error: any) {
    logger.error('Update education request error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request'));
  }
});

// ===== PIN INVENTORY MANAGEMENT =====

// Get PIN stock summary
router.get('/pins/stock', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const examTypes = ['waec', 'neco', 'nabteb', 'nbais'];
    const stockSummary: any = {};

    for (const examType of examTypes) {
      const [stockCount] = await db.select({
        total: count(),
        unused: sql<number>`COUNT(*) FILTER (WHERE status = 'unused')`,
        used: sql<number>`COUNT(*) FILTER (WHERE status = 'used')`,
      }).from(educationPins).where(eq(educationPins.examType, examType));

      const [pricing] = await db.select()
        .from(servicePricing)
        .where(and(
          eq(servicePricing.serviceType, `${examType}_pin`),
          eq(servicePricing.isActive, true)
        ))
        .limit(1);

      stockSummary[examType] = {
        total: stockCount?.total || 0,
        unused: stockCount?.unused || 0,
        used: stockCount?.used || 0,
        price: pricing?.price ? parseFloat(pricing.price) : 0,
      };
    }

    res.json(formatResponse('success', 200, 'PIN stock retrieved', { stock: stockSummary }));
  } catch (error: any) {
    logger.error('Get PIN stock error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PIN stock'));
  }
});

// Get all PINs with pagination
router.get('/pins', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { examType, status, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions: any[] = [];
    if (examType) whereConditions.push(eq(educationPins.examType, examType as string));
    if (status) whereConditions.push(eq(educationPins.status, status as string));

    let pinsQuery = db.select({
      id: educationPins.id,
      examType: educationPins.examType,
      pinCode: educationPins.pinCode,
      serialNumber: educationPins.serialNumber,
      status: educationPins.status,
      usedAt: educationPins.usedAt,
      createdAt: educationPins.createdAt,
    }).from(educationPins);

    if (whereConditions.length > 0) {
      pinsQuery = pinsQuery.where(and(...whereConditions)) as any;
    }

    const pins = await pinsQuery
      .orderBy(desc(educationPins.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Mask PIN codes for security (show first 4 and last 4 chars)
    const maskedPins = pins.map(pin => ({
      ...pin,
      pinCode: pin.status === 'unused' 
        ? `${pin.pinCode.slice(0, 4)}****${pin.pinCode.slice(-4)}`
        : pin.pinCode,
    }));

    let countQuery = db.select({ count: count() }).from(educationPins);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions)) as any;
    }
    const [totalCount] = await countQuery;

    res.json(formatResponse('success', 200, 'PINs retrieved', {
      pins: maskedPins,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / parseInt(limit as string)),
      }
    }));
  } catch (error: any) {
    logger.error('Get PINs error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PINs'));
  }
});

// Add single PIN
router.post('/pins', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { examType, pinCode, serialNumber } = req.body;

    if (!examType || !pinCode) {
      return res.status(400).json(formatErrorResponse(400, 'Exam type and PIN code are required'));
    }

    if (!['waec', 'neco', 'nabteb', 'nbais'].includes(examType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid exam type'));
    }

    // Check if PIN already exists
    const [existingPin] = await db.select()
      .from(educationPins)
      .where(and(
        eq(educationPins.examType, examType),
        eq(educationPins.pinCode, pinCode)
      ))
      .limit(1);

    if (existingPin) {
      return res.status(409).json(formatErrorResponse(409, 'This PIN already exists in the system'));
    }

    const [newPin] = await db.insert(educationPins)
      .values({
        examType,
        pinCode,
        serialNumber: serialNumber || null,
        status: 'unused',
      })
      .returning();

    logger.info('PIN added', { examType, agentId: (req as any).agentId });

    res.status(201).json(formatResponse('success', 201, 'PIN added successfully', { pin: newPin }));
  } catch (error: any) {
    logger.error('Add PIN error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to add PIN'));
  }
});

// Bulk upload PINs
router.post('/pins/bulk', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { examType, pins } = req.body;

    if (!examType || !pins || !Array.isArray(pins) || pins.length === 0) {
      return res.status(400).json(formatErrorResponse(400, 'Exam type and pins array are required'));
    }

    if (!['waec', 'neco', 'nabteb', 'nbais'].includes(examType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid exam type'));
    }

    let added = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const pin of pins) {
      try {
        const pinCode = pin.pinCode || pin.pin || pin.code;
        const serialNumber = pin.serialNumber || pin.serial || null;

        if (!pinCode) {
          errors.push(`Missing PIN code in entry`);
          continue;
        }

        // Check if PIN exists
        const [existing] = await db.select()
          .from(educationPins)
          .where(and(
            eq(educationPins.examType, examType),
            eq(educationPins.pinCode, pinCode)
          ))
          .limit(1);

        if (existing) {
          duplicates++;
          continue;
        }

        await db.insert(educationPins).values({
          examType,
          pinCode,
          serialNumber,
          status: 'unused',
        });
        added++;
      } catch (e: any) {
        errors.push(e.message);
      }
    }

    logger.info('Bulk PINs upload', { examType, added, duplicates, agentId: (req as any).agentId });

    res.json(formatResponse('success', 200, 'Bulk upload completed', {
      added,
      duplicates,
      errors: errors.slice(0, 5), // Return first 5 errors only
    }));
  } catch (error: any) {
    logger.error('Bulk PIN upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to upload PINs'));
  }
});

// Get PIN orders
router.get('/pins/orders', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions: any[] = [];
    if (status && status !== 'all') {
      whereConditions.push(eq(educationPinOrders.status, status as string));
    }

    let ordersQuery = db.select({
      id: educationPinOrders.id,
      examType: educationPinOrders.examType,
      status: educationPinOrders.status,
      amount: educationPinOrders.amount,
      createdAt: educationPinOrders.createdAt,
      completedAt: educationPinOrders.completedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(educationPinOrders)
      .leftJoin(users, eq(educationPinOrders.userId, users.id));
    
    if (whereConditions.length > 0) {
      ordersQuery = ordersQuery.where(and(...whereConditions)) as any;
    }

    const orders = await ordersQuery
      .orderBy(desc(educationPinOrders.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    let ordersCountQuery = db.select({ count: count() }).from(educationPinOrders);
    if (whereConditions.length > 0) {
      ordersCountQuery = ordersCountQuery.where(and(...whereConditions)) as any;
    }
    const [totalCount] = await ordersCountQuery;

    res.json(formatResponse('success', 200, 'Orders retrieved', {
      orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount?.count || 0,
      }
    }));
  } catch (error: any) {
    logger.error('Get PIN orders error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get orders'));
  }
});

// Update PIN pricing
router.put('/pins/pricing', educationAgentAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { examType, price } = req.body;

    if (!examType || price === undefined) {
      return res.status(400).json(formatErrorResponse(400, 'Exam type and price are required'));
    }

    if (!['waec', 'neco', 'nabteb', 'nbais'].includes(examType)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid exam type'));
    }

    const serviceType = `${examType}_pin`;

    // Update or insert pricing
    const [existingPricing] = await db.select()
      .from(servicePricing)
      .where(eq(servicePricing.serviceType, serviceType))
      .limit(1);

    if (existingPricing) {
      await db.update(servicePricing)
        .set({ price: price.toString(), updatedAt: new Date() })
        .where(eq(servicePricing.id, existingPricing.id));
    } else {
      await db.insert(servicePricing).values({
        serviceType,
        serviceName: `${examType.toUpperCase()} PIN`,
        price: price.toString(),
        isActive: true,
      });
    }

    logger.info('PIN pricing updated', { examType, price, agentId: (req as any).agentId });

    res.json(formatResponse('success', 200, 'Pricing updated'));
  } catch (error: any) {
    logger.error('Update PIN pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update pricing'));
  }
});

export default router;
