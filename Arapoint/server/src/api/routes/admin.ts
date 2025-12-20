import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { jobService } from '../../services/jobService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { 
  users, 
  transactions, 
  rpaJobs, 
  adminSettings,
  bvnServices,
  educationServices,
  airtimeServices,
  dataServices,
  electricityServices,
  cableServices,
  servicePricing,
  cacAgents,
  cacServiceTypes,
  cacRegistrationRequests,
  adminUsers,
  adminRoles
} from '../../db/schema';
import bcrypt from 'bcryptjs';
import { eq, desc, count, sql } from 'drizzle-orm';

const router = Router();
router.use(authMiddleware);

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [transactionCount] = await db.select({ count: count() }).from(transactions);
    const [pendingJobsCount] = await db.select({ count: count() }).from(rpaJobs).where(eq(rpaJobs.status, 'pending'));
    const [completedJobsCount] = await db.select({ count: count() }).from(rpaJobs).where(eq(rpaJobs.status, 'completed'));
    
    const [bvnCount] = await db.select({ count: count() }).from(bvnServices);
    const [educationCount] = await db.select({ count: count() }).from(educationServices);
    const [airtimeCount] = await db.select({ count: count() }).from(airtimeServices);
    const [dataCount] = await db.select({ count: count() }).from(dataServices);

    const revenueResult = await db.select({
      total: sql<string>`COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)`
    }).from(transactions);

    const weeklyData = await db.select({
      day: sql<string>`TRIM(TO_CHAR(created_at, 'Dy'))`,
      services: sql<number>`COUNT(*)::int`
    })
    .from(transactions)
    .where(sql`created_at >= NOW() - INTERVAL '7 days'`)
    .groupBy(sql`TRIM(TO_CHAR(created_at, 'Dy'))`);

    const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = dayOrder.map(day => ({
      name: day,
      services: weeklyData.find(w => w.day === day)?.services || 0
    }));

    logger.info('Admin stats request', { userId: req.userId });

    res.json(formatResponse('success', 200, 'Admin statistics retrieved', {
      totalUsers: userCount?.count || 0,
      totalTransactions: transactionCount?.count || 0,
      totalRevenue: parseFloat(revenueResult[0]?.total || '0'),
      pendingJobs: pendingJobsCount?.count || 0,
      completedJobs: completedJobsCount?.count || 0,
      bvnServices: bvnCount?.count || 0,
      educationServices: educationCount?.count || 0,
      vtuServices: (airtimeCount?.count || 0) + (dataCount?.count || 0),
      chartData,
    }));
  } catch (error: any) {
    logger.error('Admin stats error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to retrieve admin statistics'));
  }
});

router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const pricing = await db.select().from(servicePricing).orderBy(servicePricing.serviceName);
    res.json(formatResponse('success', 200, 'Pricing retrieved', { pricing }));
  } catch (error: any) {
    logger.error('Get pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get pricing'));
  }
});

router.put('/pricing/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, isActive, description } = req.body;

    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid price value'));
    }

    const [updated] = await db.update(servicePricing)
      .set({ 
        price: numericPrice.toFixed(2),
        isActive,
        description,
        updatedAt: new Date()
      })
      .where(eq(servicePricing.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json(formatErrorResponse(404, 'Pricing not found'));
    }

    logger.info('Pricing updated', { pricingId: id, adminId: req.userId });
    res.json(formatResponse('success', 200, 'Pricing updated', updated));
  } catch (error: any) {
    logger.error('Update pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update pricing'));
  }
});

router.post('/pricing', async (req: Request, res: Response) => {
  try {
    const { serviceType, serviceName, price, description } = req.body;

    if (!serviceType || !serviceName || price === undefined) {
      return res.status(400).json(formatErrorResponse(400, 'Service type, name, and price are required'));
    }

    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid price value'));
    }

    const [existing] = await db.select().from(servicePricing).where(eq(servicePricing.serviceType, serviceType)).limit(1);
    if (existing) {
      return res.status(400).json(formatErrorResponse(400, 'Service type already exists'));
    }

    const [newPricing] = await db.insert(servicePricing).values({
      serviceType,
      serviceName,
      price: numericPrice.toFixed(2),
      description,
      isActive: true,
    }).returning();

    logger.info('Pricing added', { serviceType, adminId: req.userId });
    res.status(201).json(formatResponse('success', 201, 'Service pricing added', newPricing));
  } catch (error: any) {
    logger.error('Add pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to add pricing'));
  }
});

