import { Router, Request, Response, NextFunction } from 'express';
import { adminAuthMiddleware } from '../middleware/auth';
import { jobService } from '../../services/jobService';
import { pricingService } from '../../services/pricingService';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { loadGatewayCredentials } from '../../config/loadGatewayCredentials';
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
  adminRoles,
  identityAgents,
  identityServiceRequests,
  educationAgents,
  educationServiceRequests,
  identityVerifications,
  educationPins,
  educationPinOrders,
  a2cAgents,
  a2cRequests,
  nbaisSchools,
  whatsappTemplates,
  agentChannels,
  agentNotifications,
  jambAgents,
  jambServiceRequests,
} from '../../db/schema';
import { 
  supportTickets as support_tickets, 
  supportConversations as support_conversations, 
  supportMessages as support_messages,
  supportInternalNotes as support_internal_notes,
  supportPresence as support_presence,
  agentInternalMessages,
  fraudAlerts,
  users as usersTable,
  adminUsers as admin_users, 
  adminRoles as admin_roles 
} from '../../db/schema';
import { fraudService } from '../../services/fraudService';
import { whatsappService } from '../../services/whatsappService';
import { walletService } from '../../services/walletService';
import { localAi } from '../../services/localAiService';
import { scrapeNbaisSchools, getSchoolsCount } from '../../rpa/workers/nbaisSchoolScraper';
import { browserPool } from '../../rpa/browserPool';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const SUPPORT_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'support');
if (!fs.existsSync(SUPPORT_UPLOADS_DIR)) fs.mkdirSync(SUPPORT_UPLOADS_DIR, { recursive: true });

const agentSupportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUPPORT_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});
const agentSupportUpload = multer({
  storage: agentSupportStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.mp4', '.mp3'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});
import { eq, desc, count, sql, and, or, gt, asc, gte, lte, ilike } from 'drizzle-orm';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || 'placeholder',
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}
const openai = { chat: { completions: { create: (...args: any[]) => getOpenAI().chat.completions.create(...args) } } } as unknown as OpenAI;

const router = Router();
router.use(adminAuthMiddleware);

const supportAgentGuard = (req: Request, res: Response, next: NextFunction) => {
  if (req.adminRole === 'support_agent' && !req.path.startsWith('/support/') && !req.path.startsWith('/ai/')) {
    return res.status(403).json({
      status: 'error',
      code: 403,
      message: 'Support agents can only access support-related endpoints',
    });
  }
  next();
};
router.use(supportAgentGuard);

router.post('/vtu/scrape-data', async (req: Request, res: Response) => {
  try {
    await db.insert(rpaJobs).values({
      serviceType: 'vtpass_data_scrape',
      queryData: {},
      status: 'pending',
      priority: 10,
    });
    res.json(formatResponse('success', 200, 'Scrape job queued'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to queue scrape job'));
  }
});

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
    const { price, costPrice, markup, isActive, description } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (price !== undefined) {
      const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json(formatErrorResponse(400, 'Invalid price value'));
      }
      updateData.price = numericPrice.toFixed(2);
    }

    if (costPrice !== undefined) {
      const numericCost = typeof costPrice === 'string' ? parseFloat(costPrice) : costPrice;
      if (isNaN(numericCost) || numericCost < 0) {
        return res.status(400).json(formatErrorResponse(400, 'Invalid cost price value'));
      }
      updateData.costPrice = numericCost.toFixed(2);
    }

    if (markup !== undefined) {
      const numericMarkup = typeof markup === 'string' ? parseFloat(markup) : markup;
      if (isNaN(numericMarkup)) {
        return res.status(400).json(formatErrorResponse(400, 'Invalid markup value'));
      }
      updateData.markup = numericMarkup.toFixed(2);
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    const [updated] = await db.update(servicePricing)
      .set(updateData)
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
    const { serviceType, serviceName, price, costPrice, markup, description } = req.body;

    if (!serviceType || !serviceName || price === undefined) {
      return res.status(400).json(formatErrorResponse(400, 'Service type, name, and price are required'));
    }

    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid price value'));
    }

    const numericCost = typeof costPrice === 'string' ? parseFloat(costPrice) : (costPrice || 0);
    const numericMarkup = typeof markup === 'string' ? parseFloat(markup) : (markup || 0);

    const [existing] = await db.select().from(servicePricing).where(eq(servicePricing.serviceType, serviceType)).limit(1);
    if (existing) {
      return res.status(400).json(formatErrorResponse(400, 'Service type already exists'));
    }

    const [newPricing] = await db.insert(servicePricing).values({
      serviceType,
      serviceName,
      price: numericPrice.toFixed(2),
      costPrice: numericCost.toFixed(2),
      markup: numericMarkup.toFixed(2),
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

router.delete('/pricing/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db.delete(servicePricing)
      .where(eq(servicePricing.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json(formatErrorResponse(404, 'Pricing not found'));
    }

    logger.info('Pricing deleted', { pricingId: id, adminId: req.userId });
    res.json(formatResponse('success', 200, 'Pricing deleted', deleted));
  } catch (error: any) {
    logger.error('Delete pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete pricing'));
  }
});

router.post('/pricing/seed', async (req: Request, res: Response) => {
  try {
    const result = await pricingService.seedDefaultPrices();
    pricingService.clearCache();
    
    logger.info('Pricing seeded', { ...result, adminId: req.userId });
    res.json(formatResponse('success', 200, 'Default prices seeded', result));
  } catch (error: any) {
    logger.error('Seed pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to seed pricing'));
  }
});

router.get('/pricing/all', async (req: Request, res: Response) => {
  try {
    const pricing = await pricingService.getAllPricing();
    res.json(formatResponse('success', 200, 'All pricing retrieved', { pricing }));
  } catch (error: any) {
    logger.error('Get all pricing error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get pricing'));
  }
});

