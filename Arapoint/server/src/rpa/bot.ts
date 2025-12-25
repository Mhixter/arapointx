import { jobQueue, RPAJob } from './queue';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { jambWorker } from './workers/jambWorker';
import { waecWorker } from './workers/waecWorker';
import { db } from '../config/database';
import { rpaJobs, educationServices, servicePricing, adminSettings } from '../db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { browserPool } from './browserPool';
import { walletService } from '../services/walletService';

const DEFAULT_PRICES: Record<string, number> = {
  jamb: 1000,
  waec: 1000,
  neco: 1000,
  nabteb: 1000,
  nbais: 1000,
};

class RPABot {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobCount: number = 0;
  private processingJobIds: Set<string> = new Set();

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('RPA Bot is already running');
      return;
    }

    this.isRunning = true;
    logger.info('RPA Bot started - polling database for jobs');

    // Initialize browser pool in the background (non-blocking)
    browserPool.initialize(config.RPA_MAX_CONCURRENT_JOBS || 5).catch(err => {
      logger.error('Browser pool initialization failed', { error: err.message });
    });

    this.processingInterval = setInterval(() => {
      this.processNextJob().catch(err => {
        logger.error('Error in processNextJob loop', { error: err.message });
      });
    }, 500);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    await browserPool.cleanup();
    logger.info('RPA Bot stopped');
  }

  private async processNextJob(): Promise<void> {
    if (this.activeJobCount >= (config.RPA_MAX_CONCURRENT_JOBS || 5)) {
      return;
    }

    // Poll database for pending jobs instead of in-memory queue
    let pendingJobs;
    try {
      pendingJobs = await db.select()
        .from(rpaJobs)
        .where(eq(rpaJobs.status, 'pending'))
        .orderBy(asc(rpaJobs.createdAt))
        .limit(1);
    } catch (err: any) {
      logger.error('Error polling database for jobs', { error: err.message });
      return;
    }

    const dbJob = pendingJobs[0];
    if (!dbJob || this.processingJobIds.has(dbJob.id)) return;
    
    logger.info('Found pending job in database', { jobId: dbJob.id, service: dbJob.serviceType });

    // Convert database job to RPAJob format
    const job: RPAJob = {
      id: dbJob.id,
      user_id: dbJob.userId || '',
      service_type: dbJob.serviceType,
      query_data: dbJob.queryData as Record<string, any>,
      priority: dbJob.priority || 0,
      status: (dbJob.status || 'pending') as 'pending' | 'processing' | 'completed' | 'failed',
      retry_count: dbJob.retryCount || 0,
      max_retries: dbJob.maxRetries || 3,
      created_at: dbJob.createdAt || new Date(),
    };

    this.processingJobIds.add(job.id);
    this.activeJobCount++;

    try {
      logger.info('Processing job', { jobId: job.id, service: job.service_type });

      await db.update(rpaJobs)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(rpaJobs.id, job.id));

      const result = await this.executeWorker(job);

      const hasError = !result.success || result.error || 
        (result.data && (result.data.error === true || result.data.errorMessage));
      const finalStatus = hasError ? 'failed' : 'completed';

      await db.update(rpaJobs)
        .set({
          status: finalStatus,
          result: result.data || {},
          errorMessage: hasError ? (result.error || (result.data as any)?.errorMessage || 'Verification failed') : null,
          completedAt: new Date(),
        })
        .where(eq(rpaJobs.id, job.id));

      if (job.service_type.includes('jamb') || job.service_type.includes('waec') || 
          job.service_type.includes('neco') || job.service_type.includes('nabteb') ||
          job.service_type.includes('nbais')) {
        const errorMsg = hasError ? (result.error || (result.data as any)?.errorMessage || 'Verification failed') : undefined;
        await this.updateEducationService(job, { ...result, success: !hasError }, errorMsg);
      }

      if (hasError) {
        logger.warn('Job completed with errors', { jobId: job.id, error: result.error || (result.data as any)?.errorMessage });
      } else {
        logger.info('Job completed successfully', { jobId: job.id });
      }
    } catch (error: any) {
      logger.error('Error processing job', { jobId: job.id, error: error.message });

      const retryCount = (job.retry_count || 0) + 1;
      const maxRetries = job.max_retries || 3;

      if (retryCount < maxRetries) {
        await db.update(rpaJobs)
          .set({
            status: 'pending',
            retryCount,
            errorMessage: error.message,
          })
          .where(eq(rpaJobs.id, job.id));
      } else {
        await db.update(rpaJobs)
          .set({
            status: 'failed',
            retryCount,
            errorMessage: error.message,
            completedAt: new Date(),
          })
          .where(eq(rpaJobs.id, job.id));

        if (job.service_type.includes('jamb') || job.service_type.includes('waec') || 
            job.service_type.includes('neco') || job.service_type.includes('nabteb') ||
            job.service_type.includes('nbais')) {
          await this.updateEducationService(job, { success: false }, error.message);
        }
      }
    } finally {
      this.processingJobIds.delete(job.id);
      this.activeJobCount--;
    }
  }

  private async executeWorker(job: RPAJob): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const serviceType = job.service_type.toLowerCase();
    const queryData = job.query_data || {};

    switch (serviceType) {
      case 'jamb':
      case 'jamb_score':
      case 'jamb_service':
        return await jambWorker.execute(queryData);

      case 'waec':
      case 'waec_result':
      case 'waec_service':
        return await waecWorker.execute(queryData);

      case 'neco':
      case 'neco_result':
      case 'neco_service':
        const necoUrl = await this.getPortalUrl('neco');
        if (!necoUrl) return { success: false, error: 'NECO portal URL not configured' };
        return await waecWorker.execute({ ...queryData, portalUrl: necoUrl }); // Using waecWorker as base for now if selectors match

      case 'nabteb':
      case 'nabteb_result':
      case 'nabteb_service':
        const nabtebUrl = await this.getPortalUrl('nabteb');
        if (!nabtebUrl) return { success: false, error: 'NABTEB portal URL not configured' };
        return { success: true, data: { message: 'NABTEB verification logic implementation in progress', registrationNumber: queryData.registrationNumber } };

      case 'nbais':
      case 'nbais_result':
      case 'nbais_service':
        const mbaisUrl = await this.getPortalUrl('mbais');
        if (!mbaisUrl) return { success: false, error: 'MBAIS portal URL not configured' };
        return { success: true, data: { message: 'MBAIS verification logic implementation in progress', registrationNumber: queryData.registrationNumber } };

      default:
        logger.warn(`Unknown service type: ${serviceType}`);
        return {
          success: false,
          error: `Unknown service type: ${serviceType}`,
        };
    }
  }

  private async getPortalUrl(provider: string): Promise<string | null> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, `rpa_provider_url_${provider}`))
        .limit(1);
      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error(`Failed to get ${provider} portal URL`, { error: error.message });
      return null;
    }
  }

  private async updateEducationService(
    job: RPAJob, 
    result: { success: boolean; data?: Record<string, unknown>; error?: string },
    errorMessage?: string
  ): Promise<void> {
    try {
      const [existingService] = await db.select()
        .from(educationServices)
        .where(eq(educationServices.jobId, job.id))
        .limit(1);

      if (existingService) {
        const status = result.success ? 'completed' : 'failed';
        const resultData = result.success 
          ? (result.data || {})
          : { 
              error: true,
              errorMessage: errorMessage || result.error || 'Verification failed',
              ...result.data
            };

        await db.update(educationServices)
          .set({
            status,
            resultData,
            updatedAt: new Date(),
          })
          .where(eq(educationServices.id, existingService.id));

        // Auto-refund on failure
        if (!result.success && existingService.userId) {
          await this.refundFailedJob(existingService.userId, job.id, existingService.serviceType);
        }
      }
    } catch (error: any) {
      logger.error('Failed to update education service', { jobId: job.id, error: error.message });
    }
  }

  private async getServicePrice(serviceType: string): Promise<number> {
    try {
      const baseType = serviceType.replace('_result', '').replace('_service', '').replace('_score', '');
      const [pricing] = await db.select()
        .from(servicePricing)
        .where(and(
          eq(servicePricing.serviceType, baseType),
          eq(servicePricing.isActive, true)
        ))
        .limit(1);
      
      if (pricing?.price) {
        return parseFloat(pricing.price);
      }
      return DEFAULT_PRICES[baseType] || 1000;
    } catch {
      const baseType = serviceType.replace('_result', '').replace('_service', '').replace('_score', '');
      return DEFAULT_PRICES[baseType] || 1000;
    }
  }

  private async refundFailedJob(userId: string, jobId: string, serviceType: string): Promise<void> {
    try {
      const refundAmount = await this.getServicePrice(serviceType);
      if (refundAmount > 0) {
        await walletService.refundBalance(userId, refundAmount, `failed_${serviceType}_${jobId}`);
        logger.info('Auto-refund processed for failed job', { userId, amount: refundAmount, jobId, serviceType });
      }
    } catch (error: any) {
      logger.error('Failed to process auto-refund', { jobId, error: error.message });
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      queueLength: jobQueue.getQueueLength(),
      activeJobs: this.activeJobCount,
      maxConcurrent: config.RPA_MAX_CONCURRENT_JOBS || 5,
      browserPool: browserPool.getStats(),
    };
  }
}

export const rpaBot = new RPABot();
