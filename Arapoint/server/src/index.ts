import express from 'express';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './api/middleware/errorHandler';
import { runStartupMigrations } from './utils/startupMigrations';

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

// Start Server
const PORT = config.PORT;

(async () => {
  await runStartupMigrations();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info('API server ready — RPA runs in a separate process (rpa-worker)');
  });
})();

export default app;