router.get('/bvn-services', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const services = await db.select({
      id: bvnServices.id,
      userId: bvnServices.userId,
      bvn: bvnServices.bvn,
      phone: bvnServices.phone,
      serviceType: bvnServices.serviceType,
      requestId: bvnServices.requestId,
      status: bvnServices.status,
      responseData: bvnServices.responseData,
      createdAt: bvnServices.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(bvnServices)
      .leftJoin(users, eq(bvnServices.userId, users.id))
      .orderBy(desc(bvnServices.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(bvnServices);

    res.json(formatResponse('success', 200, 'BVN services retrieved', {
      services,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get BVN services error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get BVN services'));
  }
});

router.get('/education-services', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const services = await db.select({
      id: educationServices.id,
      userId: educationServices.userId,
      serviceType: educationServices.serviceType,
      examYear: educationServices.examYear,
      registrationNumber: educationServices.registrationNumber,
      status: educationServices.status,
      resultData: educationServices.resultData,
      createdAt: educationServices.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(educationServices)
      .leftJoin(users, eq(educationServices.userId, users.id))
      .orderBy(desc(educationServices.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(educationServices);

    res.json(formatResponse('success', 200, 'Education services retrieved', {
      services,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get education services error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get education services'));
  }
});

router.get('/vtu-services', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const airtimeList = await db.select({
      id: airtimeServices.id,
      userId: airtimeServices.userId,
      serviceType: sql<string>`'airtime'`,
      provider: airtimeServices.network,
      amount: airtimeServices.amount,
      phone: airtimeServices.phoneNumber,
      status: airtimeServices.status,
      reference: airtimeServices.reference,
      createdAt: airtimeServices.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(airtimeServices)
      .leftJoin(users, eq(airtimeServices.userId, users.id))
      .orderBy(desc(airtimeServices.createdAt))
      .limit(limit)
      .offset(offset);

    const dataList = await db.select({
      id: dataServices.id,
      userId: dataServices.userId,
      serviceType: sql<string>`'data'`,
      provider: dataServices.network,
      amount: dataServices.amount,
      phone: dataServices.phoneNumber,
      status: dataServices.status,
      reference: dataServices.reference,
      createdAt: dataServices.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(dataServices)
      .leftJoin(users, eq(dataServices.userId, users.id))
      .orderBy(desc(dataServices.createdAt))
      .limit(limit)
      .offset(offset);

    const electricityList = await db.select({
      id: electricityServices.id,
      userId: electricityServices.userId,
      serviceType: sql<string>`'electricity'`,
      provider: electricityServices.discoName,
      amount: electricityServices.amount,
      meterNumber: electricityServices.meterNumber,
      status: electricityServices.status,
      reference: electricityServices.reference,
      createdAt: electricityServices.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(electricityServices)
      .leftJoin(users, eq(electricityServices.userId, users.id))
      .orderBy(desc(electricityServices.createdAt))
      .limit(limit)
      .offset(offset);

    const cableList = await db.select({
      id: cableServices.id,
      userId: cableServices.userId,
      serviceType: sql<string>`'cable'`,
      provider: cableServices.provider,
      amount: cableServices.amount,
      smartcard: cableServices.smartcardNumber,
      status: cableServices.status,
      reference: cableServices.reference,
      createdAt: cableServices.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(cableServices)
      .leftJoin(users, eq(cableServices.userId, users.id))
      .orderBy(desc(cableServices.createdAt))
      .limit(limit)
      .offset(offset);

    const allServices = [...airtimeList, ...dataList, ...electricityList, ...cableList]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);

    const [airtimeCount] = await db.select({ count: count() }).from(airtimeServices);
    const [dataCount] = await db.select({ count: count() }).from(dataServices);
    const [electricityCount] = await db.select({ count: count() }).from(electricityServices);
    const [cableCount] = await db.select({ count: count() }).from(cableServices);

    const totalVtu = (airtimeCount?.count || 0) + (dataCount?.count || 0) + (electricityCount?.count || 0) + (cableCount?.count || 0);

    res.json(formatResponse('success', 200, 'VTU services retrieved', {
      services: allServices,
      pagination: {
        page,
        limit,
        total: totalVtu,
        totalPages: Math.ceil(totalVtu / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get VTU services error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get VTU services'));
  }
});

router.get('/services', async (req: Request, res: Response) => {
  try {
    const pricing = await db.select().from(servicePricing);
    
    const services = pricing.map(p => ({
      id: p.serviceType,
      name: p.serviceName,
      status: p.isActive ? 'active' : 'inactive',
      price: parseFloat(p.price || '0'),
      description: p.description,
    }));

    res.json(formatResponse('success', 200, 'Services retrieved', { services }));
  } catch (error: any) {
    logger.error('Get services error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get services'));
  }
});

router.put('/services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, price } = req.body;

    const [updated] = await db.update(servicePricing)
      .set({ 
        isActive: status === 'active',
        price: price?.toString(),
        updatedAt: new Date()
      })
      .where(eq(servicePricing.serviceType, id))
      .returning();

    logger.info('Service updated', { serviceId: id, status, price, userId: req.userId });

    res.json(formatResponse('success', 200, 'Service updated successfully', {
      id,
      status,
      price,
    }));
  } catch (error: any) {
    logger.error('Update service error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update service'));
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const userList = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      walletBalance: users.walletBalance,
      kycStatus: users.kycStatus,
      createdAt: users.createdAt,
    })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(users);

    res.json(formatResponse('success', 200, 'Users retrieved', {
      users: userList,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get users error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get users'));
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json(formatErrorResponse(404, 'User not found'));
    }

    const userTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, id))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    res.json(formatResponse('success', 200, 'User retrieved', {
      user: {
        ...user,
        passwordHash: undefined,
      },
      recentTransactions: userTransactions,
    }));
  } catch (error: any) {
    logger.error('Get user error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get user'));
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json(formatErrorResponse(400, 'Valid name is required (minimum 2 characters)'));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return res.status(400).json(formatErrorResponse(400, 'Valid email address is required'));
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json(formatErrorResponse(400, 'Password must be at least 6 characters'));
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();
    const normalizedPhone = phone ? phone.replace(/\D/g, '').slice(0, 15) : null;

    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.transaction(async (tx) => {
      return tx.insert(users).values({
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        emailVerified: true,
        kycStatus: 'pending',
        walletBalance: '0.00',
      }).returning();
    });

    logger.info('Admin created new user', { userId: newUser.id, adminId: req.userId });

    res.status(201).json(formatResponse('success', 201, 'User created successfully', {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        walletBalance: newUser.walletBalance,
        kycStatus: newUser.kycStatus,
        createdAt: newUser.createdAt,
      },
    }));
  } catch (error: any) {
    logger.error('Create user error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create user'));
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json(formatErrorResponse(404, 'User not found'));
    }

    if (email && email.toLowerCase() !== existingUser.email) {
      const emailExists = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (emailExists.length > 0) {
        return res.status(409).json(formatErrorResponse(409, 'Email already in use'));
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone || null;

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    logger.info('Admin updated user', { userId: id, adminId: req.userId, changes: Object.keys(updateData) });

    res.json(formatResponse('success', 200, 'User updated successfully', {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        walletBalance: updatedUser.walletBalance,
        kycStatus: updatedUser.kycStatus,
        createdAt: updatedUser.createdAt,
      },
    }));
  } catch (error: any) {
    logger.error('Update user error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update user'));
  }
});

router.post('/users/:id/fund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (typeof amount === 'undefined' || amount === null || amount === '' || 
        !Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 10000000) {
      return res.status(400).json(formatErrorResponse(400, 'Valid amount is required (must be a positive number up to 10,000,000)'));
    }

    const fundAmount = Math.round(numAmount * 100) / 100;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json(formatErrorResponse(404, 'User not found'));
    }

    const currentBalance = parseFloat(user.walletBalance || '0');
    const newBalance = Math.round((currentBalance + fundAmount) * 100) / 100;
    const reference = `ADMIN_FUND_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          walletBalance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      await tx.insert(transactions).values({
        userId: id,
        transactionType: 'admin_fund',
        amount: fundAmount.toFixed(2),
        paymentMethod: 'admin',
        referenceId: reference,
        status: 'successful',
      });
    });

    logger.info('Admin funded user wallet', { userId: id, amount: fundAmount, adminId: req.userId, reference });

    res.json(formatResponse('success', 200, 'Wallet funded successfully', {
      userId: id,
      amount: fundAmount,
      newBalance,
      reference,
      description: description || 'Admin wallet funding',
    }));
  } catch (error: any) {
    logger.error('Fund wallet error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fund wallet'));
  }
});

router.post('/users/:id/debit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (typeof amount === 'undefined' || amount === null || amount === '' || 
        !Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 10000000) {
      return res.status(400).json(formatErrorResponse(400, 'Valid amount is required (must be a positive number up to 10,000,000)'));
    }

    const debitAmount = Math.round(numAmount * 100) / 100;

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json(formatErrorResponse(404, 'User not found'));
    }

    const currentBalance = parseFloat(user.walletBalance || '0');
    
    if (currentBalance < debitAmount) {
      return res.status(400).json(formatErrorResponse(400, `Insufficient balance. User has ₦${currentBalance.toLocaleString()}`));
    }

    const newBalance = Math.round((currentBalance - debitAmount) * 100) / 100;
    const reference = `ADMIN_DEBIT_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          walletBalance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      await tx.insert(transactions).values({
        userId: id,
        transactionType: 'admin_debit',
        amount: debitAmount.toFixed(2),
        paymentMethod: 'admin',
        referenceId: reference,
        status: 'successful',
      });
    });

    logger.info('Admin debited user wallet', { userId: id, amount: debitAmount, adminId: req.userId, reference });

    res.json(formatResponse('success', 200, 'Wallet debited successfully', {
      userId: id,
      amount: debitAmount,
      newBalance,
      reference,
      description: description || 'Admin wallet debit',
    }));
  } catch (error: any) {
    logger.error('Debit wallet error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to debit wallet'));
  }
});

router.put('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { kycStatus } = req.body;

    const [updatedUser] = await db.update(users)
      .set({ kycStatus, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json(formatErrorResponse(404, 'User not found'));
    }

    logger.info('User status updated', { userId: id, kycStatus, adminId: req.userId });

    res.json(formatResponse('success', 200, 'User status updated', {
      id: updatedUser.id,
      kycStatus: updatedUser.kycStatus,
    }));
  } catch (error: any) {
    logger.error('Update user status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update user status'));
  }
});

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const transactionList = await db.select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(transactions);

    res.json(formatResponse('success', 200, 'Transactions retrieved', {
      transactions: transactionList,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get transactions error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get transactions'));
  }
});

router.get('/rpa/jobs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const jobs = await db.select()
      .from(rpaJobs)
      .orderBy(desc(rpaJobs.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(rpaJobs);

    res.json(formatResponse('success', 200, 'RPA jobs retrieved', {
      jobs,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get RPA jobs error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get RPA jobs'));
  }
});

router.post('/rpa/retry/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = await jobService.retryJob(jobId);

    logger.info('RPA job retry initiated', { jobId, adminId: req.userId });

    res.json(formatResponse('success', 200, 'Job retry scheduled', result));
  } catch (error: any) {
    logger.error('Retry job error', { error: error.message });
    
    if (error.message === 'Job not found') {
      return res.status(404).json(formatErrorResponse(404, error.message));
    }
    if (error.message === 'Max retries exceeded') {
      return res.status(400).json(formatErrorResponse(400, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to retry job'));
  }
});

router.get('/rpa/providers', async (req: Request, res: Response) => {
  try {
    const providerSettings = await db.select()
      .from(adminSettings)
      .where(sql`${adminSettings.settingKey} LIKE 'rpa_provider_%'`);

    const providers: Record<string, { url?: string; selectors?: Record<string, string> }> = {};
    
    for (const setting of providerSettings) {
      const keyParts = setting.settingKey.split('_');
      const providerName = keyParts[3];
      const settingType = keyParts[2];
      
      if (!providers[providerName]) {
        providers[providerName] = {};
      }
      
      if (settingType === 'url') {
        providers[providerName].url = setting.settingValue || undefined;
      } else if (settingType === 'selectors') {
        try {
          providers[providerName].selectors = JSON.parse(setting.settingValue || '{}');
        } catch {
          providers[providerName].selectors = {};
        }
      }
    }

    res.json(formatResponse('success', 200, 'RPA providers retrieved', { providers }));
  } catch (error: any) {
    logger.error('Get RPA providers error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get RPA providers'));
  }
});

router.put('/rpa/providers/:providerName', async (req: Request, res: Response) => {
  try {
    const { providerName } = req.params;
    const { url, selectors } = req.body;

    if (!providerName) {
      return res.status(400).json(formatErrorResponse(400, 'Provider name is required'));
    }

    const validProviders = ['jamb', 'waec', 'neco', 'nabteb', 'nbais', 'bvn', 'nin'];
    if (!validProviders.includes(providerName.toLowerCase())) {
      return res.status(400).json(formatErrorResponse(400, `Invalid provider. Valid providers: ${validProviders.join(', ')}`));
    }

    const urlKey = `rpa_provider_url_${providerName.toLowerCase()}`;
    const selectorsKey = `rpa_selectors_${providerName.toLowerCase()}`;

    if (url !== undefined) {
      const [existingUrl] = await db.select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, urlKey))
        .limit(1);

      if (existingUrl) {
        await db.update(adminSettings)
          .set({ settingValue: url, updatedAt: new Date() })
          .where(eq(adminSettings.settingKey, urlKey));
      } else {
        await db.insert(adminSettings).values({
          settingKey: urlKey,
          settingValue: url,
          description: `RPA portal URL for ${providerName.toUpperCase()} service`,
        });
      }
    }

    if (selectors !== undefined) {
      const selectorsJson = typeof selectors === 'string' ? selectors : JSON.stringify(selectors);
      
      const [existingSelectors] = await db.select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, selectorsKey))
        .limit(1);

      if (existingSelectors) {
        await db.update(adminSettings)
          .set({ settingValue: selectorsJson, updatedAt: new Date() })
          .where(eq(adminSettings.settingKey, selectorsKey));
      } else {
        await db.insert(adminSettings).values({
          settingKey: selectorsKey,
          settingValue: selectorsJson,
          description: `RPA CSS selectors for ${providerName.toUpperCase()} portal`,
        });
      }
    }

    logger.info('RPA provider configured', { provider: providerName, adminId: req.userId });

    res.json(formatResponse('success', 200, 'RPA provider configured successfully', {
      provider: providerName,
      url,
      selectors,
    }));
  } catch (error: any) {
    logger.error('Configure RPA provider error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to configure RPA provider'));
  }
});

