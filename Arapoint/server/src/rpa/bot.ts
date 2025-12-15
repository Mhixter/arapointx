import { jobQueue, RPAJob } from './queue';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { jambWorker } from './workers/jambWorker';
import { waecWorker } from './workers/waecWorker';
import { db } from '../config/database';
import { rpaJobs, educationServices } from '../db/schema';
import { eq } from 'drizzle-orm';

class RPABot {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobCount: number = 0;

  start(): void {
    if (this.isRunning) {
      logger.warn('RPA Bot is already running');
      return;
    }

    this.isRunning = true;
    logger.info('RPA Bot started');

    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 2000);
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    logger.info('RPA Bot stopped');
  }

  private async processNextJob(): Promise<void> {
    if (this.activeJobCount >= (config.RPA_MAX_CONCURRENT_JOBS || 5)) {
      return;
    }

    const job = jobQueue.getNextJob();
    if (!job) return;

    this.activeJobCount++;

    try {
      logger.info('Processing job', { jobId: job.id, service: job.service_type });

      await db.update(rpaJobs)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(rpaJobs.id, job.id));

      const result = await this.executeWorker(job);

      await db.update(rpaJobs)
        .set({
          status: 'completed',
          resultData: result.data || {},
          completedAt: new Date(),
        })
        .where(eq(rpaJobs.id, job.id));

      if (job.service_type.includes('jamb') || job.service_type.includes('waec') || 
          job.service_type.includes('neco') || job.service_type.includes('nabteb') ||
          job.service_type.includes('nbais')) {
        await this.updateEducationService(job, result);
      }

      jobQueue.completeJob(job.id);
      logger.info('Job completed successfully', { jobId: job.id });
    } catch (error: any) {
      logger.error('Error processing job', { jobId: job.id, error: error.message });

      const attempts = (job.attempts || 0) + 1;
      const maxRetries = job.max_retries || 3;

      if (attempts < maxRetries) {
        await db.update(rpaJobs)
          .set({
            status: 'pending',
            attempts,
            errorMessage: error.message,
          })
          .where(eq(rpaJobs.id, job.id));
        
        jobQueue.requeueJob(job.id);
      } else {
        await db.update(rpaJobs)
          .set({
            status: 'failed',
            attempts,
            errorMessage: error.message,
            completedAt: new Date(),
          })
          .where(eq(rpaJobs.id, job.id));
        
        jobQueue.failJob(job.id);
      }
    } finally {
      this.activeJobCount--;
    }
  }

  private async executeWorker(job: RPAJob): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const serviceType = job.service_type.toLowerCase();
    const queryData = job.query_data || {};

    switch (serviceType) {
      case 'jamb':
      case 'jamb_service':
        return await jambWorker.execute(queryData);

      case 'waec':
      case 'waec_service':
        return await waecWorker.execute(queryData);

      case 'neco':
      case 'neco_service':
      case 'nabteb':
      case 'nabteb_service':
      case 'nbais':
      case 'nbais_service':
        logger.warn(`Worker for ${serviceType} not yet implemented, using placeholder`);
        return {
          success: true,
          data: {
            message: `${serviceType.toUpperCase()} verification pending - worker implementation in progress`,
            registrationNumber: queryData.registrationNumber,
            status: 'pending_implementation',
          },
        };

      default:
        logger.warn(`Unknown service type: ${serviceType}`);
        return {
          success: false,
          error: `Unknown service type: ${serviceType}`,
        };
    }
  }

  private async updateEducationService(job: RPAJob, result: { success: boolean; data?: Record<string, unknown> }): Promise<void> {
    try {
      const serviceType = job.service_type.replace('_service', '');
      
      const [existingService] = await db.select()
        .from(educationServices)
        .where(eq(educationServices.jobId, job.id))
        .limit(1);

      if (existingService) {
        await db.update(educationServices)
          .set({
            status: result.success ? 'completed' : 'failed',
            resultData: result.data || {},
            updatedAt: new Date(),
          })
          .where(eq(educationServices.id, existingService.id));
      }
    } catch (error: any) {
      logger.error('Failed to update education service', { jobId: job.id, error: error.message });
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      queueLength: jobQueue.getQueueLength(),
      activeJobs: this.activeJobCount,
      maxConcurrent: config.RPA_MAX_CONCURRENT_JOBS || 5,
    };
  }
}

export const rpaBot = new RPABot();
