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
  adminNotifications,
} from '../../db/schema';
import { 
  supportTickets as support_tickets, 
  supportConversations as support_conversations, 
  supportMessages as support_messages,
  supportInternalNotes as support_internal_notes,
  supportPresence as support_presence,
  supportQueue as support_queue,
  agentInternalMessages,
  fraudAlerts,
  users as usersTable,
  adminUsers as admin_users, 
  adminRoles as admin_roles,
  identityRequestActivity,
  cacRequests,
  cacRegistrationRequests,
  cacRequestActivity,
  cacFiles,
  jambRequestDocuments,
  educationRequestDocuments,
  a2cStatusHistory,
  birthAttestations,
  bvnVerifications,
  ninSlips,
  sharedFiles,
  adminActivityLogs,
  otpVerifications,
  loginActivities,
} from '../../db/schema';
import { sendEmail } from '../../services/emailService';
import { agentWelcomeEmailHtml } from '../../utils/agentEmailTemplates';
import { buildBroadcastEmail } from '../../utils/broadcastEmailTemplates';
import { getSiteUrl } from '../../utils/helpers';
import { generateAgentSlaPdf } from '../../utils/generateAgentSla';
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
import { eq, desc, count, sql, and, or, gt, asc, gte, lte, ilike, isNull } from 'drizzle-orm';
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

async function emailAvailableForAgent(email: string): Promise<boolean> {
  const normalised = email.toLowerCase();
  const [existing] = await db.select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalised))
    .limit(1);
  if (!existing) return true;
  const checks = await Promise.all([
    db.select({ id: cacAgents.id }).from(cacAgents).where(eq(cacAgents.adminUserId, existing.id)).limit(1),
    db.select({ id: identityAgents.id }).from(identityAgents).where(eq(identityAgents.adminUserId, existing.id)).limit(1),
    db.select({ id: educationAgents.id }).from(educationAgents).where(eq(educationAgents.adminUserId, existing.id)).limit(1),
    db.select({ id: jambAgents.id }).from(jambAgents).where(eq(jambAgents.adminUserId, existing.id)).limit(1),
    db.select({ id: a2cAgents.id }).from(a2cAgents).where(eq(a2cAgents.adminUserId, existing.id)).limit(1),
  ]);
  const linkedToAgent = checks.some(r => r.length > 0);
  if (linkedToAgent) return false;
  await safeDeleteAdminUser(existing.id);
  return true;
}

async function safeDeleteAdminUser(adminUserId: string): Promise<void> {
  const tryRun = async (p: Promise<unknown>) => { try { await p; } catch (_) {} };
  await tryRun(db.execute(sql`UPDATE support_tickets SET assigned_agent_id = NULL WHERE assigned_agent_id = ${adminUserId}`));
  await tryRun(db.execute(sql`UPDATE admin_activity_logs SET admin_id = NULL WHERE admin_id = ${adminUserId}`));
  await tryRun(db.execute(sql`UPDATE ai_knowledge_base SET added_by = NULL WHERE added_by = ${adminUserId}`));
  await tryRun(db.execute(sql`UPDATE agent_internal_messages SET resolved_by = NULL WHERE resolved_by = ${adminUserId}`));
  await tryRun(db.execute(sql`DELETE FROM support_internal_notes WHERE agent_id = ${adminUserId}`));
  await db.delete(adminUsers).where(eq(adminUsers.id, adminUserId));
}

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

// Admin: update BVN service status (complete / reject) + send completion email
router.put('/bvn-services/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: 'completed' | 'rejected' };

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Status must be completed or rejected'));
    }

    const [record] = await db.select({
      id: bvnServices.id,
      userId: bvnServices.userId,
      serviceType: bvnServices.serviceType,
      requestId: bvnServices.requestId,
      bvn: bvnServices.bvn,
      userName: users.name,
      userEmail: users.email,
    })
      .from(bvnServices)
      .leftJoin(users, eq(bvnServices.userId, users.id))
      .where(eq(bvnServices.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json(formatErrorResponse(404, 'BVN service not found'));
    }

    await db.update(bvnServices)
      .set({ status })
      .where(eq(bvnServices.id, id));

    // Mark matching admin notification as read
    if (record.requestId) {
      await db.update(adminNotifications)
        .set({ isRead: true })
        .where(eq(adminNotifications.requestId, record.requestId))
        .catch(() => {});
    }

    // Send notification email to user
    if (status === 'completed' && record.userEmail) {
      const { sendEmail } = await import('../../services/emailService');
      const { userBvnCompletedEmail } = await import('../../utils/userEmailTemplates');
      const maskedBvn = record.bvn ? `${record.bvn.slice(0, 4)}****${record.bvn.slice(-3)}` : 'N/A';
      const serviceLabel = record.serviceType === 'modification' ? 'Modification' : 'Service';
      await sendEmail(
        record.userEmail,
        'Your BVN Request Has Been Completed — Arapoint',
        userBvnCompletedEmail(record.userName || 'Valued Customer', maskedBvn, serviceLabel),
        undefined, undefined,
        { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
      ).catch(err => logger.error('BVN completion email failed', { error: err.message }));
    } else if (status === 'rejected' && record.userEmail) {
      const { sendEmail } = await import('../../services/emailService');
      const { userServiceRejectedEmail } = await import('../../utils/userEmailTemplates');
      const serviceLabel = record.serviceType === 'modification' ? 'BVN Modification' : 'BVN Service';
      await sendEmail(
        record.userEmail,
        'Update on Your BVN Request — Arapoint',
        userServiceRejectedEmail(record.userName || 'Valued Customer', serviceLabel, record.requestId || id),
        undefined, undefined,
        { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
      ).catch(err => logger.error('BVN rejection email failed', { error: err.message }));
    }

    logger.info('BVN service status updated by admin', { id, status, adminId: req.userId });
    res.json(formatResponse('success', 200, `BVN service marked as ${status}`));
  } catch (error: any) {
    logger.error('Update BVN service status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update BVN service status'));
  }
});

// Admin: delete a BVN service record
router.delete('/bvn-services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(bvnServices).where(eq(bvnServices.id, id));
    res.json(formatResponse('success', 200, 'BVN service record deleted'));
  } catch (error: any) {
    logger.error('Delete BVN service error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete BVN service record'));
  }
});

// Admin: get own profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const [admin] = await db.select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      createdAt: adminUsers.createdAt,
    }).from(adminUsers).where(eq(adminUsers.id, req.userId!));
    if (!admin) return res.status(404).json(formatErrorResponse(404, 'Admin not found'));
    res.json(formatResponse('success', 200, 'Profile retrieved', { admin: { ...admin, role: req.adminRole } }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

// Admin: update own profile (name only)
router.put('/me', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json(formatErrorResponse(400, 'Name is required'));
    }
    await db.update(adminUsers).set({ name: name.trim(), updatedAt: new Date() }).where(eq(adminUsers.id, req.userId!));
    res.json(formatResponse('success', 200, 'Profile updated'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to update profile'));
  }
});

// Admin: change own password
router.put('/me/password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json(formatErrorResponse(400, 'Both current and new password are required'));
    }
    if (newPassword.length < 8) {
      return res.status(400).json(formatErrorResponse(400, 'New password must be at least 8 characters'));
    }
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.userId!));
    if (!admin) return res.status(404).json(formatErrorResponse(404, 'Admin not found'));
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) return res.status(401).json(formatErrorResponse(401, 'Current password is incorrect'));
    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(adminUsers).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(adminUsers.id, req.userId!));
    res.json(formatResponse('success', 200, 'Password changed successfully'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to change password'));
  }
});

// Admin: get all notifications (read + unread)
router.get('/notifications/all', async (req: Request, res: Response) => {
  try {
    const notifications = await db.select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(100);
    res.json(formatResponse('success', 200, 'Notifications retrieved', { notifications, count: notifications.length }));
  } catch (error: any) {
    logger.error('Get all admin notifications error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get notifications'));
  }
});

// Admin: get pending (unread) notifications
router.get('/notifications/pending', async (req: Request, res: Response) => {
  try {
    const notifications = await db.select()
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false))
      .orderBy(desc(adminNotifications.createdAt))
      .limit(50);

    res.json(formatResponse('success', 200, 'Notifications retrieved', { notifications, count: notifications.length }));
  } catch (error: any) {
    logger.error('Get admin notifications error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get notifications'));
  }
});

// Admin: mark a notification as read
router.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.id, id));
    res.json(formatResponse('success', 200, 'Notification marked as read'));
  } catch (error: any) {
    logger.error('Mark notification read error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to mark notification as read'));
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