router.get('/rpa/providers/:providerName', async (req: Request, res: Response) => {
  try {
    const { providerName } = req.params;
    
    const urlKey = `rpa_provider_url_${providerName.toLowerCase()}`;
    const selectorsKey = `rpa_selectors_${providerName.toLowerCase()}`;

    const [urlSetting] = await db.select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, urlKey))
      .limit(1);

    const [selectorsSetting] = await db.select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, selectorsKey))
      .limit(1);

    let selectors = {};
    if (selectorsSetting?.settingValue) {
      try {
        selectors = JSON.parse(selectorsSetting.settingValue);
      } catch {
        selectors = {};
      }
    }

    res.json(formatResponse('success', 200, 'RPA provider retrieved', {
      provider: providerName,
      url: urlSetting?.settingValue || null,
      selectors,
    }));
  } catch (error: any) {
    logger.error('Get RPA provider error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get RPA provider'));
  }
});

router.delete('/rpa/providers/:providerName', async (req: Request, res: Response) => {
  try {
    const { providerName } = req.params;
    
    const urlKey = `rpa_provider_url_${providerName.toLowerCase()}`;
    const selectorsKey = `rpa_selectors_${providerName.toLowerCase()}`;

    await db.delete(adminSettings).where(eq(adminSettings.settingKey, urlKey));
    await db.delete(adminSettings).where(eq(adminSettings.settingKey, selectorsKey));

    logger.info('RPA provider configuration deleted', { provider: providerName, adminId: req.userId });

    res.json(formatResponse('success', 200, 'RPA provider configuration deleted', {
      provider: providerName,
    }));
  } catch (error: any) {
    logger.error('Delete RPA provider error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete RPA provider'));
  }
});