router.get('/identity-services', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const services = await db.select({
      id: identityVerifications.id,
      userId: identityVerifications.userId,
      verificationType: identityVerifications.verificationType,
      nin: identityVerifications.nin,
      phone: identityVerifications.phone,
      secondEnrollmentId: identityVerifications.secondEnrollmentId,
      status: identityVerifications.status,
      verificationData: identityVerifications.verificationData,
      createdAt: identityVerifications.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(identityVerifications)
      .leftJoin(users, eq(identityVerifications.userId, users.id))
      .orderBy(desc(identityVerifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db.select({ count: count() }).from(identityVerifications);

    res.json(formatResponse('success', 200, 'Identity services retrieved', {
      services,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Get identity services error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get identity services'));
  }
});

router.put('/identity-services/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [updated] = await db.update(identityVerifications)
      .set({ status })
      .where(eq(identityVerifications.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json(formatErrorResponse(404, 'Identity service not found'));
    }

    res.json(formatResponse('success', 200, 'Identity service status updated', updated));
  } catch (error: any) {
    logger.error('Update identity service status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update status'));
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

router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json(formatErrorResponse(400, 'Email address is required'));
    }

    const { sendEmail } = await import('../../services/emailService');
    const sent = await sendEmail(
      to,
      'Arapoint - Test Email',
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Arapoint SMTP Test</h2>
        <p>This is a test email from your Arapoint platform.</p>
        <p>If you received this, your email configuration is working correctly.</p>
        <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
      </div>`
    );

    if (sent) {
      res.json(formatResponse('success', 200, 'Test email sent successfully'));
    } else {
      res.status(500).json(formatErrorResponse(500, 'Failed to send test email. Check your SMTP configuration.'));
    }
  } catch (error: any) {
    logger.error('Test email error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, error.message || 'Failed to send test email'));
  }
});

router.post('/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    // Update or insert each setting
    for (const [key, value] of Object.entries(settings)) {
      await db.insert(adminSettings)
        .values({
          settingKey: key,
          settingValue: typeof value === 'string' ? value : JSON.stringify(value),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: adminSettings.settingKey,
          set: {
            settingValue: typeof value === 'string' ? value : JSON.stringify(value),
            updatedAt: new Date()
          }
        });
    }

    // Reload gateway credentials into process.env immediately
    await loadGatewayCredentials().catch(err =>
      logger.warn('Failed to reload gateway credentials after settings update', { error: err.message })
    );

    res.json(formatResponse('success', 200, 'Settings updated successfully'));
  } catch (error: any) {
    logger.error('Update settings error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update settings'));
  }
});

router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settingsList = await db.select().from(adminSettings);
    const settings: Record<string, any> = {};
    
    settingsList.forEach(s => {
      try {
        if (s.settingValue && (s.settingValue.startsWith('{') || s.settingValue.startsWith('['))) {
          settings[s.settingKey] = JSON.parse(s.settingValue);
        } else {
          settings[s.settingKey] = s.settingValue;
        }
      } catch {
        settings[s.settingKey] = s.settingValue;
      }
    });

    res.json(formatResponse('success', 200, 'Settings retrieved', settings));
  } catch (error: any) {
    logger.error('Get settings error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get settings'));
  }
});

router.get('/payment-gateways/status', async (req: Request, res: Response) => {
  try {
    const settingsList = await db.select().from(adminSettings);
    const savedSettings: Record<string, string> = {};
    settingsList.forEach(s => {
      savedSettings[s.settingKey] = s.settingValue || '';
    });

    const gateways = {
      paystack: {
        name: 'Paystack',
        description: 'Card payments, bank transfers, USSD, mobile money',
        configured: !!(process.env.PAYSTACK_SECRET_KEY || savedSettings['paystack_secret_key']),
        fields: [
          { key: 'paystack_secret_key', label: 'Secret Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['paystack_secret_key'] },
          { key: 'paystack_public_key', label: 'Public Key', type: 'text', required: true, value: savedSettings['paystack_public_key'] || '' },
        ],
      },
      palmpay: {
        name: 'PalmPay Business',
        description: 'PalmPay virtual accounts and direct payments',
        configured: !!(process.env.PALMPAY_APP_ID || savedSettings['palmpay_app_id']),
        fields: [
          { key: 'palmpay_app_id', label: 'App ID', type: 'text', required: true, value: savedSettings['palmpay_app_id'] || '' },
          { key: 'palmpay_private_key', label: 'Private Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['palmpay_private_key'] },
          { key: 'palmpay_public_key', label: 'Public Key', type: 'text', required: false, value: savedSettings['palmpay_public_key'] || '' },
        ],
      },
      paymentpoint: {
        name: 'PaymentPoint',
        description: 'Primary virtual account gateway for bank transfers (preferred)',
        configured: !!(process.env.PAYMENTPOINT_API_KEY || savedSettings['paymentpoint_api_key']),
        fields: [
          { key: 'paymentpoint_api_key', label: 'API Key', type: 'text', required: true, value: savedSettings['paymentpoint_api_key'] || '' },
          { key: 'paymentpoint_secret_key', label: 'Secret Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['paymentpoint_secret_key'] },
          { key: 'paymentpoint_merchant_id', label: 'Business ID', type: 'text', required: true, value: savedSettings['paymentpoint_merchant_id'] || '' },
        ],
      },
      payvessel: {
        name: 'PayVessel',
        description: 'Virtual account generation for bank transfers (fallback)',
        configured: !!(process.env.PAYVESSEL_API_KEY || savedSettings['payvessel_api_key']),
        fields: [
          { key: 'payvessel_api_key', label: 'API Key', type: 'text', required: true, value: savedSettings['payvessel_api_key'] || '' },
          { key: 'payvessel_secret_key', label: 'Secret Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['payvessel_secret_key'] },
          { key: 'payvessel_business_id', label: 'Business ID', type: 'text', required: true, value: savedSettings['payvessel_business_id'] || '' },
        ],
      },
      vtpass: {
        name: 'VTPass',
        description: 'Airtime, data, electricity, and cable TV services',
        configured: !!(process.env.VTPASS_API_KEY || savedSettings['vtpass_api_key']),
        fields: [
          { key: 'vtpass_api_key', label: 'API Key', type: 'text', required: true, value: savedSettings['vtpass_api_key'] || '' },
          { key: 'vtpass_secret_key', label: 'Secret Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['vtpass_secret_key'] },
          { key: 'vtpass_public_key', label: 'Public Key', type: 'text', required: false, value: savedSettings['vtpass_public_key'] || '' },
          { key: 'vtpass_sandbox', label: 'Sandbox Mode', type: 'toggle', required: false, value: savedSettings['vtpass_sandbox'] || 'false' },
        ],
      },
      youverify: {
        name: 'YouVerify',
        description: 'NIN and BVN identity verification',
        configured: !!(process.env.YOUVERIFY_API_KEY || savedSettings['youverify_api_key']),
        fields: [
          { key: 'youverify_api_key', label: 'API Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['youverify_api_key'] },
          { key: 'youverify_sandbox', label: 'Sandbox Mode', type: 'toggle', required: false, value: savedSettings['youverify_sandbox'] || 'false' },
        ],
      },
      prembly: {
        name: 'Prembly (IdentityPass)',
        description: 'Alternative identity verification provider',
        configured: !!(process.env.PREMBLY_SECRET_KEY || savedSettings['prembly_secret_key']),
        fields: [
          { key: 'prembly_secret_key', label: 'Secret Key', type: 'password', required: true, value: '', hasValue: !!savedSettings['prembly_secret_key'] },
          { key: 'prembly_public_key', label: 'Public Key', type: 'text', required: false, value: savedSettings['prembly_public_key'] || '' },
        ],
      },
    };

    res.json(formatResponse('success', 200, 'Gateway status retrieved', { gateways }));
  } catch (error: any) {
    logger.error('Get payment gateway status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get gateway status'));
  }
});

router.post('/payment-gateways/save', async (req: Request, res: Response) => {
  try {
    const { gateway, credentials } = req.body;

    if (!gateway || !credentials || typeof credentials !== 'object') {
      return res.status(400).json(formatErrorResponse(400, 'Gateway name and credentials are required'));
    }

    const envMapping: Record<string, string> = {
      paystack_secret_key: 'PAYSTACK_SECRET_KEY',
      paystack_public_key: 'PAYSTACK_PUBLIC_KEY',
      palmpay_app_id: 'PALMPAY_APP_ID',
      palmpay_private_key: 'PALMPAY_PRIVATE_KEY',
      palmpay_public_key: 'PALMPAY_PUBLIC_KEY',
      paymentpoint_api_key: 'PAYMENTPOINT_API_KEY',
      paymentpoint_secret_key: 'PAYMENTPOINT_SECRET_KEY',
      paymentpoint_merchant_id: 'PAYMENTPOINT_MERCHANT_ID',
      payvessel_api_key: 'PAYVESSEL_API_KEY',
      payvessel_secret_key: 'PAYVESSEL_SECRET_KEY',
      payvessel_business_id: 'PAYVESSEL_BUSINESS_ID',
      vtpass_api_key: 'VTPASS_API_KEY',
      vtpass_secret_key: 'VTPASS_SECRET_KEY',
      vtpass_public_key: 'VTPASS_PUBLIC_KEY',
      vtpass_sandbox: 'VTPASS_SANDBOX',
      youverify_api_key: 'YOUVERIFY_API_KEY',
      youverify_sandbox: 'YOUVERIFY_SANDBOX',
      prembly_secret_key: 'PREMBLY_SECRET_KEY',
      prembly_public_key: 'PREMBLY_PUBLIC_KEY',
    };

    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value && value !== '••••••••') {
        await db.insert(adminSettings)
          .values({
            settingKey: key,
            settingValue: value,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: adminSettings.settingKey,
            set: {
              settingValue: value,
              updatedAt: new Date()
            }
          });

        const envKey = envMapping[key];
        if (envKey) {
          process.env[envKey] = value;
        }
      }
    }

    logger.info('Payment gateway credentials saved', { gateway });
    res.json(formatResponse('success', 200, `${gateway} credentials saved and activated successfully`));
  } catch (error: any) {
    logger.error('Save payment gateway error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to save gateway credentials'));
  }
});

router.post('/payment-gateways/paymentpoint/test', async (req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const apiKey = process.env.PAYMENTPOINT_API_KEY || '';
    const secretKey = process.env.PAYMENTPOINT_SECRET_KEY || '';
    const businessId = process.env.PAYMENTPOINT_MERCHANT_ID || process.env.PAYMENTPOINT_BUSINESS_ID || '';

    if (!apiKey || !secretKey) {
      return res.json({ success: false, error: 'Credentials not loaded in memory', apiKeyLoaded: !!apiKey, secretKeyLoaded: !!secretKey, businessIdLoaded: !!businessId });
    }

    const debugInfo: Record<string, any> = {
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      apiKeyLength: apiKey.length,
      secretKeyLength: secretKey.length,
      businessId: businessId ? businessId.substring(0, 8) + '...' : 'MISSING',
      businessIdLength: businessId.length,
      endpoint: 'https://api.paymentpoint.co/api/v1/createVirtualAccount',
    };

    try {
      const testPayload: Record<string, any> = {
        email: 'test@arapoint.ng',
        name: 'Test User',
        phoneNumber: '08000000000',
        bankCode: ['20946', '20897'],
      };
      if (businessId) testPayload.businessId = businessId;

      const response = await axios.post('https://api.paymentpoint.co/api/v1/createVirtualAccount', testPayload, {
        headers: { 'Authorization': `Bearer ${secretKey}`, 'api-key': apiKey, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      debugInfo.httpStatus = response.status;
      debugInfo.apiResponse = response.data;
      return res.json({ success: true, debug: debugInfo });
    } catch (err: any) {
      debugInfo.httpStatus = err.response?.status;
      debugInfo.apiResponse = err.response?.data;
      debugInfo.networkError = err.message;
      return res.json({ success: false, debug: debugInfo });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
      isSuspended: users.isSuspended,
      suspendedAt: users.suspendedAt,
      suspendReason: users.suspendReason,
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

router.put('/users/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [user] = await db.select({ id: users.id, email: users.email, isSuspended: users.isSuspended })
      .from(users).where(eq(users.id, id)).limit(1);

    if (!user) return res.status(404).json(formatErrorResponse(404, 'User not found'));

    await db.update(users).set({
      isSuspended: true,
      suspendedAt: new Date(),
      suspendReason: reason || 'Suspended by administrator',
      updatedAt: new Date(),
    }).where(eq(users.id, id));

    logger.info('User suspended', { userId: id, reason });
    res.json(formatResponse('success', 200, 'User suspended successfully', { id, suspended: true }));
  } catch (error: any) {
    logger.error('Suspend user error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to suspend user'));
  }
});

router.put('/users/:id/unsuspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!user) return res.status(404).json(formatErrorResponse(404, 'User not found'));

    await db.update(users).set({
      isSuspended: false,
      suspendedAt: null,
      suspendReason: null,
      updatedAt: new Date(),
    }).where(eq(users.id, id));

    logger.info('User unsuspended', { userId: id });
    res.json(formatResponse('success', 200, 'User unsuspended successfully', { id, suspended: false }));
  } catch (error: any) {
    logger.error('Unsuspend user error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to unsuspend user'));
  }
});

router.post('/transactions/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!tx) return res.status(404).json(formatErrorResponse(404, 'Transaction not found'));

    if (tx.transactionType === 'refund') {
      return res.status(400).json(formatErrorResponse(400, 'Cannot refund a refund transaction'));
    }

    const amount = parseFloat(tx.amount as string);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid transaction amount'));
    }

    const result = await walletService.refundBalance(
      tx.userId!,
      amount,
      tx.referenceId || tx.id
    );

    logger.info('Admin refunded transaction', { txId: id, userId: tx.userId, amount, reason });
    res.json(formatResponse('success', 200, 'Refund issued successfully', {
      transactionId: id,
      refundReference: result.reference,
      amount,
    }));
  } catch (error: any) {
    logger.error('Admin refund error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to issue refund'));
  }
});

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const filterUserId = req.query.userId as string | undefined;
    const filterType = req.query.type as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Build WHERE conditions
    const conditions: any[] = [];
    if (filterUserId) conditions.push(eq(transactions.userId, filterUserId));
    if (filterType && filterType !== 'all') conditions.push(eq(transactions.transactionType, filterType));
    if (startDate) conditions.push(gte(transactions.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(transactions.createdAt, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseSelect = db.select({
      id: transactions.id,
      userId: transactions.userId,
      transactionType: transactions.transactionType,
      amount: transactions.amount,
      description: transactions.description,
      paymentMethod: transactions.paymentMethod,
      referenceId: transactions.referenceId,
      status: transactions.status,
      createdAt: transactions.createdAt,
      userName: users.name,
      userEmail: users.email,
    }).from(transactions).leftJoin(users, eq(transactions.userId, users.id));

    const transactionList = whereClause
      ? await baseSelect.where(whereClause).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset)
      : await baseSelect.orderBy(desc(transactions.createdAt)).limit(limit).offset(offset);

    // Total count for pagination
    const countQ = db.select({ count: count() }).from(transactions);
    const [totalCount] = whereClause
      ? await countQ.where(whereClause)
      : await countQ;

    // Total credits and debits for the entire filtered period (not just this page)
    const totalsQ = db.select({
      totalCredits: sql<number>`COALESCE(SUM(CASE WHEN amount >= 0 THEN amount::numeric ELSE 0 END), 0)`,
      totalDebits: sql<number>`COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount::numeric) ELSE 0 END), 0)`,
    }).from(transactions);
    const [totals] = whereClause
      ? await totalsQ.where(whereClause)
      : await totalsQ;

    res.json(formatResponse('success', 200, 'Transactions retrieved', {
      transactions: transactionList,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
      totals: {
        credits: Number(totals?.totalCredits || 0),
        debits: Number(totals?.totalDebits || 0),
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

router.get('/users/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json(formatResponse('success', 200, 'Search query too short', { users: [] }));
    }

    const searchResults = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
      .from(users)
      .where(sql`(LOWER(${users.email}) LIKE ${`%${q.toLowerCase()}%`} OR LOWER(${users.name}) LIKE ${`%${q.toLowerCase()}%`})`)
      .limit(10);

    res.json(formatResponse('success', 200, 'Users found', { users: searchResults }));
  } catch (error: any) {
    logger.error('Search users error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to search users'));
  }
});

router.get('/admin-users', async (req: Request, res: Response) => {
  try {
    const adminUsersList = await db.select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      isActive: adminUsers.isActive,
      createdAt: adminUsers.createdAt,
    })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true))
      .orderBy(desc(adminUsers.createdAt));

    res.json(formatResponse('success', 200, 'Admin users retrieved', { adminUsers: adminUsersList }));
  } catch (error: any) {
    logger.error('Get admin users error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get admin users'));
  }
});

router.get('/identity-agents', async (req: Request, res: Response) => {
  try {
    const agents = await db.select({
      id: identityAgents.id,
      adminUserId: identityAgents.adminUserId,
      employeeId: identityAgents.employeeId,
      specializations: identityAgents.specializations,
      isAvailable: identityAgents.isAvailable,
      currentActiveRequests: identityAgents.currentActiveRequests,
      totalCompletedRequests: identityAgents.totalCompletedRequests,
      createdAt: identityAgents.createdAt,
      adminName: adminUsers.name,
      adminEmail: adminUsers.email,
    })
      .from(identityAgents)
      .leftJoin(adminUsers, eq(identityAgents.adminUserId, adminUsers.id))
      .orderBy(desc(identityAgents.createdAt));

    res.json(formatResponse('success', 200, 'Identity agents retrieved', { agents }));
  } catch (error: any) {
    logger.error('Get identity agents error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get identity agents'));
  }
});

router.post('/identity-agents', async (req: Request, res: Response) => {
  try {
    const { name, email, password, employeeId, specializations } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Name, email, and password are required'));
    }

    const [existingEmail] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newAdminUser] = await db.insert(adminUsers).values({
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      isActive: true,
    }).returning();

    const [agent] = await db.insert(identityAgents).values({
      adminUserId: newAdminUser.id,
      employeeId: employeeId || null,
      specializations: specializations || ['nin_validation', 'ipe_clearance', 'nin_personalization'],
      isAvailable: true,
    }).returning();

    logger.info('Identity agent created', { agentId: agent.id, adminUserId: newAdminUser.id, createdBy: req.userId });

    res.status(201).json(formatResponse('success', 201, 'Identity agent created', {
      agent: {
        id: agent.id,
        adminUserId: newAdminUser.id,
        adminName: newAdminUser.name,
        adminEmail: newAdminUser.email,
        isAvailable: agent.isAvailable,
      },
    }));
  } catch (error: any) {
    logger.error('Create identity agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create identity agent'));
  }
});

router.put('/identity-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { specializations, isAvailable, employeeId } = req.body;

    const [agent] = await db.select()
      .from(identityAgents)
      .where(eq(identityAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'Identity agent not found'));
    }

    const updateData: any = { updatedAt: new Date() };
    if (specializations !== undefined) updateData.specializations = specializations;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (employeeId !== undefined) updateData.employeeId = employeeId;

    await db.update(identityAgents)
      .set(updateData)
      .where(eq(identityAgents.id, id));

    logger.info('Identity agent updated', { agentId: id, updatedBy: req.userId });

    res.json(formatResponse('success', 200, 'Identity agent updated'));
  } catch (error: any) {
    logger.error('Update identity agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update identity agent'));
  }
});

router.delete('/identity-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [agent] = await db.select()
      .from(identityAgents)
      .where(eq(identityAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'Identity agent not found'));
    }

    await db.delete(identityAgents).where(eq(identityAgents.id, id));

    logger.info('Identity agent deleted', { agentId: id, deletedBy: req.userId });

    res.json(formatResponse('success', 200, 'Identity agent deleted'));
  } catch (error: any) {
    logger.error('Delete identity agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete identity agent'));
  }
});

router.get('/identity-requests', async (req: Request, res: Response) => {
  try {
    const { limit = '50', status } = req.query;

    let query = db.select({
      id: identityServiceRequests.id,
      trackingId: identityServiceRequests.trackingId,
      serviceType: identityServiceRequests.serviceType,
      status: identityServiceRequests.status,
      fee: identityServiceRequests.fee,
      isPaid: identityServiceRequests.isPaid,
      createdAt: identityServiceRequests.createdAt,
      completedAt: identityServiceRequests.completedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(identityServiceRequests)
      .leftJoin(users, eq(identityServiceRequests.userId, users.id))
      .orderBy(desc(identityServiceRequests.createdAt))
      .limit(parseInt(limit as string) || 50);

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(identityServiceRequests.status, status as string));
    } else {
      requests = await query;
    }

    res.json(formatResponse('success', 200, 'Identity requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get identity requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get identity requests'));
  }
});

router.get('/education-agents', async (req: Request, res: Response) => {
  try {
    const agents = await db.select({
      id: educationAgents.id,
      adminUserId: educationAgents.adminUserId,
      employeeId: educationAgents.employeeId,
      specializations: educationAgents.specializations,
      isAvailable: educationAgents.isAvailable,
      currentActiveRequests: educationAgents.currentActiveRequests,
      totalCompletedRequests: educationAgents.totalCompletedRequests,
      createdAt: educationAgents.createdAt,
      adminName: adminUsers.name,
      adminEmail: adminUsers.email,
    })
      .from(educationAgents)
      .leftJoin(adminUsers, eq(educationAgents.adminUserId, adminUsers.id))
      .orderBy(desc(educationAgents.createdAt));

    res.json(formatResponse('success', 200, 'Education agents retrieved', { agents }));
  } catch (error: any) {
    logger.error('Get education agents error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get education agents'));
  }
});

router.post('/education-agents', async (req: Request, res: Response) => {
  try {
    const { name, email, password, employeeId, specializations } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Name, email, and password are required'));
    }

    const [existingEmail] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newAdminUser] = await db.insert(adminUsers).values({
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      isActive: true,
    }).returning();

    const [agent] = await db.insert(educationAgents).values({
      adminUserId: newAdminUser.id,
      employeeId: employeeId || null,
      specializations: specializations || ['jamb', 'waec', 'neco'],
      isAvailable: true,
    }).returning();

    logger.info('Education agent created', { agentId: agent.id, adminUserId: newAdminUser.id, createdBy: req.userId });

    res.status(201).json(formatResponse('success', 201, 'Education agent created', {
      agent: {
        id: agent.id,
        adminUserId: newAdminUser.id,
        adminName: newAdminUser.name,
        adminEmail: newAdminUser.email,
        isAvailable: agent.isAvailable,
      },
    }));
  } catch (error: any) {
    logger.error('Create education agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create education agent'));
  }
});

router.put('/education-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { specializations, isAvailable, employeeId } = req.body;

    const [agent] = await db.select()
      .from(educationAgents)
      .where(eq(educationAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'Education agent not found'));
    }

    const updateData: any = { updatedAt: new Date() };
    if (specializations !== undefined) updateData.specializations = specializations;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (employeeId !== undefined) updateData.employeeId = employeeId;

    await db.update(educationAgents)
      .set(updateData)
      .where(eq(educationAgents.id, id));

    logger.info('Education agent updated', { agentId: id, updatedBy: req.userId });

    res.json(formatResponse('success', 200, 'Education agent updated'));
  } catch (error: any) {
    logger.error('Update education agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update education agent'));
  }
});

router.delete('/education-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [agent] = await db.select()
      .from(educationAgents)
      .where(eq(educationAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'Education agent not found'));
    }

    await db.delete(educationAgents).where(eq(educationAgents.id, id));

    logger.info('Education agent deleted', { agentId: id, deletedBy: req.userId });

    res.json(formatResponse('success', 200, 'Education agent deleted'));
  } catch (error: any) {
    logger.error('Delete education agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete education agent'));
  }
});

// ===== JAMB AGENT MANAGEMENT =====

router.get('/jamb-agents', async (req: Request, res: Response) => {
  try {
    const agents = await db.select({
      id: jambAgents.id,
      adminUserId: jambAgents.adminUserId,
      employeeId: jambAgents.employeeId,
      specializations: jambAgents.specializations,
      isAvailable: jambAgents.isAvailable,
      currentActiveRequests: jambAgents.currentActiveRequests,
      totalCompletedRequests: jambAgents.totalCompletedRequests,
      createdAt: jambAgents.createdAt,
      adminName: adminUsers.name,
      adminEmail: adminUsers.email,
    })
      .from(jambAgents)
      .leftJoin(adminUsers, eq(jambAgents.adminUserId, adminUsers.id))
      .orderBy(desc(jambAgents.createdAt));

    res.json(formatResponse('success', 200, 'JAMB agents retrieved', { agents }));
  } catch (error: any) {
    logger.error('Get JAMB agents error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get JAMB agents'));
  }
});

router.post('/jamb-agents', async (req: Request, res: Response) => {
  try {
    const { name, email, password, employeeId, specializations } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Name, email, and password are required'));
    }

    const [existingEmail] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newAdminUser] = await db.insert(adminUsers).values({
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      isActive: true,
    }).returning();

    const [agent] = await db.insert(jambAgents).values({
      adminUserId: newAdminUser.id,
      employeeId: employeeId || null,
      specializations: specializations || ['olevel-upload', 'admission-letter', 'original-result', 'pin-vending', 'reprinting-caps'],
      isAvailable: true,
    }).returning();

    logger.info('JAMB agent created', { agentId: agent.id, adminUserId: newAdminUser.id, createdBy: req.userId });

    res.status(201).json(formatResponse('success', 201, 'JAMB agent created', {
      agent: {
        id: agent.id,
        adminUserId: newAdminUser.id,
        adminName: newAdminUser.name,
        adminEmail: newAdminUser.email,
        isAvailable: agent.isAvailable,
      },
    }));
  } catch (error: any) {
    logger.error('Create JAMB agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create JAMB agent'));
  }
});

router.put('/jamb-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { specializations, isAvailable, employeeId } = req.body;

    const [agent] = await db.select()
      .from(jambAgents)
      .where(eq(jambAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'JAMB agent not found'));
    }

    const updateData: any = { updatedAt: new Date() };
    if (specializations !== undefined) updateData.specializations = specializations;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (employeeId !== undefined) updateData.employeeId = employeeId;

    await db.update(jambAgents)
      .set(updateData)
      .where(eq(jambAgents.id, id));

    logger.info('JAMB agent updated', { agentId: id, updatedBy: req.userId });

    res.json(formatResponse('success', 200, 'JAMB agent updated'));
  } catch (error: any) {
    logger.error('Update JAMB agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update JAMB agent'));
  }
});

router.delete('/jamb-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [agent] = await db.select()
      .from(jambAgents)
      .where(eq(jambAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'JAMB agent not found'));
    }

    await db.delete(jambAgents).where(eq(jambAgents.id, id));

    logger.info('JAMB agent deleted', { agentId: id, deletedBy: req.userId });

    res.json(formatResponse('success', 200, 'JAMB agent deleted'));
  } catch (error: any) {
    logger.error('Delete JAMB agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete JAMB agent'));
  }
});

router.get('/jamb-requests', async (req: Request, res: Response) => {
  try {
    const { limit: lim = '50', status } = req.query;

    let query = db.select({
      id: jambServiceRequests.id,
      trackingId: jambServiceRequests.trackingId,
      serviceType: jambServiceRequests.serviceType,
      registrationNumber: jambServiceRequests.registrationNumber,
      candidateName: jambServiceRequests.candidateName,
      status: jambServiceRequests.status,
      fee: jambServiceRequests.fee,
      isPaid: jambServiceRequests.isPaid,
      createdAt: jambServiceRequests.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(jambServiceRequests)
      .leftJoin(users, eq(jambServiceRequests.userId, users.id))
      .orderBy(desc(jambServiceRequests.createdAt))
      .limit(parseInt(lim as string) || 50);

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(jambServiceRequests.status, status as string));
    } else {
      requests = await query;
    }

    res.json(formatResponse('success', 200, 'JAMB requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Admin get JAMB requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get JAMB requests'));
  }
});

router.get('/education-requests', async (req: Request, res: Response) => {
  try {
    const { limit = '50', status } = req.query;

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
      createdAt: educationServiceRequests.createdAt,
      completedAt: educationServiceRequests.completedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(educationServiceRequests)
      .leftJoin(users, eq(educationServiceRequests.userId, users.id))
      .orderBy(desc(educationServiceRequests.createdAt))
      .limit(parseInt(limit as string) || 50);

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(educationServiceRequests.status, status as string));
    } else {
      requests = await query;
    }

    res.json(formatResponse('success', 200, 'Education requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get education requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get education requests'));
  }
});

// ============================================
// EDUCATION PIN INVENTORY MANAGEMENT
// ============================================

// Get PIN stock summary
router.get('/education-pins/stock', async (req: Request, res: Response) => {
  try {
    const examTypes = ['waec', 'neco', 'nabteb', 'nbais'];
    const stockSummary: any[] = [];

    for (const examType of examTypes) {
      const [unused] = await db.select({ count: count() })
        .from(educationPins)
        .where(sql`${educationPins.examType} = ${examType} AND ${educationPins.status} = 'unused'`);
      
      const [used] = await db.select({ count: count() })
        .from(educationPins)
        .where(sql`${educationPins.examType} = ${examType} AND ${educationPins.status} = 'used'`);

      stockSummary.push({
        examType: examType.toUpperCase(),
        available: unused?.count || 0,
        used: used?.count || 0,
        total: (unused?.count || 0) + (used?.count || 0),
      });
    }

    res.json(formatResponse('success', 200, 'PIN stock retrieved', { stock: stockSummary }));
  } catch (error: any) {
    logger.error('Get PIN stock error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PIN stock'));
  }
});

// Get all PINs with pagination
router.get('/education-pins', async (req: Request, res: Response) => {
  try {
    const { examType, status, limit = '50', offset = '0' } = req.query;

    let baseQuery = db.select({
      id: educationPins.id,
      examType: educationPins.examType,
      pinCode: educationPins.pinCode,
      serialNumber: educationPins.serialNumber,
      status: educationPins.status,
      usedAt: educationPins.usedAt,
      createdAt: educationPins.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(educationPins)
      .leftJoin(users, eq(educationPins.usedByUserId, users.id))
      .orderBy(desc(educationPins.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    let conditions: any[] = [];
    if (examType) {
      conditions.push(eq(educationPins.examType, (examType as string).toLowerCase()));
    }
    if (status) {
      conditions.push(eq(educationPins.status, status as string));
    }

    let pins;
    if (conditions.length > 0) {
      pins = await baseQuery.where(sql`${conditions.map((c, i) => i === 0 ? c : sql` AND ${c}`).reduce((a, b) => sql`${a}${b}`)}`);
    } else {
      pins = await baseQuery;
    }

    // Mask PIN codes for security (show first 4 and last 4 characters)
    const maskedPins = pins.map(pin => ({
      ...pin,
      pinCode: pin.status === 'unused' 
        ? `${pin.pinCode.substring(0, 4)}****${pin.pinCode.substring(pin.pinCode.length - 4)}`
        : pin.pinCode,
    }));

    res.json(formatResponse('success', 200, 'PINs retrieved', { pins: maskedPins }));
  } catch (error: any) {
    logger.error('Get PINs error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PINs'));
  }
});

// Add single PIN
router.post('/education-pins', async (req: Request, res: Response) => {
  try {
    const { examType, pinCode, serialNumber } = req.body;

    if (!examType || !pinCode) {
      return res.status(400).json(formatErrorResponse(400, 'Exam type and PIN code are required'));
    }

    const validExamTypes = ['waec', 'neco', 'nabteb', 'nbais'];
    if (!validExamTypes.includes(examType.toLowerCase())) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid exam type'));
    }

    // Check for duplicate PIN
    const [existing] = await db.select()
      .from(educationPins)
      .where(sql`${educationPins.examType} = ${examType.toLowerCase()} AND ${educationPins.pinCode} = ${pinCode}`)
      .limit(1);

    if (existing) {
      return res.status(400).json(formatErrorResponse(400, 'PIN already exists'));
    }

    const [newPin] = await db.insert(educationPins).values({
      examType: examType.toLowerCase(),
      pinCode,
      serialNumber: serialNumber || null,
      status: 'unused',
    }).returning();

    logger.info('PIN added', { examType, adminId: req.userId });
    res.status(201).json(formatResponse('success', 201, 'PIN added successfully', { pin: newPin }));
  } catch (error: any) {
    logger.error('Add PIN error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to add PIN'));
  }
});

// Bulk upload PINs via CSV data
router.post('/education-pins/bulk', async (req: Request, res: Response) => {
  try {
    const { examType, pins } = req.body;

    if (!examType || !pins || !Array.isArray(pins)) {
      return res.status(400).json(formatErrorResponse(400, 'Exam type and pins array are required'));
    }

    const validExamTypes = ['waec', 'neco', 'nabteb', 'nbais'];
    if (!validExamTypes.includes(examType.toLowerCase())) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid exam type'));
    }

    let successCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    for (const pin of pins) {
      try {
        const pinCode = typeof pin === 'string' ? pin : pin.pinCode || pin.pin;
        const serialNumber = typeof pin === 'object' ? (pin.serialNumber || pin.serial) : null;

        if (!pinCode) {
          errors.push('Empty PIN code skipped');
          continue;
        }

        // Check for duplicate
        const [existing] = await db.select({ id: educationPins.id })
          .from(educationPins)
          .where(sql`${educationPins.examType} = ${examType.toLowerCase()} AND ${educationPins.pinCode} = ${pinCode}`)
          .limit(1);

        if (existing) {
          duplicateCount++;
          continue;
        }

        await db.insert(educationPins).values({
          examType: examType.toLowerCase(),
          pinCode,
          serialNumber,
          status: 'unused',
        });

        successCount++;
      } catch (pinError: any) {
        errors.push(pinError.message);
      }
    }

    logger.info('Bulk PIN upload', { examType, successCount, duplicateCount, adminId: req.userId });
    
    res.json(formatResponse('success', 200, 'Bulk upload completed', {
      successCount,
      duplicateCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    }));
  } catch (error: any) {
    logger.error('Bulk PIN upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to upload PINs'));
  }
});

// Delete unused PIN
router.delete('/education-pins/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [pin] = await db.select()
      .from(educationPins)
      .where(eq(educationPins.id, id))
      .limit(1);

    if (!pin) {
      return res.status(404).json(formatErrorResponse(404, 'PIN not found'));
    }

    if (pin.status === 'used') {
      return res.status(400).json(formatErrorResponse(400, 'Cannot delete used PIN'));
    }

    await db.delete(educationPins).where(eq(educationPins.id, id));

    logger.info('PIN deleted', { adminId: req.userId });
    res.json(formatResponse('success', 200, 'PIN deleted successfully'));
  } catch (error: any) {
    logger.error('Delete PIN error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete PIN'));
  }
});

// Get PIN orders
router.get('/education-pin-orders', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;

    let query = db.select({
      id: educationPinOrders.id,
      examType: educationPinOrders.examType,
      amount: educationPinOrders.amount,
      status: educationPinOrders.status,
      deliveredPin: educationPinOrders.deliveredPin,
      deliveredSerial: educationPinOrders.deliveredSerial,
      failureReason: educationPinOrders.failureReason,
      createdAt: educationPinOrders.createdAt,
      completedAt: educationPinOrders.completedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(educationPinOrders)
      .leftJoin(users, eq(educationPinOrders.userId, users.id))
      .orderBy(desc(educationPinOrders.createdAt))
      .limit(parseInt(limit as string));

    let orders;
    if (status && status !== 'all') {
      orders = await query.where(eq(educationPinOrders.status, status as string));
    } else {
      orders = await query;
    }

    res.json(formatResponse('success', 200, 'PIN orders retrieved', { orders }));
  } catch (error: any) {
    logger.error('Get PIN orders error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get PIN orders'));
  }
});

// ===================== A2C (Airtime to Cash) Agent Routes =====================

// Get all A2C agents
router.get('/a2c-agents', async (req: Request, res: Response) => {
  try {
    const agents = await db.select({
      id: a2cAgents.id,
      adminUserId: a2cAgents.adminUserId,
      employeeId: a2cAgents.employeeId,
      supportedNetworks: a2cAgents.supportedNetworks,
      isAvailable: a2cAgents.isAvailable,
      currentActiveRequests: a2cAgents.currentActiveRequests,
      totalCompletedRequests: a2cAgents.totalCompletedRequests,
      totalProcessedAmount: a2cAgents.totalProcessedAmount,
      createdAt: a2cAgents.createdAt,
      adminName: adminUsers.name,
      adminEmail: adminUsers.email,
    })
      .from(a2cAgents)
      .leftJoin(adminUsers, eq(a2cAgents.adminUserId, adminUsers.id))
      .orderBy(desc(a2cAgents.createdAt));

    res.json(formatResponse('success', 200, 'A2C agents retrieved', { agents }));
  } catch (error: any) {
    logger.error('Get A2C agents error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get A2C agents'));
  }
});

// Create A2C agent
router.post('/a2c-agents', async (req: Request, res: Response) => {
  try {
    const { name, email, password, employeeId, supportedNetworks } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Name, email, and password are required'));
    }

    const [existingEmail] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let a2cAgentRole = await db.select()
      .from(adminRoles)
      .where(eq(adminRoles.name, 'A2C_AGENT'))
      .limit(1);

    if (a2cAgentRole.length === 0) {
      const [newRole] = await db.insert(adminRoles).values({
        name: 'A2C_AGENT',
        description: 'Airtime to Cash Agent role',
        permissions: ['a2c:view', 'a2c:process', 'a2c:update'],
        isActive: true,
      }).returning();
      a2cAgentRole = [newRole];
    }

    const [newAdminUser] = await db.insert(adminUsers).values({
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      roleId: a2cAgentRole[0].id,
      isActive: true,
    }).returning();

    const [agent] = await db.insert(a2cAgents).values({
      adminUserId: newAdminUser.id,
      employeeId: employeeId || `A2C${Date.now().toString(36).toUpperCase()}`,
      supportedNetworks: supportedNetworks || ['mtn', 'airtel', 'glo', '9mobile'],
      isAvailable: true,
    }).returning();

    logger.info('A2C agent created', { agentId: agent.id, adminUserId: newAdminUser.id, createdBy: req.userId });

    res.status(201).json(formatResponse('success', 201, 'A2C agent created', {
      agent: {
        id: agent.id,
        adminUserId: newAdminUser.id,
        adminName: newAdminUser.name,
        adminEmail: newAdminUser.email,
        employeeId: agent.employeeId,
        isAvailable: agent.isAvailable,
      },
    }));
  } catch (error: any) {
    logger.error('Create A2C agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create A2C agent'));
  }
});

// Update A2C agent
router.put('/a2c-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supportedNetworks, isAvailable, employeeId, maxActiveRequests } = req.body;

    const [agent] = await db.select()
      .from(a2cAgents)
      .where(eq(a2cAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'A2C agent not found'));
    }

    const updateData: any = { updatedAt: new Date() };
    if (supportedNetworks !== undefined) updateData.supportedNetworks = supportedNetworks;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (maxActiveRequests !== undefined) updateData.maxActiveRequests = maxActiveRequests;

    await db.update(a2cAgents)
      .set(updateData)
      .where(eq(a2cAgents.id, id));

    logger.info('A2C agent updated', { agentId: id, updatedBy: req.userId });

    res.json(formatResponse('success', 200, 'A2C agent updated'));
  } catch (error: any) {
    logger.error('Update A2C agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update A2C agent'));
  }
});

// Delete A2C agent
router.delete('/a2c-agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [agent] = await db.select()
      .from(a2cAgents)
      .where(eq(a2cAgents.id, id))
      .limit(1);

    if (!agent) {
      return res.status(404).json(formatErrorResponse(404, 'A2C agent not found'));
    }

    await db.delete(a2cAgents).where(eq(a2cAgents.id, id));

    if (agent.adminUserId) {
      await db.delete(adminUsers).where(eq(adminUsers.id, agent.adminUserId));
    }

    logger.info('A2C agent deleted', { agentId: id, deletedBy: req.userId });

    res.json(formatResponse('success', 200, 'A2C agent deleted'));
  } catch (error: any) {
    logger.error('Delete A2C agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete A2C agent'));
  }
});

// Get A2C requests
router.get('/a2c-requests', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;

    let query = db.select({
      id: a2cRequests.id,
      trackingId: a2cRequests.trackingId,
      network: a2cRequests.network,
      phoneNumber: a2cRequests.phoneNumber,
      airtimeAmount: a2cRequests.airtimeAmount,
      conversionRate: a2cRequests.conversionRate,
      cashAmount: a2cRequests.cashAmount,
      receivingNumber: a2cRequests.receivingNumber,
      status: a2cRequests.status,
      createdAt: a2cRequests.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(a2cRequests)
      .leftJoin(users, eq(a2cRequests.userId, users.id))
      .orderBy(desc(a2cRequests.createdAt))
      .limit(parseInt(limit as string));

    let requests;
    if (status && status !== 'all') {
      requests = await query.where(eq(a2cRequests.status, status as string));
    } else {
      requests = await query;
    }

    res.json(formatResponse('success', 200, 'A2C requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get A2C requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get A2C requests'));
  }
});

// NBAIS Schools Management
router.get('/nbais-schools/stats', async (req: Request, res: Response) => {
  try {
    const schoolCount = await getSchoolsCount();
    res.json(formatResponse('success', 200, 'NBAIS schools stats retrieved', { 
      totalSchools: schoolCount,
      lastUpdated: null
    }));
  } catch (error: any) {
    logger.error('Get NBAIS schools stats error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get NBAIS schools stats'));
  }
});

router.post('/nbais-schools/scrape', async (req: Request, res: Response) => {
  try {
    logger.info('Admin triggered NBAIS schools scraping', { adminId: req.userId });
    
    const poolResult = await browserPool.acquire();
    if (!poolResult) {
      return res.status(503).json(formatErrorResponse(503, 'Browser pool unavailable. Please try again later.'));
    }
    
    const { browser, release } = poolResult;
    
    try {
      const result = await scrapeNbaisSchools(browser);
      
      if (result.success) {
        logger.info('NBAIS schools scraping completed', { count: result.count });
        res.json(formatResponse('success', 200, result.message, { 
          schoolsScraped: result.count 
        }));
      } else {
        logger.error('NBAIS schools scraping failed', { message: result.message });
        res.status(500).json(formatErrorResponse(500, result.message));
      }
    } finally {
      await release();
    }
  } catch (error: any) {
    logger.error('NBAIS schools scraping error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to scrape NBAIS schools'));
  }
});

// ============ WhatsApp Notification Management ============

// Get WhatsApp templates
router.get('/whatsapp/templates', async (req: Request, res: Response) => {
  try {
    const templates = await db.select().from(whatsappTemplates).orderBy(desc(whatsappTemplates.createdAt));
    res.json(formatResponse('success', 200, 'Templates retrieved', { templates }));
  } catch (error: any) {
    logger.error('Get WhatsApp templates error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get templates'));
  }
});

// Create/Update WhatsApp template
router.post('/whatsapp/templates', async (req: Request, res: Response) => {
  try {
    const { id, templateName, displayName, description, templateContent, variables, category, metaTemplateId, isActive } = req.body;

    if (!templateName || !displayName || !templateContent || !category) {
      return res.status(400).json(formatErrorResponse(400, 'Missing required fields'));
    }

    if (id) {
      await db.update(whatsappTemplates)
        .set({
          templateName,
          displayName,
          description,
          templateContent,
          variables: variables || [],
          category,
          metaTemplateId,
          isActive: isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(whatsappTemplates.id, id));
      res.json(formatResponse('success', 200, 'Template updated'));
    } else {
      await db.insert(whatsappTemplates).values({
        templateName,
        displayName,
        description,
        templateContent,
        variables: variables || [],
        category,
        metaTemplateId,
        isActive: isActive ?? true,
      });
      res.json(formatResponse('success', 201, 'Template created'));
    }
  } catch (error: any) {
    logger.error('Save WhatsApp template error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to save template'));
  }
});

// Delete WhatsApp template
router.delete('/whatsapp/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
    res.json(formatResponse('success', 200, 'Template deleted'));
  } catch (error: any) {
    logger.error('Delete WhatsApp template error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete template'));
  }
});

// Initialize default WhatsApp templates
router.post('/whatsapp/templates/init', async (req: Request, res: Response) => {
  try {
    await whatsappService.createDefaultTemplates();
    res.json(formatResponse('success', 200, 'Default templates initialized'));
  } catch (error: any) {
    logger.error('Init WhatsApp templates error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to initialize templates'));
  }
});

// Get agent channels (WhatsApp numbers)
router.get('/whatsapp/channels', async (req: Request, res: Response) => {
  try {
    const { agentType } = req.query;
    let channels;
    if (agentType) {
      channels = await db.select().from(agentChannels).where(eq(agentChannels.agentType, agentType as string));
    } else {
      channels = await db.select().from(agentChannels);
    }
    res.json(formatResponse('success', 200, 'Channels retrieved', { channels }));
  } catch (error: any) {
    logger.error('Get agent channels error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get channels'));
  }
});

// Add/Update agent WhatsApp channel
router.post('/whatsapp/channels', async (req: Request, res: Response) => {
  try {
    const { id, agentType, agentId, channelType, channelValue, isActive } = req.body;

    if (!agentType || !agentId || !channelValue) {
      return res.status(400).json(formatErrorResponse(400, 'Missing required fields'));
    }

    if (id) {
      await db.update(agentChannels)
        .set({
          agentType,
          agentId,
          channelType: channelType || 'whatsapp',
          channelValue,
          isActive: isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(agentChannels.id, id));
      res.json(formatResponse('success', 200, 'Channel updated'));
    } else {
      await db.insert(agentChannels).values({
        agentType,
        agentId,
        channelType: channelType || 'whatsapp',
        channelValue,
        isActive: isActive ?? true,
      });
      res.json(formatResponse('success', 201, 'Channel added'));
    }
  } catch (error: any) {
    logger.error('Save agent channel error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to save channel'));
  }
});

// Delete agent channel
router.delete('/whatsapp/channels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(agentChannels).where(eq(agentChannels.id, id));
    res.json(formatResponse('success', 200, 'Channel deleted'));
  } catch (error: any) {
    logger.error('Delete agent channel error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete channel'));
  }
});

// Get notification queue status
router.get('/whatsapp/notifications', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;
    let notifications;
    if (status && status !== 'all') {
      notifications = await db.select()
        .from(agentNotifications)
        .where(eq(agentNotifications.status, status as string))
        .orderBy(desc(agentNotifications.createdAt))
        .limit(parseInt(limit as string));
    } else {
      notifications = await db.select()
        .from(agentNotifications)
        .orderBy(desc(agentNotifications.createdAt))
        .limit(parseInt(limit as string));
    }
    res.json(formatResponse('success', 200, 'Notifications retrieved', { notifications }));
  } catch (error: any) {
    logger.error('Get notifications error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get notifications'));
  }
});

// Process queued notifications
router.post('/whatsapp/notifications/process', async (req: Request, res: Response) => {
  try {
    const processed = await whatsappService.processQueuedNotifications(10);
    res.json(formatResponse('success', 200, `Processed ${processed} notifications`, { processed }));
  } catch (error: any) {
    logger.error('Process notifications error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to process notifications'));
  }
});

// ==================== SUPPORT TICKET MANAGEMENT ====================

router.get('/support/tickets', async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo } = req.query;

    let conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(support_tickets.status, status as string));
    }
    if (priority && priority !== 'all') {
      conditions.push(eq(support_tickets.priority, priority as string));
    }
    if (assignedTo === 'unassigned') {
      conditions.push(sql`${support_tickets.assignedAgentId} IS NULL`);
    } else if (assignedTo && assignedTo !== 'all') {
      conditions.push(eq(support_tickets.assignedAgentId, assignedTo as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const tickets = await db.select({
      id: support_tickets.id,
      referenceId: support_tickets.referenceId,
      userId: support_tickets.userId,
      subject: support_tickets.subject,
      category: support_tickets.category,
      status: support_tickets.status,
      priority: support_tickets.priority,
      assignedAgentId: support_tickets.assignedAgentId,
      escalatedAt: support_tickets.escalatedAt,
      assignedAt: support_tickets.assignedAt,
      resolvedAt: support_tickets.resolvedAt,
      closedAt: support_tickets.closedAt,
      lastActivityAt: support_tickets.lastActivityAt,
      createdAt: support_tickets.createdAt,
    })
      .from(support_tickets)
      .where(whereClause)
      .orderBy(desc(support_tickets.createdAt));

    const enriched = await Promise.all(tickets.map(async (t) => {
      const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, t.userId)).limit(1);
      let agentName = null;
      if (t.assignedAgentId) {
        const [agent] = await db.select({ name: admin_users.name })
          .from(admin_users).where(eq(admin_users.id, t.assignedAgentId)).limit(1);
        agentName = agent?.name || null;
      }
      const lastMsg = await db.select({ content: support_messages.content, senderType: support_messages.senderType, createdAt: support_messages.createdAt })
        .from(support_messages)
        .innerJoin(support_conversations, eq(support_messages.conversationId, support_conversations.id))
        .where(eq(support_conversations.ticketId, t.id))
        .orderBy(desc(support_messages.createdAt))
        .limit(1);
      return {
        ...t,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        agentName,
        lastMessage: lastMsg[0] || null,
      };
    }));

    res.json(formatResponse('success', 200, 'Tickets retrieved', { tickets: enriched }));
  } catch (error: any) {
    logger.error('Get tickets error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get tickets'));
  }
});

router.get('/support/tickets/stats', async (req: Request, res: Response) => {
  try {
    const [stats] = await db.select({
      total: count(),
      open: sql<number>`COUNT(*) FILTER (WHERE ${support_tickets.status} = 'open')`,
      escalated: sql<number>`COUNT(*) FILTER (WHERE ${support_tickets.status} = 'escalated')`,
      assigned: sql<number>`COUNT(*) FILTER (WHERE ${support_tickets.status} = 'assigned')`,
      inProgress: sql<number>`COUNT(*) FILTER (WHERE ${support_tickets.status} = 'in_progress')`,
      resolved: sql<number>`COUNT(*) FILTER (WHERE ${support_tickets.status} = 'resolved')`,
      closed: sql<number>`COUNT(*) FILTER (WHERE ${support_tickets.status} = 'closed')`,
    }).from(support_tickets);

    res.json(formatResponse('success', 200, 'Stats retrieved', { stats }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get stats'));
  }
});

router.get('/support/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [ticket] = await db.select()
      .from(support_tickets)
      .where(eq(support_tickets.id, id))
      .limit(1);

    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));

    const [user] = await db.select({ name: usersTable.name, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);

    let agentName = null;
    if (ticket.assignedAgentId) {
      const [agent] = await db.select({ name: admin_users.name })
        .from(admin_users).where(eq(admin_users.id, ticket.assignedAgentId)).limit(1);
      agentName = agent?.name || null;
    }

    const [conv] = await db.select()
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, id))
      .limit(1);

    res.json(formatResponse('success', 200, 'Ticket detail', {
      ticket: { ...ticket, agentName },
      user: user || null,
      conversationId: conv?.id || null,
      isActive: conv?.isActive ?? true,
    }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get ticket'));
  }
});

router.get('/support/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const since = req.query.since as string;

    const [conversation] = await db.select()
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, id))
      .limit(1);

    if (!conversation) return res.json(formatResponse('success', 200, 'No messages', { messages: [], presence: [] }));

    let msgs;
    if (since) {
      msgs = await db.select()
        .from(support_messages)
        .where(and(
          eq(support_messages.conversationId, conversation.id),
          gt(support_messages.createdAt, new Date(since))
        ))
        .orderBy(support_messages.createdAt);
    } else {
      msgs = await db.select()
        .from(support_messages)
        .where(eq(support_messages.conversationId, conversation.id))
        .orderBy(support_messages.createdAt);
    }

    const presence = await db.select()
      .from(support_presence)
      .where(eq(support_presence.ticketId, id));

    const now = new Date();
    const presenceData = presence.map(p => ({
      participantId: p.participantId,
      participantType: p.participantType,
      participantName: p.participantName,
      isOnline: p.lastSeenAt ? (now.getTime() - new Date(p.lastSeenAt).getTime() < 15000) : false,
      isTyping: p.isTyping && p.typingAt ? (now.getTime() - new Date(p.typingAt).getTime() < 5000) : false,
    }));

    res.json(formatResponse('success', 200, 'Messages retrieved', {
      messages: msgs,
      presence: presenceData,
      conversationId: conversation.id,
      isActive: conversation.isActive,
    }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get messages'));
  }
});

router.post('/support/tickets/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = req.userId!;
    const now = new Date();

    const [agent] = await db.select({ name: admin_users.name })
      .from(admin_users).where(eq(admin_users.id, agentId)).limit(1);

    await db.update(support_tickets)
      .set({
        assignedAgentId: agentId,
        assignedAt: now,
        status: 'assigned',
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(support_tickets.id, id));

    const [conv] = await db.select({ id: support_conversations.id })
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, id))
      .limit(1);

    if (conv) {
      await db.insert(support_messages).values({
        conversationId: conv.id,
        senderType: 'system',
        senderName: 'System',
        content: `Agent ${agent?.name || 'Support Agent'} has been assigned to your ticket and will assist you shortly.`,
      });
    }

    await db.insert(support_presence).values({
      ticketId: id,
      participantId: agentId,
      participantType: 'agent',
      participantName: agent?.name || 'Agent',
      isOnline: true,
      lastSeenAt: now,
    }).onConflictDoNothing();

    logger.info('Ticket assigned', { ticketId: id, agentId });
    res.json(formatResponse('success', 200, 'Ticket assigned'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to assign ticket'));
  }
});

router.post('/support/upload', agentSupportUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(formatErrorResponse(400, 'No file uploaded'));
    const fileUrl = `/api/support/files/${req.file.filename}`;
    res.json(formatResponse('success', 200, 'File uploaded', {
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to upload file'));
  }
});

router.post('/support/tickets/:id/reply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, fileUrl, fileName } = req.body;
    const agentId = req.userId!;

    if (!content?.trim() && !fileUrl) {
      return res.status(400).json(formatErrorResponse(400, 'Reply content or file is required'));
    }

    const [agent] = await db.select({ name: admin_users.name })
      .from(admin_users).where(eq(admin_users.id, agentId)).limit(1);

    const [conv] = await db.select()
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, id))
      .limit(1);

    if (!conv) return res.status(404).json(formatErrorResponse(404, 'Conversation not found'));

    const [message] = await db.insert(support_messages).values({
      conversationId: conv.id,
      senderType: 'agent',
      senderId: agentId,
      senderName: agent?.name || 'Support Agent',
      content: content?.trim() || (fileName ? `Sent a file: ${fileName}` : 'Sent a file'),
      fileUrl: fileUrl || null,
      attachments: fileUrl ? [{ url: fileUrl, name: fileName || 'File', type: 'file' }] : [],
    }).returning();

    const now = new Date();
    await db.update(support_conversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(support_conversations.id, conv.id));

    await db.update(support_tickets)
      .set({ status: 'in_progress', lastActivityAt: now, updatedAt: now })
      .where(eq(support_tickets.id, id));

    await db.update(support_presence)
      .set({ isTyping: false, lastSeenAt: now })
      .where(and(
        eq(support_presence.ticketId, id),
        eq(support_presence.participantId, agentId)
      ));

    res.status(201).json(formatResponse('success', 201, 'Reply sent', { message }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to send reply'));
  }
});

router.post('/support/tickets/:id/suggestions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [conv] = await db.select()
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, id))
      .limit(1);

    if (!conv) return res.status(404).json(formatErrorResponse(404, 'Conversation not found'));

    const msgs = await db.select()
      .from(support_messages)
      .where(eq(support_messages.conversationId, conv.id))
      .orderBy(desc(support_messages.createdAt))
      .limit(15);

    const conversationHistory = msgs.reverse().map(m => `${m.senderType}: ${m.content}`).join('\n');

    const [ticket] = await db.select({ subject: support_tickets.subject, category: support_tickets.category })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);

    let suggestions: string[] = [];
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping a support agent at Arapoint (Nigerian identity verification and fintech platform). Based on the conversation below, generate exactly 3 helpful reply suggestions the agent could send to the user.

Each suggestion should be professional, helpful, and directly address the user's concern. Keep each suggestion concise (1-3 sentences max).

Return ONLY a JSON array of 3 strings, no other text. Example: ["suggestion 1", "suggestion 2", "suggestion 3"]

Ticket subject: ${ticket?.subject || 'Support request'}
Category: ${ticket?.category || 'general'}`
          },
          { role: 'user', content: conversationHistory },
        ],
      });

      const raw = response.choices[0].message.content || '[]';
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          suggestions = parsed.slice(0, 3).map(String);
        }
      } catch {
        const matches = raw.match(/"([^"]+)"/g);
        if (matches) {
          suggestions = matches.slice(0, 3).map(m => m.replace(/"/g, ''));
        }
      }
    } catch (error) {
      logger.error('AI suggestion error', { error });
      suggestions = [
        'Thank you for reaching out. Let me look into this for you.',
        'I understand your concern. Could you please provide more details?',
        'I\'m working on resolving this issue. I\'ll update you shortly.',
      ];
    }

    res.json(formatResponse('success', 200, 'Suggestions generated', { suggestions }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to generate suggestions'));
  }
});