router.post('/cloudinary/upload-logos', async (req: Request, res: Response) => {
  try {
    let { cloudName, apiKey, apiSecret } = req.body;

    if (!cloudName || !apiKey || !apiSecret) {
      const savedRows = await db.select().from(adminSettings)
        .where(inArray(adminSettings.settingKey, ['cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret']));
      const saved: Record<string, string> = {};
      savedRows.forEach(r => { saved[r.settingKey] = r.settingValue || ''; });
      cloudName = cloudName || saved.cloudinaryCloudName;
      apiKey    = apiKey    || saved.cloudinaryApiKey;
      apiSecret = apiSecret || saved.cloudinaryApiSecret;
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json(formatErrorResponse(400, 'Cloudinary credentials missing. Provide cloudName, apiKey and apiSecret, or save them once first.'));
    }

    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const fs = await import('fs');
    const path = await import('path');
    const publicDir = path.resolve(process.cwd(), 'client', 'public');

    const greenPath = path.join(publicDir, 'email-logo-green.png');
    const bluePath  = path.join(publicDir, 'email-logo-blue.png');

    if (!fs.existsSync(greenPath) || !fs.existsSync(bluePath)) {
      return res.status(500).json(formatErrorResponse(500, 'Logo image files not found on server'));
    }

    const [greenResult, blueResult] = await Promise.all([
      cloudinary.uploader.upload(greenPath, {
        public_id: 'arapoint/email-logo-green',
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        format: 'png',
      }),
      cloudinary.uploader.upload(bluePath, {
        public_id: 'arapoint/email-logo-blue',
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        format: 'png',
      }),
    ]);

    const cacheBust = Date.now();
    const greenUrlVersioned = `${greenResult.secure_url}?v=${greenResult.version || cacheBust}`;
    const blueUrlVersioned  = `${blueResult.secure_url}?v=${blueResult.version || cacheBust}`;

    const settingsToSave = [
      { settingKey: 'cloudinaryCloudName', settingValue: cloudName },
      { settingKey: 'cloudinaryApiKey', settingValue: apiKey },
      { settingKey: 'cloudinaryApiSecret', settingValue: apiSecret },
      { settingKey: 'emailLogoGreenUrl', settingValue: greenUrlVersioned },
      { settingKey: 'emailLogoBlueUrl', settingValue: blueUrlVersioned },
    ];

    for (const s of settingsToSave) {
      await db.insert(adminSettings)
        .values({ ...s, updatedAt: new Date() })
        .onConflictDoUpdate({ target: adminSettings.settingKey, set: { settingValue: s.settingValue, updatedAt: new Date() } });
    }

    logger.info('Cloudinary logos uploaded', { greenUrl: greenResult.secure_url, blueUrl: blueResult.secure_url });

    res.json(formatResponse('success', 200, 'Logos uploaded to Cloudinary', {
      greenUrl: greenResult.secure_url,
      blueUrl: blueResult.secure_url,
    }));
  } catch (error: any) {
    logger.error('Cloudinary upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, error.message || 'Failed to upload logos to Cloudinary'));
  }
});

router.get('/cloudinary/status', async (req: Request, res: Response) => {
  try {
    const keys = ['cloudinaryCloudName', 'emailLogoGreenUrl', 'emailLogoBlueUrl'];
    const rows = await db.select().from(adminSettings)
      .where(inArray(adminSettings.settingKey, keys));
    const result: Record<string, string> = {};
    rows.forEach(r => { result[r.settingKey] = r.settingValue || ''; });
    res.json(formatResponse('success', 200, 'Cloudinary status', result));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get Cloudinary status'));
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

    let savedCount = 0;
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value && value !== '••••••••') {
        try {
          const existing = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, key)).limit(1);
          if (existing.length > 0) {
            await db.update(adminSettings)
              .set({ settingValue: value, updatedAt: new Date() })
              .where(eq(adminSettings.settingKey, key));
          } else {
            await db.insert(adminSettings).values({ settingKey: key, settingValue: value, updatedAt: new Date() });
          }
          const envKey = envMapping[key];
          if (envKey) {
            process.env[envKey] = value;
          }
          savedCount++;
        } catch (innerErr: any) {
          console.error(`[GatewaySave] Failed to save key "${key}":`, innerErr.message);
        }
      }
    }

    const verifyRows = await db.select().from(adminSettings);
    logger.info('Payment gateway credentials saved', { gateway, savedCount, totalSettingsInDb: verifyRows.length });
    console.log(`[GatewaySave] Saved ${savedCount} credential(s) for ${gateway}. Total admin_settings rows: ${verifyRows.length}`);
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
    const statusFilter = req.query.status as string | undefined;

    const whereClause = statusFilter && ['pending', 'processing', 'completed', 'failed'].includes(statusFilter)
      ? eq(rpaJobs.status, statusFilter as any)
      : undefined;

    const jobs = whereClause
      ? await db.select().from(rpaJobs).where(whereClause).orderBy(desc(rpaJobs.createdAt)).limit(limit).offset(offset)
      : await db.select().from(rpaJobs).orderBy(desc(rpaJobs.createdAt)).limit(limit).offset(offset);

    const [totalCount] = whereClause
      ? await db.select({ count: count() }).from(rpaJobs).where(whereClause)
      : await db.select({ count: count() }).from(rpaJobs);

    const [pendingCount] = await db.select({ count: count() }).from(rpaJobs).where(eq(rpaJobs.status, 'pending'));
    const [processingCount] = await db.select({ count: count() }).from(rpaJobs).where(eq(rpaJobs.status, 'processing'));
    const [completedCount] = await db.select({ count: count() }).from(rpaJobs).where(eq(rpaJobs.status, 'completed'));
    const [failedCount] = await db.select({ count: count() }).from(rpaJobs).where(eq(rpaJobs.status, 'failed'));

    res.json(formatResponse('success', 200, 'RPA jobs retrieved', {
      jobs,
      stats: {
        pending: pendingCount?.count || 0,
        processing: processingCount?.count || 0,
        completed: completedCount?.count || 0,
        failed: failedCount?.count || 0,
      },
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

// Admin force-retry: resets retryCount to 0, works on any status including processing/failed
router.post('/rpa/force-retry/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const [job] = await db.select().from(rpaJobs).where(eq(rpaJobs.id, jobId)).limit(1);
    if (!job) {
      return res.status(404).json(formatErrorResponse(404, 'Job not found'));
    }

    await db.update(rpaJobs)
      .set({ status: 'pending', retryCount: 0, errorMessage: null, startedAt: null, completedAt: null })
      .where(eq(rpaJobs.id, jobId));

    logger.info('Admin force-retry RPA job', { jobId, adminId: req.userId, previousStatus: job.status });
    res.json(formatResponse('success', 200, 'Job force-retried', { jobId, status: 'pending' }));
  } catch (error: any) {
    logger.error('Force-retry job error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to force-retry job'));
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

    if (!await emailAvailableForAgent(email)) {
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

    const loginUrl = `${getSiteUrl()}/agent/login`;
    generateAgentSlaPdf(name, 'CAC Agent', agent.employeeId).then(slaPdf =>
      sendEmail(
        email.toLowerCase(),
        'Your Arapoint CAC Agent Account Has Been Created',
        agentWelcomeEmailHtml({ name, email: email.toLowerCase(), password, employeeId: agent.employeeId, role: 'CAC Agent', loginUrl }),
        undefined,
        [{ filename: 'Arapoint_Agent_SLA.pdf', content: slaPdf, contentType: 'application/pdf' }],
      )
    ).catch(err => logger.warn('Failed to send CAC agent welcome email', { error: err.message }));

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
      await safeDeleteAdminUser(agent.adminUserId);
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

    if (!await emailAvailableForAgent(email)) {
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

    const loginUrl = `${getSiteUrl()}/agent/identity`;
    generateAgentSlaPdf(name, 'Identity Agent', employeeId || null).then(slaPdf =>
      sendEmail(
        newAdminUser.email,
        'Your Arapoint Identity Agent Account Has Been Created',
        agentWelcomeEmailHtml({ name, email: newAdminUser.email, password, employeeId: employeeId || null, role: 'Identity Agent', loginUrl }),
        undefined,
        [{ filename: 'Arapoint_Agent_SLA.pdf', content: slaPdf, contentType: 'application/pdf' }],
      )
    ).catch(err => logger.warn('Failed to send identity agent welcome email', { error: err.message }));

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

    if (agent.adminUserId) {
      await safeDeleteAdminUser(agent.adminUserId);
    }

    logger.info('Identity agent deleted', { agentId: id, deletedBy: req.userId });

    res.json(formatResponse('success', 200, 'Identity agent deleted'));
  } catch (error: any) {
    logger.error('Delete identity agent error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete identity agent'));
  }
});

router.get('/identity-requests', async (req: Request, res: Response) => {
  try {
    const { limit = '50', status, serviceType } = req.query;

    let query = db.select({
      id: identityServiceRequests.id,
      trackingId: identityServiceRequests.trackingId,
      serviceType: identityServiceRequests.serviceType,
      status: identityServiceRequests.status,
      fee: identityServiceRequests.fee,
      isPaid: identityServiceRequests.isPaid,
      nin: identityServiceRequests.nin,
      updateFields: identityServiceRequests.updateFields,
      customerNotes: identityServiceRequests.customerNotes,
      agentNotes: identityServiceRequests.agentNotes,
      createdAt: identityServiceRequests.createdAt,
      completedAt: identityServiceRequests.completedAt,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
    })
      .from(identityServiceRequests)
      .leftJoin(users, eq(identityServiceRequests.userId, users.id))
      .orderBy(desc(identityServiceRequests.createdAt))
      .limit(parseInt(limit as string) || 50);

    const conditions = [];
    if (status && status !== 'all') conditions.push(eq(identityServiceRequests.status, status as string));
    if (serviceType && serviceType !== 'all') conditions.push(eq(identityServiceRequests.serviceType, serviceType as string));

    const requests = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    res.json(formatResponse('success', 200, 'Identity requests retrieved', { requests }));
  } catch (error: any) {
    logger.error('Get identity requests error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get identity requests'));
  }
});

