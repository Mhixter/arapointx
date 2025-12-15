import express from 'express';
import { config } from './config/env';
import { logger } from './utils/logger';
import { rpaBot } from './rpa/bot';
import { errorHandler } from './api/middleware/errorHandler';

// Import routes
import authRoutes from './api/routes/auth';
import bvnRoutes from './api/routes/bvn';
import educationRoutes from './api/routes/education';
import airtimeRoutes from './api/routes/airtime';
import dataRoutes from './api/routes/data';
import walletRoutes from './api/routes/wallet';

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

// RPA Bot Status
app.get('/rpa/status', (req, res) => {
  res.json(rpaBot.getStatus());
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bvn', bvnRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/airtime', airtimeRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/wallet', walletRoutes);

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

app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  
  // Start RPA Bot with error handling
  try {
    await rpaBot.start();
    logger.info('RPA Bot successfully started');
  } catch (error: any) {
    logger.error('Failed to start RPA Bot', { error: error.message, stack: error.stack });
  }
});

export default app;
