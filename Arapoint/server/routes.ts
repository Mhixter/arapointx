import type { Express } from "express";
import { createServer, type Server } from "http";
import { objectStorageService, ObjectNotFoundError } from "./src/services/objectStorage";
import { db } from "./src/config/database";
import { servicePricing } from "./src/db/schema";
import { eq, inArray, and, gt, sql } from "drizzle-orm";
import { adminSettings, supportPresence } from "./src/db/schema";

import authRoutes from "./src/api/routes/auth";
import otpRoutes from "./src/api/routes/otp";
import bvnRoutes from "./src/api/routes/bvn";
import identityRoutes from "./src/api/routes/identity";
import educationRoutes from "./src/api/routes/education";
import birthRoutes from "./src/api/routes/birth";
import airtimeRoutes from "./src/api/routes/airtime";
import dataRoutes from "./src/api/routes/data";
import electricityRoutes from "./src/api/routes/electricity";
import cableRoutes from "./src/api/routes/cable";
import walletRoutes from "./src/api/routes/wallet";
import paymentRoutes from "./src/api/routes/payment";
import adminRoutes from "./src/api/routes/admin";
import dashboardRoutes from "./src/api/routes/dashboard";
import cacRoutes from "./src/api/routes/cac";
import cacAgentRoutes from "./src/api/routes/cacAgent";
import identityAgentRoutes from "./src/api/routes/identityAgent";
import educationAgentRoutes from "./src/api/routes/educationAgent";
import a2cAgentRoutes from "./src/api/routes/a2cAgent";
import jambAgentRoutes from "./src/api/routes/jambAgent";
import pricingRoutes from "./src/api/routes/pricing";
import rpaRoutes from "./src/api/routes/rpa";
import slipsRoutes from "./src/api/routes/slips";
import supportRoutes from "./src/api/routes/support";
import webhookRoutes from "./src/api/routes/webhooks";
import filesRoutes from "./src/api/routes/files";
import developerRoutes from "./src/api/routes/developer";

import { publicRateLimiter, authenticatedRateLimiter } from "./src/api/middleware/rateLimit";
import { errorHandler } from "./src/api/middleware/errorHandler";
import { authMiddleware } from "./src/api/middleware/auth";
import { logger } from "./src/utils/logger";