router.post('/support/tickets/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['open', 'escalated', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid status'));
    }

    const now = new Date();
    const updateData: any = { status, lastActivityAt: now, updatedAt: now };

    if (status === 'resolved') updateData.resolvedAt = now;
    if (status === 'closed') updateData.closedAt = now;
    if (status === 'escalated') updateData.escalatedAt = now;

    await db.update(support_tickets).set(updateData).where(eq(support_tickets.id, id));

    if (status === 'resolved' || status === 'closed') {
      await db.update(support_conversations)
        .set({ isActive: false, closedReason: status === 'resolved' ? 'resolved' : 'closed_by_agent', updatedAt: now })
        .where(eq(support_conversations.ticketId, id));

      const [conv] = await db.select({ id: support_conversations.id })
        .from(support_conversations)
        .where(eq(support_conversations.ticketId, id))
        .limit(1);

      if (conv) {
        await db.insert(support_messages).values({
          conversationId: conv.id,
          senderType: 'system',
          senderName: 'System',
          content: status === 'resolved'
            ? 'This ticket has been marked as resolved by the support agent. Thank you for contacting Arapoint support.'
            : 'This ticket has been closed by the support agent.',
        });
      }
    }

    res.json(formatResponse('success', 200, 'Status updated'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to update status'));
  }
});