router.get('/cac/agents', async (req: Request, res: Response) => {
  try {
    const agents = await db.select({
      id: cacAgents.id,
      adminUserId: cacAgents.adminUserId,
      employeeId: cacAgents.employeeId,
      specializations: cacAgents.specializations,
      maxActiveRequests: cacAgents.maxActiveRequests,
      currentActiveRequests: cacAgents.currentActiveRequests,
      totalCompletedRequests: cacAgents.totalCompletedRequests,
      isAvailable: cacAgents.isAvailable,
      createdAt: cacAgents.createdAt,
      name: adminUsers.name,
      email: adminUsers.email,
    })
      .from(cacAgents)
      .leftJoin(adminUsers, eq(cacAgents.adminUserId, adminUsers.id))
      .orderBy(desc(cacAgents.createdAt));

    res.json(formatResponse('success', 200, 'CAC agents retrieved', { agents }));
  } catch (error: any) {
    logger.error('Get CAC agents error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get CAC agents'));
  }
});

router.post('/cac/agents', async (req: Request, res: Response) => {
  try {
    const { name, email, password, employeeId, specializations, maxActiveRequests } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Name, email, and password are required'));
    }

    const existingUser = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let cacAgentRole = await db.select()
      .from(adminRoles)
      .where(eq(adminRoles.name, 'CAC_AGENT'))
      .limit(1);

    if (cacAgentRole.length === 0) {
      const [newRole] = await db.insert(adminRoles).values({
        name: 'CAC_AGENT',
        description: 'CAC Agent role with access to CAC services only',
        permissions: ['cac:view', 'cac:process', 'cac:update'],
        isActive: true,
      }).returning();
      cacAgentRole = [newRole];
    }

    const [adminUser] = await db.insert(adminUsers).values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      roleId: cacAgentRole[0].id,
      isActive: true,
    }).returning();

    const [agent] = await db.insert(cacAgents).values({
      adminUserId: adminUser.id,
      employeeId: employeeId || `CAC${Date.now().toString(36).toUpperCase()}`,
      specializations: specializations || [],
      maxActiveRequests: maxActiveRequests || 10,
      isAvailable: true,
    }).returning();

    logger.info('CAC agent created', { agentId: agent.id, email, createdBy: req.userId });

    res.status(201).json(formatResponse('success', 201, 'CAC agent created successfully', {
      agent: {
        id: agent.id,
        name,
        email: email.toLowerCase(),
        employeeId: agent.employeeId,
        isAvailable: agent.isAvailable,
      },
    }));
  } catch (error: any) {
    logger.error('Create CAC agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create CAC agent'));
  }
});