router.put('/identity-requests/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!status || !['pending', 'pickup', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Valid status is required (pending, pickup, completed, rejected)'));
    }

    const [existing] = await db.select().from(identityServiceRequests).where(eq(identityServiceRequests.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json(formatErrorResponse(404, 'Request not found'));
    }

    await db.update(identityServiceRequests).set({
      status,
      agentNotes: adminNotes || existing.agentNotes,
      completedAt: status === 'completed' ? new Date() : existing.completedAt,
    }).where(eq(identityServiceRequests.id, id));

    if ((status === 'completed' || status === 'rejected') && existing.userId) {
      try {
        const [user] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, existing.userId)).limit(1);
        if (user?.email) {
          const { sendEmail } = await import('../../services/emailService');
          const serviceLabels: Record<string, string> = {
            nin_validation: 'NIN Validation',
            ipe_clearance: 'IPE Clearance',
            nin_personalization: 'NIN Personalization',
            birth_attestation: 'Birth Attestation',
          };
          const serviceName = serviceLabels[existing.serviceType] || existing.serviceType;
          if (status === 'completed') {
            await sendEmail(
              user.email,
              `Your ${serviceName} Request Has Been Completed — Arapoint`,
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a7a4a;">Request Completed ✓</h2>
                <p>Dear ${user.name},</p>
                <p>Your <strong>${serviceName}</strong> request (Tracking ID: <strong>${existing.trackingId}</strong>) has been completed by our team.</p>
                ${adminNotes ? `<p><strong>Notes:</strong> ${adminNotes}</p>` : ''}
                <p>Log in to <a href="https://arapoint.com.ng/dashboard/identity">your account</a> to view the full details.</p>
                <p style="color:#666;font-size:12px;">This is an automated notification from Arapoint.</p>
              </div>`,
              `Your ${serviceName} request (${existing.trackingId}) has been completed. Log in to view details.`,
              undefined,
              { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
            );
          } else {
            const { userServiceRejectedEmail } = await import('../../utils/userEmailTemplates');
            await sendEmail(
              user.email,
              `Update on Your ${serviceName} Request — Arapoint`,
              userServiceRejectedEmail(user.name, serviceName, existing.trackingId, adminNotes),
              undefined, undefined,
              { name: 'Arapoint', email: 'hello@arapoint.com.ng' },
            );
          }
        }
      } catch (emailErr: any) {
        logger.warn('Failed to send identity request status email', { error: emailErr.message });
      }
    }

    logger.info('Admin updated identity request status', { id, status, adminId: req.userId });
    res.json(formatResponse('success', 200, 'Request status updated', { id, status }));
  } catch (error: any) {
    logger.error('Update identity request status error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to update request status'));
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

    if (!await emailAvailableForAgent(email)) {
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

    const loginUrl = `${getSiteUrl()}/agent/education`;
    generateAgentSlaPdf(name, 'Education Agent', employeeId || null).then(slaPdf =>
      sendEmail(
        newAdminUser.email,
        'Your Arapoint Education Agent Account Has Been Created',
        agentWelcomeEmailHtml({ name, email: newAdminUser.email, password, employeeId: employeeId || null, role: 'Education Agent', loginUrl }),
        undefined,
        [{ filename: 'Arapoint_Agent_SLA.pdf', content: slaPdf, contentType: 'application/pdf' }],
      )
    ).catch(err => logger.warn('Failed to send education agent welcome email', { error: err.message }));

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

    if (agent.adminUserId) {
      await safeDeleteAdminUser(agent.adminUserId);
    }

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

    if (!await emailAvailableForAgent(email)) {
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

    const loginUrl = `${getSiteUrl()}/jamb/agent/login`;
    generateAgentSlaPdf(name, 'JAMB Agent', employeeId || null).then(slaPdf =>
      sendEmail(
        newAdminUser.email,
        'Your Arapoint JAMB Agent Account Has Been Created',
        agentWelcomeEmailHtml({ name, email: newAdminUser.email, password, employeeId: employeeId || null, role: 'JAMB Agent', loginUrl }),
        undefined,
        [{ filename: 'Arapoint_Agent_SLA.pdf', content: slaPdf, contentType: 'application/pdf' }],
      )
    ).catch(err => logger.warn('Failed to send JAMB agent welcome email', { error: err.message }));

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

    if (agent.adminUserId) {
      await safeDeleteAdminUser(agent.adminUserId);
    }

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

    if (!await emailAvailableForAgent(email)) {
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

    const loginUrl = `${getSiteUrl()}/agent/a2c/login`;
    generateAgentSlaPdf(name, 'Airtime to Cash (A2C) Agent', agent.employeeId || null).then(slaPdf =>
      sendEmail(
        newAdminUser.email,
        'Your Arapoint A2C Agent Account Has Been Created',
        agentWelcomeEmailHtml({ name, email: newAdminUser.email, password, employeeId: agent.employeeId || null, role: 'Airtime to Cash (A2C) Agent', loginUrl }),
        undefined,
        [{ filename: 'Arapoint_Agent_SLA.pdf', content: slaPdf, contentType: 'application/pdf' }],
      )
    ).catch(err => logger.warn('Failed to send A2C agent welcome email', { error: err.message }));

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
      await safeDeleteAdminUser(agent.adminUserId);
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

    // Atomic conditional UPDATE — only succeeds if ticket is still unassigned.
    // Prevents two agents from picking the same ticket concurrently.
    const claimed = await db.update(support_tickets)
      .set({
        assignedAgentId: agentId,
        assignedAt: now,
        status: 'assigned',
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(support_tickets.id, id),
        isNull(support_tickets.assignedAgentId)
      ))
      .returning({ id: support_tickets.id });

    if (claimed.length === 0) {
      const [exists] = await db.select({ assignedAgentId: support_tickets.assignedAgentId })
        .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
      if (!exists) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
      if (exists.assignedAgentId === agentId) {
        return res.json(formatResponse('success', 200, 'Ticket already assigned to you'));
      }
      return res.status(409).json(formatErrorResponse(409, 'Ticket was just picked by another agent'));
    }

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

    await db.update(support_queue)
      .set({ status: 'accepted', acceptedBy: agentId, acceptedAt: now, removedAt: now, removeReason: 'accepted' })
      .where(and(eq(support_queue.ticketId, id), eq(support_queue.status, 'waiting')));

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

    // Ownership guard: only the assigned agent may reply on this ticket.
    const [ticketRow] = await db.select({ assignedAgentId: support_tickets.assignedAgentId })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
    if (!ticketRow) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
    if (!ticketRow.assignedAgentId || ticketRow.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'You must accept this ticket from the queue before replying.'));
    }

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
    const agentId = req.userId!;
    const validStatuses = ['open', 'escalated', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid status'));
    }

    // Ownership guard
    const [ticketRow] = await db.select({ assignedAgentId: support_tickets.assignedAgentId })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
    if (!ticketRow) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
    if (!ticketRow.assignedAgentId || ticketRow.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'You must accept this ticket from the queue before changing its status.'));
    }

    const now = new Date();
    const updateData: any = { status, lastActivityAt: now, updatedAt: now };

    if (status === 'resolved') updateData.resolvedAt = now;
    if (status === 'closed') updateData.closedAt = now;
    if (status === 'escalated') updateData.escalatedAt = now;

    await db.update(support_tickets).set(updateData).where(eq(support_tickets.id, id));

    if (status === 'resolved' || status === 'closed') {
      await db.update(support_queue)
        .set({ status: 'removed', removedAt: now, removeReason: status })
        .where(and(eq(support_queue.ticketId, id), eq(support_queue.status, 'waiting')));

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

    // Ownership guard
    const [ticketRow] = await db.select({ assignedAgentId: support_tickets.assignedAgentId })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
    if (!ticketRow) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
    if (!ticketRow.assignedAgentId || ticketRow.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'You must accept this ticket from the queue before adding notes.'));
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

    const [ticket] = await db.select({ id: support_tickets.id, assignedAgentId: support_tickets.assignedAgentId })
      .from(support_tickets).where(eq(support_tickets.id, id)).limit(1);
    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
    if (!ticket.assignedAgentId || ticket.assignedAgentId !== agentId) {
      return res.status(403).json(formatErrorResponse(403, 'You must accept this ticket from the queue before sending internal messages.'));
    }

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

router.delete('/clear-test-data', async (req: Request, res: Response) => {
  try {
    await db.execute(sql`
      TRUNCATE TABLE
        identity_request_activity,
        identity_verifications,
        identity_service_requests,
        cac_request_activity,
        cac_files,
        cac_registration_requests,
        cac_requests,
        jamb_request_documents,
        jamb_service_requests,
        education_request_documents,
        education_pin_orders,
        education_service_requests,
        a2c_status_history,
        a2c_requests,
        birth_attestations,
        bvn_verifications,
        nin_slips,
        shared_files,
        rpa_jobs,
        fraud_alerts,
        transactions,
        support_internal_notes,
        support_messages,
        support_conversations,
        support_tickets,
        agent_notifications,
        admin_notifications,
        admin_activity_logs
      CASCADE
    `);
    await db.execute(sql`UPDATE users SET wallet_balance = 0`);
    logger.info('Test data cleared by admin', { adminId: req.adminId });
    res.json(formatResponse('success', 200, 'All test data cleared successfully'));
  } catch (error: any) {
    logger.error('Failed to clear test data', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to clear test data: ' + error.message));
  }
});

router.get('/support/queue', async (req: Request, res: Response) => {
  try {
    const waitingEntries = await db.select({
      id: support_queue.id,
      ticketId: support_queue.ticketId,
      userId: support_queue.userId,
      conversationId: support_queue.conversationId,
      priority: support_queue.priority,
      category: support_queue.category,
      status: support_queue.status,
      joinedAt: support_queue.joinedAt,
      estimatedWaitMinutes: support_queue.estimatedWaitMinutes,
    })
      .from(support_queue)
      .where(eq(support_queue.status, 'waiting'))
      .orderBy(
        sql`CASE ${support_queue.priority}
          WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
        asc(support_queue.joinedAt)
      );

    const enriched = await Promise.all(waitingEntries.map(async (entry, idx) => {
      const [ticket] = await db.select({
        referenceId: support_tickets.referenceId,
        subject: support_tickets.subject,
        category: support_tickets.category,
      }).from(support_tickets).where(eq(support_tickets.id, entry.ticketId)).limit(1);

      const [user] = await db.select({ name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, entry.userId)).limit(1);

      const lastMsg = await db.select({
        content: support_messages.content,
        senderType: support_messages.senderType,
        createdAt: support_messages.createdAt,
      })
        .from(support_messages)
        .where(eq(support_messages.conversationId, entry.conversationId))
        .orderBy(desc(support_messages.createdAt))
        .limit(1);

      const waitMinutes = Math.round((Date.now() - new Date(entry.joinedAt).getTime()) / 60000);

      return {
        ...entry,
        position: idx + 1,
        referenceId: ticket?.referenceId || '',
        subject: ticket?.subject || '',
        userName: user?.name || 'Unknown',
        lastMessage: lastMsg[0] || null,
        waitMinutes,
      };
    }));

    const [totalStats] = await db.select({
      totalWaiting: count(),
      avgWaitMinutes: sql<number>`COALESCE(ROUND(EXTRACT(EPOCH FROM (NOW() - AVG(${support_queue.joinedAt})))/60), 0)`,
    })
      .from(support_queue)
      .where(eq(support_queue.status, 'waiting'));

    const [acceptedToday] = await db.select({ count: count() })
      .from(support_queue)
      .where(and(
        eq(support_queue.status, 'accepted'),
        sql`${support_queue.acceptedAt} >= CURRENT_DATE`
      ));

    res.json(formatResponse('success', 200, 'Queue retrieved', {
      queue: enriched,
      stats: {
        totalWaiting: Number(totalStats?.totalWaiting || 0),
        avgWaitMinutes: Number(totalStats?.avgWaitMinutes || 0),
        acceptedToday: Number(acceptedToday?.count || 0),
      },
    }));
  } catch (error: any) {
    logger.error('Get queue error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get queue'));
  }
});