router.post('/support/tickets/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const agentId = req.userId!;

    if (!note?.trim()) {
      return res.status(400).json(formatErrorResponse(400, 'Note content is required'));
    }

    const [newNote] = await db.insert(support_internal_notes).values({
      ticketId: id,
      agentId,
      note: note.trim(),
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'Note added', { note: newNote }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to add note'));
  }
});

router.get('/support/tickets/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notes = await db.select()
      .from(support_internal_notes)
      .where(eq(support_internal_notes.ticketId, id))
      .orderBy(desc(support_internal_notes.createdAt));

    const enriched = await Promise.all(notes.map(async (n) => {
      const [agent] = await db.select({ name: admin_users.name })
        .from(admin_users).where(eq(admin_users.id, n.agentId)).limit(1);
      return { ...n, agentName: agent?.name || 'Unknown' };
    }));

    res.json(formatResponse('success', 200, 'Notes retrieved', { notes: enriched }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get notes'));
  }
});

router.post('/support/presence/heartbeat', async (req: Request, res: Response) => {
  try {
    const agentId = req.userId!;
    const { ticketId, isTyping } = req.body;
    const now = new Date();

    const [existing] = await db.select()
      .from(support_presence)
      .where(and(
        eq(support_presence.ticketId, ticketId),
        eq(support_presence.participantId, agentId)
      ))
      .limit(1);

    if (existing) {
      await db.update(support_presence)
        .set({
          isOnline: true,
          isTyping: !!isTyping,
          lastSeenAt: now,
          typingAt: isTyping ? now : existing.typingAt,
        })
        .where(eq(support_presence.id, existing.id));
    } else {
      const [agent] = await db.select({ name: admin_users.name })
        .from(admin_users).where(eq(admin_users.id, agentId)).limit(1);
      await db.insert(support_presence).values({
        ticketId,
        participantId: agentId,
        participantType: 'agent',
        participantName: agent?.name || 'Agent',
        isOnline: true,
        isTyping: !!isTyping,
        lastSeenAt: now,
        typingAt: isTyping ? now : undefined,
      });
    }

    res.json(formatResponse('success', 200, 'OK'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed'));
  }
});

// Agent Management
router.get('/support/agents', async (req: Request, res: Response) => {
  try {
    const agents = await db.select({
      id: admin_users.id,
      name: admin_users.name,
      email: admin_users.email,
      isActive: admin_users.isActive,
      createdAt: admin_users.createdAt,
    })
      .from(admin_users)
      .innerJoin(admin_roles, eq(admin_users.roleId, admin_roles.id))
      .where(eq(admin_roles.name, 'support_agent'));

    const enriched = await Promise.all(agents.map(async (a) => {
      const [assignedCount] = await db.select({ count: count() })
        .from(support_tickets)
        .where(and(
          eq(support_tickets.assignedAgentId, a.id),
          sql`${support_tickets.status} NOT IN ('closed', 'resolved')`
        ));
      return { ...a, activeTickets: assignedCount?.count || 0 };
    }));

    res.json(formatResponse('success', 200, 'Agents retrieved', { agents: enriched }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get agents'));
  }
});

router.post('/support/agents', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Name, email, and password are required'));
    }

    const existingUser = await db.select()
      .from(admin_users)
      .where(eq(admin_users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json(formatErrorResponse(409, 'Email already exists'));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let supportRole = await db.select()
      .from(admin_roles)
      .where(eq(admin_roles.name, 'support_agent'))
      .limit(1);

    if (supportRole.length === 0) {
      const [newRole] = await db.insert(admin_roles).values({
        name: 'support_agent',
        description: 'Support Agent role with access to support tickets',
        permissions: ['support:view', 'support:reply'],
        isActive: true,
      }).returning();
      supportRole = [newRole];
    }

    const [newAgent] = await db.insert(admin_users).values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      roleId: supportRole[0].id,
      isActive: true,
    }).returning();

    logger.info('Support agent created', { agentId: newAgent.id, email, createdBy: req.userId });

    res.status(201).json(formatResponse('success', 201, 'Agent created', {
      agent: { id: newAgent.id, name: newAgent.name, email: newAgent.email },
    }));
  } catch (error: any) {
    logger.error('Create support agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create agent'));
  }
});