router.put('/cac/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, employeeId, specializations, maxActiveRequests, isAvailable } = req.body;

    const [agent] = await db.select()
      .from(cacAgents)
      .where(eq(cacAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'CAC agent not found'));
    }

    if (name || email) {
      const updateData: any = { updatedAt: new Date() };
      if (name) updateData.name = name;
      if (email) updateData.email = email.toLowerCase();

      await db.update(adminUsers)
        .set(updateData)
        .where(eq(adminUsers.id, agent.adminUserId!));
    }

    const agentUpdate: any = { updatedAt: new Date() };
    if (employeeId !== undefined) agentUpdate.employeeId = employeeId;
    if (specializations !== undefined) agentUpdate.specializations = specializations;
    if (maxActiveRequests !== undefined) agentUpdate.maxActiveRequests = maxActiveRequests;
    if (isAvailable !== undefined) agentUpdate.isAvailable = isAvailable;

    await db.update(cacAgents)
      .set(agentUpdate)
      .where(eq(cacAgents.id, id));

    logger.info('CAC agent updated', { agentId: id, updatedBy: req.userId });

    res.json(formatResponse('success', 200, 'CAC agent updated successfully'));
  } catch (error: any) {
    logger.error('Update CAC agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update CAC agent'));
  }
});

router.delete('/cac/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [agent] = await db.select()
      .from(cacAgents)
      .where(eq(cacAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'CAC agent not found'));
    }

    await db.delete(cacAgents).where(eq(cacAgents.id, id));
    
    if (agent.adminUserId) {
      await db.update(adminUsers)
        .set({ isActive: false })
        .where(eq(adminUsers.id, agent.adminUserId));
    }

    logger.info('CAC agent deleted', { agentId: id, deletedBy: req.userId });

    res.json(formatResponse('success', 200, 'CAC agent deleted successfully'));
  } catch (error: any) {
    logger.error('Delete CAC agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete CAC agent'));
  }
});