import { registerObjectStorageRoutes } from "./src/replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register object storage routes
  registerObjectStorageRoutes(app);

  const defaultOrigins = [
    'https://arapoint.com.ng',
    'https://www.arapoint.com.ng',
    'https://developer.arapoint.com.ng',
  ];
  if (process.env.REPLIT_DEV_DOMAIN) {
    defaultOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPL_SLUG) {
    defaultOrigins.push(/https:\/\/.*\.replit\.dev/i as any);
  }

  app.use((req, res, next) => {
    const allowedOrigins: (string | RegExp)[] = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : defaultOrigins;
    const origin = req.headers.origin || '';

    const isAllowed = allowedOrigins.some(o => {
      if (typeof o === 'string') return o === '*' || o === origin;
      return o.test(origin);
    });

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, x-api-key, X-Request-Id');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  const serverStartTime = Date.now();

  app.get('/api/health', async (req, res) => {
    let dbStatus = 'unknown';
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }
    const memUsage = process.memoryUsage();
    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      database: dbStatus,
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
    });
  });

  app.get('/api/settings/public', publicRateLimiter, async (req, res) => {
    try {
      const publicKeys = [
        'siteName', 'siteEmail', 'sitePhone', 'siteAddress',
        'maintenanceMode', 'currency', 'timezone',
        'supportWhatsappChannel', 'supportWhatsappGroup',
      ];
      
      const settings = await db.select().from(adminSettings)
        .where(inArray(adminSettings.settingKey, publicKeys));
      
      const settingsMap: Record<string, any> = {};
      for (const setting of settings) {
        let value: any = setting.settingValue;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        settingsMap[setting.settingKey] = value;
      }
      
      res.json({
        status: 'success',
        code: 200,
        message: 'Public settings retrieved',
        data: settingsMap
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Failed to get settings'
      });
    }
  });

  // Public endpoint to get all active services from pricing management
  app.get('/api/public/services', publicRateLimiter, async (req, res) => {
    try {
      const services = await db.select().from(servicePricing)
        .where(eq(servicePricing.isActive, true))
        .orderBy(servicePricing.serviceName);
      
      // Categorize services by type
      const categorizedServices = {
        identity: services.filter((s: typeof services[0]) => 
          s.serviceType.startsWith('nin_') || 
          s.serviceType.startsWith('bvn_') ||
          s.serviceType === 'nin_phone'
        ),
        education: services.filter((s: typeof services[0]) => 
          s.serviceType.startsWith('jamb_') || 
          s.serviceType.startsWith('waec_') || 
          s.serviceType.startsWith('neco_') ||
          s.serviceType.startsWith('nabteb_') ||
          s.serviceType.startsWith('nbais_')
        ),
        cac: services.filter((s: typeof services[0]) => s.serviceType.startsWith('cac_')),
        vtu: services.filter((s: typeof services[0]) => 
          s.serviceType.startsWith('airtime_') || 
          s.serviceType.startsWith('data_') ||
          s.serviceType.startsWith('electricity_') ||
          s.serviceType.startsWith('cable_')
        ),
      };
      
      res.json({ 
        status: 'success', 
        code: 200, 
        message: 'Services retrieved',
        data: { services, categorizedServices }
      });
    } catch (error: any) {
      res.status(500).json({ 
        status: 'error', 
        code: 500, 
        message: 'Failed to get services' 
      });
    }
  });

  app.get('/objects/*', async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: 'File not found' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/upload/get-url', authMiddleware, authenticatedRateLimiter, async (req, res) => {
    try {
      const { prefix } = req.body;
      const allowedPrefixes = ['cac-certificates', 'cac-status-reports', 'documents', 'identity-slips'];
      const safePrefix = allowedPrefixes.includes(prefix) ? prefix : 'documents';
      const result = await objectStorageService.getObjectEntityUploadURL(safePrefix);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get upload URL' });
    }
  });

  app.get('/api/identity/sample-slip/:type', publicRateLimiter, async (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['information', 'regular', 'standard', 'premium'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid slip type' });
      }

      const { generateNINSlip } = await import('./src/utils/slipGenerator');
      const sampleData = {
        nin: '12345678901',
        firstName: 'JOHN',
        lastName: 'DOE',
        middleName: 'SAMPLE',
        dateOfBirth: '1990-01-15',
        gender: 'Male',
        phone: '08012345678',
        email: 'sample@example.com',
        stateOfOrigin: 'Lagos',
        lgaOfOrigin: 'Ikeja',
        residentialAddress: '123 Sample Street, Victoria Island',
        residentialState: 'Lagos',
        residentialLga: 'Eti-Osa',
        maritalStatus: 'Single',
        educationLevel: 'BSc',
        nationality: 'Nigerian',
        photo: '',
        signature: '',
        trackingId: 'TRK-SAMPLE-001',
        centralId: 'CID-SAMPLE-001',
        birthCountry: 'Nigeria',
        birthState: 'Lagos',
        birthLga: 'Lagos Island',
        employmentStatus: 'Employed',
        profession: 'Software Engineer',
        nokFirstName: 'JANE',
        nokLastName: 'DOE',
        nokPhone: '08098765432',
        nokAddress: '456 Sample Avenue, Lekki',
      };

      const slip = generateNINSlip(sampleData as any, `SAMPLE-${type.toUpperCase()}`, type as any);
      res.setHeader('Content-Type', 'text/html');
      res.send(slip.html);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate sample slip' });
    }
  });

  // Public endpoint for NIN slip pricing (no auth required)
  app.get('/api/identity/pricing', publicRateLimiter, async (req, res) => {
    try {
      const { pricingService } = await import('./src/services/pricingService');
      const [slipInfo, slipRegular, slipStandard, slipPremium, ninPhone] = await Promise.all([
        pricingService.getPricing('nin_slip_information'),
        pricingService.getPricing('nin_slip_regular'),
        pricingService.getPricing('nin_slip_standard'),
        pricingService.getPricing('nin_slip_premium'),
        pricingService.getPricing('nin_phone'),
      ]);
      const slipPricing = {
        information: slipInfo.price,
        regular: slipRegular.price,
        standard: slipStandard.price,
        premium: slipPremium.price,
        nin_phone: ninPhone.price,
      };
      res.json({ status: 'success', code: 200, message: 'NIN pricing retrieved', data: { pricing: slipPricing } });
    } catch (error: any) {
      res.status(500).json({ status: 'error', code: 500, message: 'Failed to fetch pricing' });
    }
  });

  app.use('/api/auth', publicRateLimiter, authRoutes);
  app.use('/api/otp', publicRateLimiter, otpRoutes);

  app.use('/api/bvn', authenticatedRateLimiter, bvnRoutes);
  app.use('/api/identity', authenticatedRateLimiter, identityRoutes);
  app.use('/api/education', authenticatedRateLimiter, educationRoutes);
  app.use('/api/birth', authenticatedRateLimiter, birthRoutes);

  app.use('/api/airtime', authenticatedRateLimiter, airtimeRoutes);
  app.use('/api/data', authenticatedRateLimiter, dataRoutes);
  app.use('/api/electricity', authenticatedRateLimiter, electricityRoutes);
  app.use('/api/cable', authenticatedRateLimiter, cableRoutes);

  app.use('/api/wallet', authenticatedRateLimiter, walletRoutes);
  app.use('/api/payment', paymentRoutes);

  app.use('/api/admin', authenticatedRateLimiter, adminRoutes);
  app.use('/api/dashboard', authenticatedRateLimiter, dashboardRoutes);
  app.use('/api/pricing', publicRateLimiter, pricingRoutes);
  
  app.use('/api/cac', authenticatedRateLimiter, cacRoutes);
  app.use('/api/cac-agent', cacAgentRoutes);
  app.use('/api/identity-agent', identityAgentRoutes);
  app.use('/api/education-agent', educationAgentRoutes);
  app.use('/api/a2c-agent', a2cAgentRoutes);
  app.use('/api/jamb-agent', jambAgentRoutes);
  app.use('/api/rpa-techhub', authenticatedRateLimiter, rpaRoutes);
  app.use('/api/slips', slipsRoutes);
  app.get('/api/support/availability', publicRateLimiter, async (req, res) => {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const onlineAgents = await db.select({ id: supportPresence.id })
        .from(supportPresence)
        .where(
          and(
            eq(supportPresence.participantType, 'agent'),
            gt(supportPresence.lastSeenAt, tenMinutesAgo)
          )
        )
        .limit(1);
      res.json({ status: 'success', code: 200, message: 'OK', data: { agentsOnline: onlineAgents.length > 0 } });
    } catch {
      res.json({ status: 'success', code: 200, message: 'OK', data: { agentsOnline: false } });
    }
  });

  app.use('/api/support', authenticatedRateLimiter, supportRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/files', authenticatedRateLimiter, filesRoutes);
  app.use('/api/v1/developer', developerRoutes);
  
  // Public verification page route (no /api prefix)
  app.get('/verify-slip/:reference', (req, res) => {
    res.redirect(`/api/slips/verify-page/${req.params.reference}`);
  });

  app.use(errorHandler);

  app.use('/api/*', (req, res) => {
    res.status(404).json({
      status: 'error',
      code: 404,
      message: 'API endpoint not found',
    });
  });

  return httpServer;
}