// =====================================================
// CROSS-DEPARTMENT LOOKUP
// =====================================================

router.get('/support/lookup', async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 3) {
      return res.status(400).json(formatErrorResponse(400, 'Search query must be at least 3 characters'));
    }
    const query = q.trim();

    const rows = await db.select({
      id: transactions.id,
      referenceId: transactions.referenceId,
      transactionType: transactions.transactionType,
      amount: transactions.amount,
      status: transactions.status,
      description: transactions.description,
      createdAt: transactions.createdAt,
      userId: transactions.userId,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
    }).from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(
        or(
          ilike(transactions.referenceId, `%${query}%`),
          ilike(transactions.description, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
          ilike(users.name, `%${query}%`),
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(20);

    const results = rows.map(r => ({
      type: 'transaction',
      label: 'Transaction',
      ...r,
      reference: r.referenceId,
      type_display: r.transactionType,
    }));

    res.json(formatResponse('success', 200, `Found ${results.length} result(s)`, { results, query }));
  } catch (error: any) {
    logger.error('Lookup error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Lookup failed'));
  }
});

// =====================================================
// DEPARTMENT TAGGING
// =====================================================

router.put('/support/tickets/:id/department', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { departmentTag, linkedOrderId, linkedOrderType } = req.body;
    const agentId = req.adminId!;

    const [ticket] = await db.select({ id: support_tickets.id })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));

    await db.update(support_tickets).set({
      departmentTag: departmentTag || null,
      linkedOrderId: linkedOrderId || null,
      linkedOrderType: linkedOrderType || null,
      updatedAt: new Date(),
    }).where(eq(support_tickets.id, id));

    logger.info('Ticket department tagged', { ticketId: id, departmentTag, linkedOrderId, agentId });
    res.json(formatResponse('success', 200, 'Department tag updated', { departmentTag, linkedOrderId, linkedOrderType }));
  } catch (error: any) {
    logger.error('Tag department error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to tag department'));
  }
});