router.get('/cac/service-types', async (req: Request, res: Response) => {
  try {
    const services = await db.select()
      .from(cacServiceTypes)
      .orderBy(cacServiceTypes.name);

    res.json(formatResponse('success', 200, 'CAC service types retrieved', { services }));
  } catch (error: any) {
    logger.error('Get CAC service types error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get service types'));
  }
});

router.post('/cac/service-types', async (req: Request, res: Response) => {
  try {
    const { code, name, description, price, processingDays, requiredDocuments } = req.body;

    if (!code || !name || !price) {
      return res.status(400).json(formatErrorResponse(400, 'Code, name, and price are required'));
    }

    const [service] = await db.insert(cacServiceTypes).values({
      code,
      name,
      description,
      price: price.toString(),
      processingDays: processingDays || 7,
      requiredDocuments: requiredDocuments || [],
      isActive: true,
    }).returning();

    logger.info('CAC service type created', { serviceId: service.id, code });

    res.status(201).json(formatResponse('success', 201, 'CAC service type created', { service }));
  } catch (error: any) {
    logger.error('Create CAC service type error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create service type'));
  }
});

router.put('/cac/service-types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, processingDays, requiredDocuments, isActive } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price.toString();
    if (processingDays !== undefined) updateData.processingDays = processingDays;
    if (requiredDocuments !== undefined) updateData.requiredDocuments = requiredDocuments;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db.update(cacServiceTypes)
      .set(updateData)
      .where(eq(cacServiceTypes.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json(formatErrorResponse(404, 'Service type not found'));
    }

    logger.info('CAC service type updated', { serviceId: id });

    res.json(formatResponse('success', 200, 'Service type updated', { service: updated }));
  } catch (error: any) {
    logger.error('Update CAC service type error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update service type'));
  }
});

