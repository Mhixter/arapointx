import express from 'express';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './api/middleware/errorHandler';
import { runStartupMigrations } from './utils/startupMigrations';
import { db } from './config/database';
import { airtimeServices, dataServices } from './db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { airtimeNigeriaService } from './services/airtimeNigeriaService';

// Import routes
import authRoutes from './api/routes/auth';
import bvnRoutes from './api/routes/bvn';
import educationRoutes from './api/routes/education';
import airtimeRoutes from './api/routes/airtime';
import dataRoutes from './api/routes/data';
import walletRoutes from './api/routes/wallet';
import webhookRoutes from './api/routes/webhooks';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bvn', bvnRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/airtime', airtimeRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/webhooks', webhookRoutes);

// Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: 'Endpoint not found',
  });
});

// ─── VTU Pending-Transaction Poller ──────────────────────────────────────────
// Every 5 minutes, check any airtime/data transactions that have been pending
// for less than 2 hours. We ask AirtimeNigeria for their status and update the
// DB if they have been delivered. This is the fallback for when the webhook
// callback URL was wrong or a webhook was lost.
async function pollPendingVtuTransactions(): Promise<void> {
  try {
    const configured = await airtimeNigeriaService.isConfiguredAsync();
    if (!configured) return;

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const pendingAirtime = await db.select({ id: airtimeServices.id, reference: airtimeServices.reference })
      .from(airtimeServices)
      .where(and(eq(airtimeServices.status, 'pending'), gte(airtimeServices.createdAt, twoHoursAgo)));

    const pendingData = await db.select({ id: dataServices.id, reference: dataServices.reference })
      .from(dataServices)
      .where(and(eq(dataServices.status, 'pending'), gte(dataServices.createdAt, twoHoursAgo)));

    const all = [
      ...pendingAirtime.map(r => ({ ...r, table: 'airtime' as const })),
      ...pendingData.map(r => ({ ...r, table: 'data' as const })),
    ];

    if (all.length === 0) return;

    logger.info(`VTU poller: checking ${all.length} pending transaction(s)`);

    for (const tx of all) {
      if (!tx.reference) continue;
      const result = await airtimeNigeriaService.checkTransactionStatus(tx.reference);
      if (result.delivered) {
        if (tx.table === 'airtime') {
          await db.update(airtimeServices).set({ status: 'completed' }).where(eq(airtimeServices.id, tx.id));
        } else {
          await db.update(dataServices).set({ status: 'completed' }).where(eq(dataServices.id, tx.id));
        }
        logger.info(`VTU poller: ${tx.table} tx ${tx.reference} → completed`);
      }
    }
  } catch (err: any) {
    logger.warn('VTU poller error', { error: err.message });
  }
}

// Start Server
const PORT = config.PORT;

(async () => {
  await runStartupMigrations();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info('API server ready — RPA runs in a separate process (rpa-worker)');
  });
  // Start VTU pending-transaction poller (runs immediately then every 5 min)
  setTimeout(pollPendingVtuTransactions, 15_000); // first run 15s after startup
  setInterval(pollPendingVtuTransactions, 5 * 60 * 1000);
  logger.info('VTU status poller started (5min interval)');
})();

export default app;