// =====================================================
// INTERNAL MESSAGES
// =====================================================

router.get('/support/tickets/:id/internal-messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const messages = await db.select().from(agentInternalMessages)
      .where(eq(agentInternalMessages.ticketId, id))
      .orderBy(asc(agentInternalMessages.createdAt));
    res.json(formatResponse('success', 200, 'Internal messages', { messages }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get internal messages'));
  }
});

router.post('/support/tickets/:id/internal-messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, toDepartment, linkedOrderId } = req.body;
    const agentId = req.adminId!;

    if (!message?.trim() || !toDepartment) {
      return res.status(400).json(formatErrorResponse(400, 'Message and target department are required'));
    }

    const [ticket] = await db.select({ id: support_tickets.id })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));

    const [agentUser] = await db.select({ name: admin_users.name })
      .from(admin_users).where(eq(admin_users.id, agentId)).limit(1);

    const [newMsg] = await db.insert(agentInternalMessages).values({
      ticketId: id,
      fromType: 'support_agent',
      fromId: agentId,
      fromName: agentUser?.name || 'Support Agent',
      toDepartment,
      message: message.trim(),
      linkedOrderId: linkedOrderId || null,
    }).returning();

    logger.info('Internal message sent', { ticketId: id, toDepartment, agentId });
    res.status(201).json(formatResponse('success', 201, 'Internal message sent', { message: newMsg }));
  } catch (error: any) {
    logger.error('Send internal message error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send internal message'));
  }
});