router.get('/cac/requests', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const requests = await db.select({
      id: cacRegistrationRequests.id,
      serviceType: cacRegistrationRequests.serviceType,
      businessName: cacRegistrationRequests.businessName,
      proprietorName: cacRegistrationRequests.proprietorName,
      status: cacRegistrationRequests.status,
      fee: cacRegistrationRequests.fee,
      assignedAgentId: cacRegistrationRequests.assignedAgentId,
      createdAt: cacRegistrationRequests.createdAt,
      completedAt: cacRegistrationRequests.completedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(cacRegistrationRequests)
      .leftJoin(users, eq(cacRegistrationRequests.userId, users.id))
      .orderBy(desc(cacRegistrationRequests.createdAt))
      .limit(limit)
      .offset(offset);

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
    logger.error('Get CAC requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get CAC requests'));
  }
});

router.get('/roles', async (req: Request, res: Response) => {
  try {
    const roles = await db.select().from(adminRoles).orderBy(adminRoles.name);
    
    const rolesWithCount = await Promise.all(roles.map(async (role) => {
      const [userCount] = await db.select({ count: count() })
        .from(adminUsers)
        .where(eq(adminUsers.roleId, role.id));
      return {
        ...role,
        userCount: userCount?.count || 0,
      };
    }));

    res.json(formatResponse('success', 200, 'Roles retrieved', { roles: rolesWithCount }));
  } catch (error: any) {
    logger.error('Get roles error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get roles'));
  }
});

router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json(formatErrorResponse(400, 'Role name is required'));
    }

    const [newRole] = await db.insert(adminRoles).values({
      name,
      description,
      permissions: permissions || [],
      isActive: true,
    }).returning();

    logger.info('Role created', { roleId: newRole.id, name });
    res.status(201).json(formatResponse('success', 201, 'Role created', { role: newRole }));
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json(formatErrorResponse(400, 'Role name already exists'));
    }
    logger.error('Create role error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create role'));
  }
});

router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db.update(adminRoles)
      .set(updateData)
      .where(eq(adminRoles.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json(formatErrorResponse(404, 'Role not found'));
    }

    logger.info('Role updated', { roleId: id });
    res.json(formatResponse('success', 200, 'Role updated', { role: updated }));
  } catch (error: any) {
    logger.error('Update role error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update role'));
  }
});

router.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [usersWithRole] = await db.select({ count: count() })
      .from(adminUsers)
      .where(eq(adminUsers.roleId, id));

    if (usersWithRole && usersWithRole.count > 0) {
      return res.status(400).json(formatErrorResponse(400, 'Cannot delete role with assigned users'));
    }

    const [deleted] = await db.delete(adminRoles)
      .where(eq(adminRoles.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json(formatErrorResponse(404, 'Role not found'));
    }

    logger.info('Role deleted', { roleId: id });
    res.json(formatResponse('success', 200, 'Role deleted'));
  } catch (error: any) {
    logger.error('Delete role error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete role'));
  }
});

export default router;