router.post('/support/queue/:ticketId/accept', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const agentId = req.adminId!;
    const now = new Date();

    const [entry] = await db.select()
      .from(support_queue)
      .where(and(eq(support_queue.ticketId, ticketId), eq(support_queue.status, 'waiting')))
      .limit(1);

    if (!entry) {
      return res.status(404).json(formatErrorResponse(404, 'Ticket not in queue'));
    }

    const [agent] = await db.select({ name: admin_users.name })
      .from(admin_users).where(eq(admin_users.id, agentId)).limit(1);

    // Atomic claim — only succeeds if ticket still unassigned.
    const claimed = await db.update(support_tickets)
      .set({
        assignedAgentId: agentId,
        assignedAt: now,
        status: 'assigned',
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(support_tickets.id, ticketId),
        isNull(support_tickets.assignedAgentId)
      ))
      .returning({ id: support_tickets.id });

    if (claimed.length === 0) {
      return res.status(409).json(formatErrorResponse(409, 'Ticket was just picked by another agent'));
    }

    await db.update(support_queue)
      .set({ status: 'accepted', acceptedBy: agentId, acceptedAt: now, removedAt: now, removeReason: 'accepted' })
      .where(eq(support_queue.id, entry.id));

    const [conv] = await db.select({ id: support_conversations.id })
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, ticketId))
      .limit(1);

    if (conv) {
      await db.insert(support_messages).values({
        conversationId: conv.id,
        senderType: 'system',
        senderName: 'System',
        content: `Agent ${agent?.name || 'Support Agent'} has accepted your ticket from the queue and will assist you now.`,
      });
    }

    await db.insert(support_presence).values({
      ticketId,
      participantId: agentId,
      participantType: 'agent',
      participantName: agent?.name || 'Agent',
      isOnline: true,
      lastSeenAt: now,
    }).onConflictDoNothing();

    logger.info('Ticket accepted from queue', { ticketId, agentId, agentName: agent?.name });
    res.json(formatResponse('success', 200, 'Ticket accepted from queue'));
  } catch (error: any) {
    logger.error('Accept from queue error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to accept ticket'));
  }
});

router.post('/support/queue/accept-next', async (req: Request, res: Response) => {
  try {
    const agentId = req.adminId!;
    const now = new Date();

    const [nextEntry] = await db.select()
      .from(support_queue)
      .where(eq(support_queue.status, 'waiting'))
      .orderBy(
        sql`CASE ${support_queue.priority}
          WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
        asc(support_queue.joinedAt)
      )
      .limit(1);

    if (!nextEntry) {
      return res.status(404).json(formatErrorResponse(404, 'Queue is empty'));
    }

    const [agent] = await db.select({ name: admin_users.name })
      .from(admin_users).where(eq(admin_users.id, agentId)).limit(1);

    // Atomic claim — only succeeds if ticket still unassigned.
    const claimed = await db.update(support_tickets)
      .set({
        assignedAgentId: agentId,
        assignedAt: now,
        status: 'assigned',
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(support_tickets.id, nextEntry.ticketId),
        isNull(support_tickets.assignedAgentId)
      ))
      .returning({ id: support_tickets.id });

    if (claimed.length === 0) {
      // Another agent claimed this ticket between our queue read and update.
      // Mark its queue entry as accepted (by them) and tell caller to retry.
      await db.update(support_queue)
        .set({ status: 'removed', removedAt: now, removeReason: 'race_lost' })
        .where(eq(support_queue.id, nextEntry.id));
      return res.status(409).json(formatErrorResponse(409, 'Next ticket was just picked by another agent — try again'));
    }

    await db.update(support_queue)
      .set({ status: 'accepted', acceptedBy: agentId, acceptedAt: now, removedAt: now, removeReason: 'accepted' })
      .where(eq(support_queue.id, nextEntry.id));

    const [conv] = await db.select({ id: support_conversations.id })
      .from(support_conversations)
      .where(eq(support_conversations.ticketId, nextEntry.ticketId))
      .limit(1);

    if (conv) {
      await db.insert(support_messages).values({
        conversationId: conv.id,
        senderType: 'system',
        senderName: 'System',
        content: `Agent ${agent?.name || 'Support Agent'} has accepted your ticket and will assist you now.`,
      });
    }

    await db.insert(support_presence).values({
      ticketId: nextEntry.ticketId,
      participantId: agentId,
      participantType: 'agent',
      participantName: agent?.name || 'Agent',
      isOnline: true,
      lastSeenAt: now,
    }).onConflictDoNothing();

    logger.info('Next ticket accepted from queue', { ticketId: nextEntry.ticketId, agentId });
    res.json(formatResponse('success', 200, 'Next ticket accepted', {
      ticketId: nextEntry.ticketId,
      conversationId: nextEntry.conversationId,
    }));
  } catch (error: any) {
    logger.error('Accept next error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to accept next ticket'));
  }
});

router.get('/login-activities', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;
    const actorType = req.query.actorType as string | undefined;
    const search = req.query.search as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions: any[] = [];
    if (actorType && actorType !== 'all') {
      conditions.push(eq(loginActivities.actorType, actorType as any));
    }
    if (search) {
      conditions.push(
        or(
          ilike(loginActivities.actorEmail, `%${search}%`),
          ilike(loginActivities.actorName, `%${search}%`),
          ilike(loginActivities.ipAddress, `%${search}%`),
        )
      );
    }
    if (from) {
      conditions.push(gte(loginActivities.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(loginActivities.createdAt, new Date(to)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(loginActivities).where(where).orderBy(desc(loginActivities.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(loginActivities).where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    res.json(formatResponse('success', 200, 'Login activities fetched', {
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }));
  } catch (error: any) {
    logger.error('Login activities fetch error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch login activities'));
  }
});

// ─── Email Broadcast ─────────────────────────────────────────────────────────

router.get('/broadcast/counts', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [userCount, agentCount, devCount] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM users`),
      db.execute(sql`SELECT COUNT(*)::int AS total FROM admin_users WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS total FROM developer_users WHERE is_active = true`),
    ]);
    res.json(formatResponse('success', 200, 'Recipient counts', {
      users: Number((userCount.rows[0] as any)?.total ?? 0),
      agents: Number((agentCount.rows[0] as any)?.total ?? 0),
      developers: Number((devCount.rows[0] as any)?.total ?? 0),
    }));
  } catch (error: any) {
    logger.error('Broadcast count error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch recipient counts'));
  }
});

const broadcastBannerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/broadcast/upload-banner', adminAuthMiddleware, broadcastBannerUpload.single('banner'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(formatErrorResponse(400, 'No file uploaded'));

    const cloudNameRow = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, 'cloudinaryCloudName')).limit(1);
    const apiKeyRow = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, 'cloudinaryApiKey')).limit(1);
    const apiSecretRow = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, 'cloudinaryApiSecret')).limit(1);

    const cloudName = cloudNameRow[0]?.settingValue;
    const apiKey = apiKeyRow[0]?.settingValue;
    const apiSecret = apiSecretRow[0]?.settingValue;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json(formatErrorResponse(400, 'Cloudinary not configured. Please set up Cloudinary in Settings first.'));
    }

    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'arapoint/broadcast-banners', resource_type: 'image' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file!.buffer);
    });

    res.json(formatResponse('success', 200, 'Banner uploaded', { url: result.secure_url }));
  } catch (error: any) {
    logger.error('Broadcast banner upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, error.message || 'Failed to upload banner'));
  }
});

router.post('/broadcast/send', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { recipients, subject, body, bannerUrl, bannerPosition } = req.body as {
      recipients: string[];
      subject: string;
      body: string;
      bannerUrl?: string;
      bannerPosition?: 'top' | 'middle' | 'bottom';
    };

    if (!recipients?.length) return res.status(400).json(formatErrorResponse(400, 'Select at least one recipient group'));
    if (!subject?.trim()) return res.status(400).json(formatErrorResponse(400, 'Subject is required'));
    if (!body?.trim()) return res.status(400).json(formatErrorResponse(400, 'Email body is required'));

    let sent = 0;
    let failed = 0;

    const sendToList = async (emails: string[], recipientType: 'users' | 'agents' | 'developers') => {
      for (const email of emails) {
        const html = buildBroadcastEmail({ subject, bodyText: body, bannerUrl, bannerPosition, recipientType });
        const ok = await sendEmail(email, subject, html);
        if (ok) sent++; else failed++;
        await new Promise(r => setTimeout(r, 120));
      }
    };

    if (recipients.includes('users')) {
      const rows = await db.execute(sql`SELECT email FROM users`);
      const emails = (rows.rows as any[]).map(r => r.email).filter(Boolean);
      await sendToList(emails, 'users');
    }

    if (recipients.includes('agents')) {
      const rows = await db.execute(sql`SELECT email FROM admin_users WHERE is_active = true`);
      const emails = (rows.rows as any[]).map(r => r.email).filter(Boolean);
      await sendToList(emails, 'agents');
    }

    if (recipients.includes('developers')) {
      const rows = await db.execute(sql`SELECT email FROM developer_users WHERE is_active = true`);
      const emails = (rows.rows as any[]).map(r => r.email).filter(Boolean);
      await sendToList(emails, 'developers');
    }

    logger.info('Broadcast email completed', { subject, sent, failed, recipients });
    res.json(formatResponse('success', 200, `Broadcast complete: ${sent} sent, ${failed} failed`, { sent, failed }));
  } catch (error: any) {
    logger.error('Broadcast send error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, error.message || 'Failed to send broadcast'));
  }
});

// ─── Global Search ────────────────────────────────────────────────────────────

router.get('/search', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json(formatErrorResponse(400, 'Search query must be at least 2 characters'));
    }

    const pattern = `%${q}%`;
    const idPattern = q.length >= 8 ? `%${q}%` : `${q}%`;

    const [userRows, txRows, identityRows, eduRows, jambRows, ticketRows, rpaRows] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        walletBalance: users.walletBalance,
        bvn: users.bvn,
        nin: users.nin,
        kycStatus: users.kycStatus,
        emailVerified: users.emailVerified,
        isSuspended: users.isSuspended,
        suspendReason: users.suspendReason,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users)
        .where(or(
          ilike(users.name, pattern),
          ilike(users.email, pattern),
          ilike(users.phone, pattern),
        ))
        .orderBy(desc(users.createdAt))
        .limit(10),

      db.select().from(transactions)
        .where(or(
          ilike(transactions.referenceId, idPattern),
          sql`${transactions.id}::text ILIKE ${idPattern}`,
          ilike(transactions.description, pattern),
        ))
        .orderBy(desc(transactions.createdAt))
        .limit(10),

      db.select().from(identityServiceRequests)
        .where(or(
          ilike(identityServiceRequests.trackingId, idPattern),
          sql`${identityServiceRequests.id}::text ILIKE ${idPattern}`,
          ilike(identityServiceRequests.validatedFullName, pattern),
          ilike(identityServiceRequests.nin, pattern),
        ))
        .orderBy(desc(identityServiceRequests.createdAt))
        .limit(8),

      db.select().from(educationServiceRequests)
        .where(or(
          ilike(educationServiceRequests.trackingId, idPattern),
          sql`${educationServiceRequests.id}::text ILIKE ${idPattern}`,
          ilike(educationServiceRequests.registrationNumber, pattern),
          ilike(educationServiceRequests.candidateName, pattern),
        ))
        .orderBy(desc(educationServiceRequests.createdAt))
        .limit(8),

      db.select().from(jambServiceRequests)
        .where(or(
          ilike(jambServiceRequests.trackingId, idPattern),
          sql`${jambServiceRequests.id}::text ILIKE ${idPattern}`,
          ilike(jambServiceRequests.registrationNumber, pattern),
          ilike(jambServiceRequests.candidateName, pattern),
        ))
        .orderBy(desc(jambServiceRequests.createdAt))
        .limit(8),

      db.select({
        id: support_tickets.id,
        userId: support_tickets.userId,
        referenceId: support_tickets.referenceId,
        subject: support_tickets.subject,
        status: support_tickets.status,
        priority: support_tickets.priority,
        category: support_tickets.category,
        departmentTag: support_tickets.departmentTag,
        linkedOrderId: support_tickets.linkedOrderId,
        linkedOrderType: support_tickets.linkedOrderType,
        escalatedAt: support_tickets.escalatedAt,
        resolvedAt: support_tickets.resolvedAt,
        closedAt: support_tickets.closedAt,
        assignedAt: support_tickets.assignedAt,
        lastActivityAt: support_tickets.lastActivityAt,
        createdAt: support_tickets.createdAt,
        updatedAt: support_tickets.updatedAt,
      }).from(support_tickets)
        .where(or(
          ilike(support_tickets.referenceId, idPattern),
          sql`${support_tickets.id}::text ILIKE ${idPattern}`,
          ilike(support_tickets.subject, pattern),
        ))
        .orderBy(desc(support_tickets.createdAt))
        .limit(8),

      db.select({
        id: rpaJobs.id,
        userId: rpaJobs.userId,
        serviceType: rpaJobs.serviceType,
        queryData: rpaJobs.queryData,
        status: rpaJobs.status,
        result: rpaJobs.result,
        errorMessage: rpaJobs.errorMessage,
        retryCount: rpaJobs.retryCount,
        maxRetries: rpaJobs.maxRetries,
        priority: rpaJobs.priority,
        createdAt: rpaJobs.createdAt,
        startedAt: rpaJobs.startedAt,
        completedAt: rpaJobs.completedAt,
      }).from(rpaJobs)
        .where(sql`${rpaJobs.id}::text ILIKE ${idPattern}`)
        .orderBy(desc(rpaJobs.createdAt))
        .limit(5),
    ]);

    res.json(formatResponse('success', 200, 'Search results', {
      query: q,
      results: {
        users: userRows,
        transactions: txRows,
        identityOrders: identityRows,
        educationOrders: eduRows,
        jambOrders: jambRows,
        supportTickets: ticketRows,
        rpaJobs: rpaRows,
      },
      totals: {
        users: userRows.length,
        transactions: txRows.length,
        orders: identityRows.length + eduRows.length + jambRows.length,
        supportTickets: ticketRows.length,
        rpaJobs: rpaRows.length,
      },
    }));
  } catch (error: any) {
    logger.error('Admin search error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Search failed'));
  }
});

