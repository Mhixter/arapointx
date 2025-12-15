import type { Express } from "express";
import { createServer, type Server } from "http";

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

import { publicRateLimiter, authenticatedRateLimiter } from "./src/api/middleware/rateLimit";
import { errorHandler } from "./src/api/middleware/errorHandler";
import { rpaBot } from "./src/rpa/bot";
import { logger } from "./src/utils/logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

  app.use(errorHandler);

  app.use('/api/*', (req, res) => {
    res.status(404).json({
      status: 'error',
      code: 404,
      message: 'API endpoint not found',
    });
  });

  // RPA Bot status endpoint
  app.get('/api/rpa/status', (req, res) => {
    res.json(rpaBot.getStatus());
  });

  // Start RPA Bot for processing jobs
  rpaBot.start().then(() => {
    logger.info('RPA Bot successfully started');
  }).catch((err: any) => {
    logger.error('Failed to start RPA Bot', { error: err.message });
  });

  return httpServer;
}