// =====================================================
// FRAUD ALERTS
// =====================================================

router.get('/support/fraud-alerts', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', status } = req.query as any;
    const result = await fraudService.getAlerts(parseInt(page), parseInt(limit), status);
    res.json(formatResponse('success', 200, 'Fraud alerts', result));
  } catch (error: any) {
    logger.error('Get fraud alerts error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get fraud alerts'));
  }
});

router.post('/support/fraud-alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const agentId = req.adminId!;
    await fraudService.resolveAlert(id, agentId, note || '');
    res.json(formatResponse('success', 200, 'Alert resolved'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to resolve alert'));
  }
});

router.post('/support/fraud-alerts/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = req.adminId!;
    await fraudService.dismissAlert(id, agentId);
    res.json(formatResponse('success', 200, 'Alert dismissed'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to dismiss alert'));
  }
});

// === AI Knowledge Base Management ===

router.get('/ai/knowledge', async (req: Request, res: Response) => {
  try {
    const entries = await localAi.getAllKnowledgeEntries();
    const stats = localAi.getIndexStats();
    res.json(formatResponse('success', 200, 'Knowledge base entries', { entries, stats }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch knowledge base'));
  }
});

router.post('/ai/knowledge', async (req: Request, res: Response) => {
  try {
    const { question, variations, answer, category, tags } = req.body;
    if (!question || !answer) {
      return res.status(400).json(formatErrorResponse(400, 'Question and answer are required'));
    }
    const id = await localAi.addKnowledgeEntry({
      question, variations: variations || [], answer, category: category || 'general',
      tags: tags || [], addedBy: req.adminId!,
    });
    res.status(201).json(formatResponse('success', 201, 'Knowledge entry added', { id }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to add knowledge entry'));
  }
});

router.put('/ai/knowledge/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question, variations, answer, category, tags, isActive } = req.body;
    await localAi.updateKnowledgeEntry(id, { question, variations, answer, category, tags, isActive });
    res.json(formatResponse('success', 200, 'Knowledge entry updated'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to update knowledge entry'));
  }
});

router.delete('/ai/knowledge/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await localAi.deleteKnowledgeEntry(id);
    res.json(formatResponse('success', 200, 'Knowledge entry removed'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to remove knowledge entry'));
  }
});

router.get('/ai/unresolved', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const queries = await localAi.getUnresolvedQueries(limit);
    res.json(formatResponse('success', 200, 'Unresolved queries', { queries }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch unresolved queries'));
  }
});

router.post('/ai/unresolved/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answer, addToKb, category } = req.body;
    if (!answer) return res.status(400).json(formatErrorResponse(400, 'Answer is required'));
    await localAi.resolveQuery(id, answer, !!addToKb, category || 'general', req.adminId!);
    res.json(formatResponse('success', 200, 'Query resolved and AI updated'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to resolve query'));
  }
});

router.post('/ai/rebuild-index', async (req: Request, res: Response) => {
  try {
    await localAi.rebuildIndex(true);
    const stats = localAi.getIndexStats();
    res.json(formatResponse('success', 200, 'AI index rebuilt', { stats }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to rebuild AI index'));
  }
});

router.get('/ai/stats', async (req: Request, res: Response) => {
  try {
    const stats = localAi.getIndexStats();
    res.json(formatResponse('success', 200, 'AI stats', { stats }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get AI stats'));
  }
});

export default router;