// ─── Database Management ──────────────────────────────────────────────────────

router.get('/db/backup', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [
      userRows,
      txRows,
      rpaJobRows,
      jambRows,
      identityRows,
      eduRows,
      pricingRows,
      settingRows,
      cacRows,
      bvnRows,
      ninSlipRows,
      adminUserRows,
    ] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        passwordHash: users.passwordHash,
        walletBalance: users.walletBalance,
        bvn: users.bvn,
        nin: users.nin,
        kycStatus: users.kycStatus,
        emailVerified: users.emailVerified,
        isSuspended: users.isSuspended,
        suspendReason: users.suspendReason,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).limit(10000),
      db.select().from(transactions).limit(20000),
      db.select({
        id: rpaJobs.id,
        userId: rpaJobs.userId,
        serviceType: rpaJobs.serviceType,
        queryData: rpaJobs.queryData,
        status: rpaJobs.status,
        result: rpaJobs.result,
        errorMessage: rpaJobs.errorMessage,
        retryCount: rpaJobs.retryCount,
        maxRetries: rpaJobs.maxRetries,
        priority: rpaJobs.priority,
        createdAt: rpaJobs.createdAt,
        startedAt: rpaJobs.startedAt,
        completedAt: rpaJobs.completedAt,
      }).from(rpaJobs).limit(10000),
      db.select().from(jambServiceRequests).limit(5000),
      db.select().from(identityServiceRequests).limit(5000),
      db.select().from(educationServiceRequests).limit(5000),
      db.select().from(servicePricing),
      db.select().from(adminSettings),
      db.select().from(cacRegistrationRequests).limit(5000),
      db.select().from(bvnVerifications).limit(5000),
      db.select().from(ninSlips).limit(5000),
      db.select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        roleId: adminUsers.roleId,
        isActive: adminUsers.isActive,
        createdAt: adminUsers.createdAt,
      }).from(adminUsers).limit(200),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      tables: {
        users: { count: userRows.length, data: userRows },
        transactions: { count: txRows.length, data: txRows },
        rpaJobs: { count: rpaJobRows.length, data: rpaJobRows },
        jambServiceRequests: { count: jambRows.length, data: jambRows },
        identityServiceRequests: { count: identityRows.length, data: identityRows },
        educationServiceRequests: { count: eduRows.length, data: eduRows },
        servicePricing: { count: pricingRows.length, data: pricingRows },
        adminSettings: { count: settingRows.length, data: settingRows },
        cacRegistrationRequests: { count: cacRows.length, data: cacRows },
        bvnVerifications: { count: bvnRows.length, data: bvnRows },
        ninSlips: { count: ninSlipRows.length, data: ninSlipRows },
        adminUsers: { count: adminUserRows.length, data: adminUserRows },
      },
    };

    const filename = `arapoint-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
    logger.info('Database backup exported', { adminId: (req as any).adminId });
  } catch (error: any) {
    logger.error('DB backup error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to generate backup'));
  }
});

router.post('/db/restore', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const backup = req.body;

    if (!backup?.tables || !backup?.version) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid backup file. Must contain tables and version fields.'));
    }

    const restored: Record<string, number> = {};
    const tables = backup.tables;

    if (tables.adminSettings?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.adminSettings.data, 100);
      for (const chunk of chunks) {
        await db.insert(adminSettings)
          .values(chunk.map((r: any) => ({
            id: r.id,
            settingKey: r.settingKey || r.setting_key,
            settingValue: r.settingValue ?? r.setting_value ?? null,
            description: r.description || null,
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          })))
          .onConflictDoUpdate({
            target: adminSettings.settingKey,
            set: {
              settingValue: sql`excluded.setting_value`,
              description: sql`excluded.description`,
              updatedAt: new Date(),
            },
          });
        count += chunk.length;
      }
      restored.adminSettings = count;
    }

    if (tables.servicePricing?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.servicePricing.data, 100);
      for (const chunk of chunks) {
        await db.insert(servicePricing)
          .values(chunk.map((r: any) => ({
            id: r.id,
            serviceType: r.serviceType || r.service_type,
            serviceName: r.serviceName || r.service_name,
            price: r.price,
            isActive: r.isActive ?? r.is_active ?? true,
            description: r.description || null,
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          })))
          .onConflictDoUpdate({
            target: servicePricing.id,
            set: {
              price: sql`excluded.price`,
              isActive: sql`excluded.is_active`,
              updatedAt: new Date(),
            },
          });
        count += chunk.length;
      }
      restored.servicePricing = count;
    }

    if (tables.users?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.users.data, 200);
      for (const chunk of chunks) {
        await db.insert(users)
          .values(chunk.map((r: any) => ({
            id: r.id,
            email: r.email,
            name: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email,
            phone: r.phone || null,
            passwordHash: r.passwordHash || r.password_hash || null,
            walletBalance: r.walletBalance ?? r.wallet_balance ?? '0',
            bvn: r.bvn || null,
            nin: r.nin || null,
            kycStatus: r.kycStatus || r.kyc_status || 'pending',
            emailVerified: r.emailVerified ?? r.email_verified ?? r.isVerified ?? false,
            isSuspended: r.isSuspended ?? r.is_suspended ?? false,
            suspendReason: r.suspendReason || r.suspend_reason || null,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          })))
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email: sql`excluded.email`,
              name: sql`excluded.name`,
              phone: sql`excluded.phone`,
              walletBalance: sql`excluded.wallet_balance`,
              bvn: sql`excluded.bvn`,
              nin: sql`excluded.nin`,
              kycStatus: sql`excluded.kyc_status`,
              emailVerified: sql`excluded.email_verified`,
              isSuspended: sql`excluded.is_suspended`,
              suspendReason: sql`excluded.suspend_reason`,
              updatedAt: new Date(),
            },
          });
        count += chunk.length;
      }
      restored.users = count;
    }

    if (tables.transactions?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.transactions.data, 500);
      for (const chunk of chunks) {
        try {
          await db.insert(transactions)
            .values(chunk.map((r: any) => ({
              id: r.id,
              userId: r.userId || r.user_id,
              transactionType: r.transactionType || r.transaction_type,
              amount: r.amount,
              paymentMethod: r.paymentMethod || r.payment_method || null,
              referenceId: r.referenceId || r.reference_id || null,
              status: r.status || 'completed',
              description: r.description || null,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            })))
            .onConflictDoUpdate({
              target: transactions.id,
              set: {
                status: sql`excluded.status`,
                description: sql`excluded.description`,
              },
            });
          count += chunk.length;
        } catch (e: any) {
          logger.warn('Skipped transaction chunk (FK error)', { error: e.message });
        }
      }
      restored.transactions = count;
    }

    if (tables.identityServiceRequests?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.identityServiceRequests.data, 200);
      for (const chunk of chunks) {
        try {
          await db.insert(identityServiceRequests)
            .values(chunk.map((r: any) => ({
              ...r,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
              updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
            })))
            .onConflictDoUpdate({
              target: identityServiceRequests.id,
              set: { status: sql`excluded.status`, updatedAt: new Date() },
            });
          count += chunk.length;
        } catch (e: any) {
          logger.warn('Skipped identity request chunk', { error: e.message });
        }
      }
      restored.identityServiceRequests = count;
    }

    if (tables.educationServiceRequests?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.educationServiceRequests.data, 200);
      for (const chunk of chunks) {
        try {
          await db.insert(educationServiceRequests)
            .values(chunk.map((r: any) => ({
              ...r,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
              updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
            })))
            .onConflictDoUpdate({
              target: educationServiceRequests.id,
              set: { status: sql`excluded.status`, updatedAt: new Date() },
            });
          count += chunk.length;
        } catch (e: any) {
          logger.warn('Skipped education request chunk', { error: e.message });
        }
      }
      restored.educationServiceRequests = count;
    }

    if (tables.jambServiceRequests?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.jambServiceRequests.data, 200);
      for (const chunk of chunks) {
        try {
          await db.insert(jambServiceRequests)
            .values(chunk.map((r: any) => ({
              ...r,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
              updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
            })))
            .onConflictDoUpdate({
              target: jambServiceRequests.id,
              set: { status: sql`excluded.status`, updatedAt: new Date() },
            });
          count += chunk.length;
        } catch (e: any) {
          logger.warn('Skipped JAMB request chunk', { error: e.message });
        }
      }
      restored.jambServiceRequests = count;
    }

    if (tables.rpaJobs?.data?.length) {
      let count = 0;
      const chunks = chunkArray(tables.rpaJobs.data, 200);
      for (const chunk of chunks) {
        try {
          await db.insert(rpaJobs)
            .values(chunk.map((r: any) => ({
              id: r.id,
              userId: r.userId || r.user_id,
              serviceType: r.serviceType || r.service_type,
              queryData: r.queryData || r.query_data || {},
              status: r.status || 'pending',
              result: r.result || null,
              errorMessage: r.errorMessage || r.error_message || null,
              retryCount: r.retryCount || r.retry_count || 0,
              maxRetries: r.maxRetries || r.max_retries || 3,
              priority: r.priority || 0,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
              startedAt: r.startedAt ? new Date(r.startedAt) : null,
              completedAt: r.completedAt ? new Date(r.completedAt) : null,
            })))
            .onConflictDoUpdate({
              target: rpaJobs.id,
              set: {
                status: sql`excluded.status`,
                result: sql`excluded.result`,
                errorMessage: sql`excluded.error_message`,
                completedAt: sql`excluded.completed_at`,
              },
            });
          count += chunk.length;
        } catch (e: any) {
          logger.warn('Skipped RPA job chunk', { error: e.message });
        }
      }
      restored.rpaJobs = count;
    }

    logger.info('Database restore complete', { adminId: (req as any).adminId, restored });
    res.json(formatResponse(200, 'Database restored successfully from backup', { restored }));
  } catch (error: any) {
    logger.error('DB restore error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, `Restore failed: ${error.message}`));
  }
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

router.post('/db/clear-cache', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`DELETE FROM server_cache`);
    const count = (result as any).rowCount ?? 0;
    logger.info('Server cache cleared', { adminId: req.userId, rowsDeleted: count });
    res.json(formatResponse('success', 200, `Cache cleared — ${count} entr${count === 1 ? 'y' : 'ies'} removed`, { cleared: count }));
  } catch (error: any) {
    logger.error('Clear cache error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to clear cache'));
  }
});

router.get('/db/logs', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const [logs, countResult] = await Promise.all([
      db.select({
        id: adminActivityLogs.id,
        action: adminActivityLogs.action,
        resourceType: adminActivityLogs.resourceType,
        resourceId: adminActivityLogs.resourceId,
        details: adminActivityLogs.details,
        ipAddress: adminActivityLogs.ipAddress,
        createdAt: adminActivityLogs.createdAt,
        adminName: adminUsers.name,
        adminEmail: adminUsers.email,
      })
        .from(adminActivityLogs)
        .leftJoin(adminUsers, eq(adminActivityLogs.adminId, adminUsers.id))
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(adminActivityLogs),
    ]);

    const total = countResult[0]?.count ?? 0;
    res.json(formatResponse('success', 200, 'Activity logs retrieved', {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(Number(total) / limit) },
    }));
  } catch (error: any) {
    logger.error('DB logs error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch logs'));
  }
});

// ===== Portal Health Monitoring (Tier 1) =====
import { providerHealth } from '../../db/schema';
import { runHealthCheck, type ProviderName } from '../../rpa/healthMonitor';

router.get('/portal-health', async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(providerHealth);
    const knownProviders: ProviderName[] = ['waec', 'neco', 'nabteb', 'nbais'];
    const byName: Record<string, any> = {};
    for (const r of rows) byName[r.provider] = r;
    const result = knownProviders.map((p) => byName[p] || {
      provider: p,
      status: 'unknown',
      lastCheckedAt: null,
      lastSuccessAt: null,
      consecutiveFailures: 0,
      lastError: null,
      isAutoDisabled: false,
      totalChecks: 0,
      totalFailures: 0,
    });
    res.json(formatResponse('success', 200, 'Portal health retrieved', { providers: result }));
  } catch (error: any) {
    logger.error('Portal health fetch error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch portal health'));
  }
});

router.post('/portal-health/check/:provider', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as ProviderName;
    if (!['waec', 'neco', 'nabteb', 'nbais'].includes(provider)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid provider'));
    }
    const result = await runHealthCheck(provider);
    res.json(formatResponse('success', 200, 'Health check complete', result));
  } catch (error: any) {
    logger.error('Manual health check error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to run health check'));
  }
});

router.post('/portal-health/enable/:provider', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider;
    await db.update(providerHealth).set({
      isAutoDisabled: false,
      autoDisabledAt: null,
      consecutiveFailures: 0,
      status: 'unknown',
      updatedAt: new Date(),
    }).where(eq(providerHealth.provider, provider));
    await db.insert(adminSettings).values({ key: `${provider}_enabled`, value: 'true' })
      .onConflictDoUpdate({ target: adminSettings.key, set: { value: 'true', updatedAt: new Date() } });
    res.json(formatResponse('success', 200, `${provider} re-enabled`, null));
  } catch (error: any) {
    logger.error('Re-enable provider error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to re-enable provider'));
  }
});

// ============================================================
// AGENT PERFORMANCE & ACTIVITY TRACKING
// ============================================================

router.post('/agents/log-activity', async (req: Request, res: Response) => {
  try {
    const { agentType, agentId, adminUserId, action, requestId, serviceType, metadata, ipAddress } = req.body;
    if (!agentType || !agentId || !action) {
      return res.status(400).json(formatErrorResponse(400, 'agentType, agentId, and action are required'));
    }
    await db.execute(sql`
      INSERT INTO agent_activity_logs (agent_type, agent_id, admin_user_id, action, request_id, service_type, metadata, ip_address)
      VALUES (${agentType}, ${agentId}::uuid, ${adminUserId || null}::uuid, ${action}, ${requestId || null}::uuid, ${serviceType || null}, ${JSON.stringify(metadata || {})}, ${ipAddress || null})
    `);
    res.json(formatResponse('success', 200, 'Activity logged', null));
  } catch (error: any) {
    logger.error('Log agent activity error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to log activity'));
  }
});

router.get('/agents/performance', async (req: Request, res: Response) => {
  try {
    const { type, days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;

    const queries: Record<string, string> = {
      education: `
        SELECT 'education' as agent_type, a.id, a.employee_id, a.is_available,
          a.max_active_requests, a.current_active_requests, a.total_completed_requests,
          au.name, au.email,
          COUNT(r.id) as total_requests,
          COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_count,
          COUNT(r.id) FILTER (WHERE r.status IN ('pending','pickup')) as pending_count,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected') as rejected_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.assigned_at))/3600.0) FILTER (WHERE r.completed_at IS NOT NULL AND r.assigned_at IS NOT NULL), 2) as avg_resolution_hours,
          COUNT(r.id) FILTER (WHERE r.assigned_at IS NOT NULL AND r.completed_at IS NULL AND r.assigned_at < NOW() - INTERVAL '24 hours') as sla_breaches,
          COALESCE(SUM(r.fee::numeric) FILTER (WHERE r.status = 'completed'), 0) as revenue_generated,
          a.updated_at as last_active
        FROM education_agents a
        JOIN admin_users au ON au.id = a.admin_user_id
        LEFT JOIN education_service_requests r ON r.assigned_agent_id = a.id AND r.created_at >= NOW() - INTERVAL '${daysNum} days'
        GROUP BY a.id, au.name, au.email
      `,
      jamb: `
        SELECT 'jamb' as agent_type, a.id, a.employee_id, a.is_available,
          a.max_active_requests, a.current_active_requests, a.total_completed_requests,
          au.name, au.email,
          COUNT(r.id) as total_requests,
          COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_count,
          COUNT(r.id) FILTER (WHERE r.status IN ('pending','pickup')) as pending_count,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected') as rejected_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.assigned_at))/3600.0) FILTER (WHERE r.completed_at IS NOT NULL AND r.assigned_at IS NOT NULL), 2) as avg_resolution_hours,
          COUNT(r.id) FILTER (WHERE r.assigned_at IS NOT NULL AND r.completed_at IS NULL AND r.assigned_at < NOW() - INTERVAL '24 hours') as sla_breaches,
          COALESCE(SUM(r.fee::numeric) FILTER (WHERE r.status = 'completed'), 0) as revenue_generated,
          a.updated_at as last_active
        FROM jamb_agents a
        JOIN admin_users au ON au.id = a.admin_user_id
        LEFT JOIN jamb_service_requests r ON r.assigned_agent_id = a.id AND r.created_at >= NOW() - INTERVAL '${daysNum} days'
        GROUP BY a.id, au.name, au.email
      `,
      identity: `
        SELECT 'identity' as agent_type, a.id, a.employee_id, a.is_available,
          a.max_active_requests, a.current_active_requests, a.total_completed_requests,
          au.name, au.email,
          COUNT(r.id) as total_requests,
          COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_count,
          COUNT(r.id) FILTER (WHERE r.status IN ('pending','pickup')) as pending_count,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected') as rejected_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.assigned_at))/3600.0) FILTER (WHERE r.completed_at IS NOT NULL AND r.assigned_at IS NOT NULL), 2) as avg_resolution_hours,
          COUNT(r.id) FILTER (WHERE r.assigned_at IS NOT NULL AND r.completed_at IS NULL AND r.assigned_at < NOW() - INTERVAL '24 hours') as sla_breaches,
          COALESCE(SUM(r.fee::numeric) FILTER (WHERE r.status = 'completed'), 0) as revenue_generated,
          a.updated_at as last_active
        FROM identity_agents a
        JOIN admin_users au ON au.id = a.admin_user_id
        LEFT JOIN identity_service_requests r ON r.assigned_agent_id = a.id AND r.created_at >= NOW() - INTERVAL '${daysNum} days'
        GROUP BY a.id, au.name, au.email
      `,
      a2c: `
        SELECT 'a2c' as agent_type, a.id, a.employee_id, a.is_available,
          a.max_active_requests, a.current_active_requests, a.total_completed_requests,
          au.name, au.email,
          COUNT(r.id) as total_requests,
          COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_count,
          COUNT(r.id) FILTER (WHERE r.status IN ('pending','processing')) as pending_count,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected') as rejected_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.assigned_at))/3600.0) FILTER (WHERE r.completed_at IS NOT NULL AND r.assigned_at IS NOT NULL), 2) as avg_resolution_hours,
          COUNT(r.id) FILTER (WHERE r.assigned_at IS NOT NULL AND r.completed_at IS NULL AND r.assigned_at < NOW() - INTERVAL '24 hours') as sla_breaches,
          COALESCE(SUM(r.amount_naira::numeric) FILTER (WHERE r.status = 'completed'), 0) as revenue_generated,
          a.updated_at as last_active
        FROM a2c_agents a
        JOIN admin_users au ON au.id = a.admin_user_id
        LEFT JOIN a2c_requests r ON r.agent_id = a.id AND r.created_at >= NOW() - INTERVAL '${daysNum} days'
        GROUP BY a.id, au.name, au.email
      `,
      cac: `
        SELECT 'cac' as agent_type, a.id, a.employee_id, a.is_available,
          a.max_active_requests, a.current_active_requests, a.total_completed_requests,
          au.name, au.email,
          COUNT(r.id) as total_requests,
          COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_count,
          COUNT(r.id) FILTER (WHERE r.status IN ('pending','in_progress')) as pending_count,
          COUNT(r.id) FILTER (WHERE r.status = 'rejected') as rejected_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.assigned_at))/3600.0) FILTER (WHERE r.completed_at IS NOT NULL AND r.assigned_at IS NOT NULL), 2) as avg_resolution_hours,
          COUNT(r.id) FILTER (WHERE r.assigned_at IS NOT NULL AND r.completed_at IS NULL AND r.assigned_at < NOW() - INTERVAL '24 hours') as sla_breaches,
          COALESCE(SUM(r.fee::numeric) FILTER (WHERE r.status = 'completed'), 0) as revenue_generated,
          a.updated_at as last_active
        FROM cac_agents a
        JOIN admin_users au ON au.id = a.admin_user_id
        LEFT JOIN cac_registration_requests r ON r.assigned_agent_id = a.id AND r.created_at >= NOW() - INTERVAL '${daysNum} days'
        GROUP BY a.id, au.name, au.email
      `,
    };

    const typesToFetch = type && queries[type as string] ? [type as string] : Object.keys(queries);
    const results: any[] = [];

    for (const t of typesToFetch) {
      try {
        const rows = await db.execute(sql.raw(queries[t]));
        results.push(...(rows.rows || []).map((r: any) => ({
          ...r,
          completionRate: r.total_requests > 0 ? Math.round((r.completed_count / r.total_requests) * 100) : 0,
          loadPercent: r.max_active_requests > 0 ? Math.round((r.current_active_requests / r.max_active_requests) * 100) : 0,
          performanceScore: computeScore(r),
        })));
      } catch (e: any) {
        logger.warn(`Performance query failed for ${t}`, { error: e.message });
      }
    }

    results.sort((a, b) => b.performanceScore - a.performanceScore);
    res.json(formatResponse('success', 200, 'Agent performance data', { agents: results, days: daysNum }));
  } catch (error: any) {
    logger.error('Agent performance error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch performance data'));
  }
});

function computeScore(r: any): number {
  const completionRate = r.total_requests > 0 ? (r.completed_count / r.total_requests) * 100 : 50;
  const slaScore = Math.max(0, 100 - (r.sla_breaches * 10));
  const speedScore = r.avg_resolution_hours != null ? Math.max(0, 100 - Math.min(100, r.avg_resolution_hours * 5)) : 50;
  const loadScore = r.max_active_requests > 0 ? Math.min(100, (r.current_active_requests / r.max_active_requests) * 100) : 0;
  return Math.round((completionRate * 0.4) + (slaScore * 0.3) + (speedScore * 0.2) + (loadScore * 0.1));
}

router.get('/agents/performance/:agentType/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentType, agentId } = req.params;
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;

    const requestTableMap: Record<string, { table: string; agentCol: string; feeCol: string; pendingStatuses: string }> = {
      education: { table: 'education_service_requests', agentCol: 'assigned_agent_id', feeCol: 'fee', pendingStatuses: "'pending','pickup'" },
      jamb:      { table: 'jamb_service_requests',      agentCol: 'assigned_agent_id', feeCol: 'fee', pendingStatuses: "'pending','pickup'" },
      identity:  { table: 'identity_service_requests',  agentCol: 'assigned_agent_id', feeCol: 'fee', pendingStatuses: "'pending','pickup'" },
      a2c:       { table: 'a2c_requests',               agentCol: 'agent_id',          feeCol: 'amount_naira', pendingStatuses: "'pending','processing'" },
      cac:       { table: 'cac_registration_requests',  agentCol: 'assigned_agent_id', feeCol: 'fee', pendingStatuses: "'pending','in_progress'" },
    };

    const agentTableMap: Record<string, string> = {
      education: 'education_agents', jamb: 'jamb_agents', identity: 'identity_agents', a2c: 'a2c_agents', cac: 'cac_agents',
    };

    if (!requestTableMap[agentType]) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid agent type'));
    }

    const { table, agentCol, feeCol, pendingStatuses } = requestTableMap[agentType];
    const agentTable = agentTableMap[agentType];

    const agentInfo = await db.execute(sql.raw(`
      SELECT a.*, au.name, au.email, au.role
      FROM ${agentTable} a
      JOIN admin_users au ON au.id = a.admin_user_id
      WHERE a.id = '${agentId}'
    `));
    if (!agentInfo.rows?.length) return res.status(404).json(formatErrorResponse(404, 'Agent not found'));

    const requests = await db.execute(sql.raw(`
      SELECT id, status, service_type, assigned_at, completed_at, created_at, ${feeCol} as fee, tracking_id
      FROM ${table}
      WHERE ${agentCol} = '${agentId}'
        AND created_at >= NOW() - INTERVAL '${daysNum} days'
      ORDER BY created_at DESC
      LIMIT 100
    `));

    const dailyTrend = await db.execute(sql.raw(`
      SELECT DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM(${feeCol}::numeric) FILTER (WHERE status = 'completed'), 0) as revenue
      FROM ${table}
      WHERE ${agentCol} = '${agentId}'
        AND created_at >= NOW() - INTERVAL '${daysNum} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `));

    const activityLog = await db.execute(sql.raw(`
      SELECT action, service_type, metadata, created_at
      FROM agent_activity_logs
      WHERE agent_id = '${agentId}' AND agent_type = '${agentType}'
      ORDER BY created_at DESC
      LIMIT 50
    `));

    const reqRows = requests.rows || [];
    const completed = reqRows.filter((r: any) => r.status === 'completed');
    const slaBreaches = reqRows.filter((r: any) => r.assigned_at && !r.completed_at && new Date(r.assigned_at) < new Date(Date.now() - 86400000));

    const avgResHours = completed.length > 0
      ? completed.reduce((acc: number, r: any) => {
          if (r.completed_at && r.assigned_at) {
            return acc + (new Date(r.completed_at).getTime() - new Date(r.assigned_at).getTime()) / 3600000;
          }
          return acc;
        }, 0) / completed.length
      : null;

    res.json(formatResponse('success', 200, 'Agent detail performance', {
      agent: agentInfo.rows[0],
      metrics: {
        totalRequests: reqRows.length,
        completed: completed.length,
        pending: reqRows.filter((r: any) => ['pending','pickup','processing','in_progress'].includes(r.status)).length,
        rejected: reqRows.filter((r: any) => r.status === 'rejected').length,
        completionRate: reqRows.length > 0 ? Math.round((completed.length / reqRows.length) * 100) : 0,
        avgResolutionHours: avgResHours != null ? Math.round(avgResHours * 100) / 100 : null,
        slaBreaches: slaBreaches.length,
        revenueGenerated: completed.reduce((acc: number, r: any) => acc + parseFloat(r.fee || '0'), 0),
        loadPercent: agentInfo.rows[0].max_active_requests > 0
          ? Math.round((agentInfo.rows[0].current_active_requests / agentInfo.rows[0].max_active_requests) * 100) : 0,
      },
      requests: reqRows,
      dailyTrend: dailyTrend.rows || [],
      activityLog: activityLog.rows || [],
    }));
  } catch (error: any) {
    logger.error('Agent detail performance error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch agent detail'));
  }
});

export default router;
