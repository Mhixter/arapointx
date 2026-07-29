import { jobQueue, RPAJob } from './queue';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { rpaRecoveryService } from '../services/rpaRecoveryService';
import { jambWorker } from './workers/jambWorker';
import { jambSlipWorker } from './workers/jambSlipWorker';
import { EducationWorkerFactory } from './workers/educationWorker';
import { vtpassScraperWorker } from './workers/vtpassScraperWorker';
import { db } from '../config/database';
import { rpaJobs, educationServices, servicePricing, adminSettings, transactions, jambServiceRequests } from '../db/schema';
import { eq, asc, and, lt, sql } from 'drizzle-orm';
import { browserPool } from './browserPool';
import { walletService } from '../services/walletService';
import { fireWebhookIfEnabled } from '../services/webhookService';

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

    // Initialize browser pool in the background (non-blocking).
    // Pool size (browsers) is independent from job concurrency.
    // Up to RPA_MAX_CONCURRENT_JOBS can be "processing" at once;
    // each waits for a browser slot from this pool.
    const poolSize = config.RPA_BROWSER_POOL_SIZE || 20;
    browserPool.initialize(poolSize).catch(err => {
      logger.error('Browser pool initialization failed', { error: err.message });
    });

    this.processingInterval = setInterval(() => {
      this.processNextJob().catch(err => {
        logger.error('Error in processNextJob loop', { error: err.message });
      });
    }, 500);

    // Every 2 minutes: reset jobs stuck in 'processing' for > 6 minutes back to 'pending'
    setInterval(() => {
      this.recoverStuckJobs().catch(err => {
        logger.error('Error in stuck-job recovery', { error: err.message });
      });
    }, 2 * 60 * 1000);

    // Run once immediately on startup to recover any jobs stuck from before restart
    setTimeout(() => {
      this.recoverStuckJobs().catch(err => {
        logger.error('Error in initial stuck-job recovery', { error: err.message });
      });
    }, 5000);
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

  private async recoverStuckJobs(): Promise<void> {
    const stuckThreshold = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
    const stuckJobs = await db.select({ id: rpaJobs.id, retryCount: rpaJobs.retryCount, maxRetries: rpaJobs.maxRetries })
      .from(rpaJobs)
      .where(and(
        eq(rpaJobs.status, 'processing'),
        lt(rpaJobs.startedAt, stuckThreshold)
      ));

    if (stuckJobs.length > 0) {
      logger.warn(`Found ${stuckJobs.length} stuck job(s) in processing — resetting to pending`, {
        jobIds: stuckJobs.map(j => j.id),
      });
    }

    for (const job of stuckJobs) {
      const retryCount = (job.retryCount || 0) + 1;
      const maxRetries = job.maxRetries || 3;
      if (retryCount >= maxRetries) {
        await db.update(rpaJobs)
          .set({ status: 'failed', retryCount, errorMessage: 'Job timed out and exhausted all retries', completedAt: new Date() })
          .where(eq(rpaJobs.id, job.id));
        logger.warn('Stuck job marked as failed (max retries exhausted)', { jobId: job.id });
      } else {
        await db.update(rpaJobs)
          .set({ status: 'pending', retryCount, errorMessage: 'Reset after processing timeout', startedAt: null })
          .where(eq(rpaJobs.id, job.id));
        this.processingJobIds.delete(job.id);
        logger.info('Stuck job reset to pending', { jobId: job.id, retryCount });
      }
    }
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

      if (job.service_type === 'jamb_exam_slip') {
        const slipSuccess: boolean = result.success && !(result.data as any)?.error;
        const errorMsg = !slipSuccess ? (result.error || (result.data as any)?.errorMessage || 'Failed to retrieve slip') : undefined;
        await this.updateJambSlipService(job, slipSuccess, result.data as any, errorMsg);
      } else if (job.service_type.includes('jamb') || job.service_type.includes('waec') || 
          job.service_type.includes('neco') || job.service_type.includes('nabteb') ||
          job.service_type.includes('nbais')) {
        const errorMsg = hasError ? (result.error || (result.data as any)?.errorMessage || 'Verification failed') : undefined;
        await this.updateEducationService(job, { ...result, success: !hasError }, errorMsg);
        if (job.service_type.startsWith('screening_')) {
          const portal = job.service_type.replace('screening_', '');
          this.updatePortalCircuit(portal, !hasError).catch(() => {});
        }
      }

      // ── Fire developer webhook if this was a developer API job ────────────
      const queryData = job.query_data || {};
      if (queryData.source === 'developer_api' && queryData.developerId) {
        this.fireDeveloperWebhook(queryData.developerId as string, job.id, finalStatus, result).catch(() => {});
      }

      // ── Finalise unified verification request when education job completes ──
      if (queryData.source === 'developer_api_unified' && queryData.unifiedRequestId) {
        import('../services/unifiedFinalizer').then(({ finalizeUnifiedRequest }) => {
          finalizeUnifiedRequest(
            queryData.unifiedRequestId as string,
            job.id,
            result,
            hasError,
          ).catch((e: any) => {
            logger.error('Unified finalizer error', {
              requestId: queryData.unifiedRequestId,
              jobId: job.id,
              error: e.message,
            });
          });
        }).catch(() => {});
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

        if (job.service_type === 'jamb_exam_slip') {
          await this.updateJambSlipService(job, false, null, error.message);
        } else if (job.service_type.includes('jamb') || job.service_type.includes('waec') || 
            job.service_type.includes('neco') || job.service_type.includes('nabteb') ||
            job.service_type.includes('nbais')) {
          await this.updateEducationService(job, { success: false }, error.message);
          if (job.service_type.startsWith('screening_')) {
            const portal = job.service_type.replace('screening_', '');
            this.updatePortalCircuit(portal, false).catch(() => {});
          }
        }

        this.triggerAIRecovery(job, error.message).catch(e => {
          logger.warn('AI recovery trigger failed (non-critical)', { error: e.message, jobId: job.id });
        });
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
      case 'screening_jamb':
        return await jambWorker.execute(queryData);

      case 'jamb_exam_slip':
        return await jambSlipWorker.execute(queryData);

      case 'waec':
      case 'waec_result':
      case 'waec_service':
      case 'screening_waec':
        return await this.executeEducationWorker('waec', queryData);

      case 'neco':
      case 'neco_result':
      case 'neco_service':
      case 'screening_neco':
        return await this.executeEducationWorker('neco', queryData);

      case 'nabteb':
      case 'nabteb_result':
      case 'nabteb_service':
      case 'screening_nabteb':
        return await this.executeEducationWorker('nabteb', queryData);

      case 'nbais':
      case 'nbais_result':
      case 'nbais_service':
      case 'screening_nbais':
        return await this.executeEducationWorker('nbais', queryData);

      case 'vtpass_data_scrape':
        return await vtpassScraperWorker.execute();

      default:
        logger.warn(`Unknown service type: ${serviceType}`);
        return {
          success: false,
          error: `Unknown service type: ${serviceType}`,
        };
    }
  }

  private async executeEducationWorker(
    provider: string, 
    queryData: Record<string, any>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const validation = await EducationWorkerFactory.validateConfiguration(provider);
    if (!validation.valid) {
      logger.warn(`${provider.toUpperCase()} worker configuration invalid`, { error: validation.error });
      return { success: false, error: validation.error };
    }
    
    return await EducationWorkerFactory.getWorker(provider).execute(queryData);
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

  private async updateJambSlipService(
    job: RPAJob,
    success: boolean,
    data: Record<string, any> | null,
    errorMessage?: string
  ): Promise<void> {
    try {
      const queryData = job.query_data || {};
      const serviceRequestId = queryData.serviceRequestId as string;
      if (!serviceRequestId) return;

      const status = success ? 'completed' : 'failed';
      await db.update(jambServiceRequests)
        .set({
          status,
          resultData: data || null,
          resultUrl: data?.slipUrl || null,
          updatedAt: new Date(),
          ...(success ? { completedAt: new Date() } : {}),
        })
        .where(eq(jambServiceRequests.id, serviceRequestId));

      if (!success && job.user_id) {
        await this.refundFailedJob(job.user_id, job.id, 'jamb_exam_slip');
      }

      logger.info('JAMB slip service request updated', { serviceRequestId, status });
    } catch (err: any) {
      logger.error('Failed to update JAMB slip service request', { jobId: job.id, error: err.message });
    }
  }

  private async getServicePrice(serviceType: string): Promise<number> {
    try {
      const baseType = serviceType
        .replace('_result', '')
        .replace('_service', '')
        .replace('_score', '');
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
      const refundReference = `refund_failed_${serviceType}_${jobId}`;

      // Check if a refund was already issued for this job (prevents duplicate refunds on retries)
      const [existing] = await db.select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.referenceId, refundReference))
        .limit(1);

      if (existing) {
        logger.info('Skipping duplicate refund — already refunded for this job', { jobId, refundReference });
        return;
      }

      const refundAmount = await this.getServicePrice(serviceType);
      if (refundAmount > 0) {
        await walletService.refundBalance(userId, refundAmount, `failed_${serviceType}_${jobId}`);
        await walletService.revokeCommission(userId, refundAmount, serviceType);
        logger.info('Auto-refund processed for failed job', { userId, amount: refundAmount, jobId, serviceType });
      }
    } catch (error: any) {
      logger.error('Failed to process auto-refund', { jobId, error: error.message });
    }
  }

  private async fireDeveloperWebhook(
    developerId: string,
    jobId: string,
    status: string,
    result: { success: boolean; data?: Record<string, unknown>; error?: string }
  ): Promise<void> {
    try {
      const devRow = await db.execute(sql`
        SELECT id, webhook_url, webhook_secret, webhook_enabled
        FROM developer_users WHERE id = ${developerId}
      `);
      const dev = devRow.rows[0] as any;
      if (!dev) return;

      await fireWebhookIfEnabled(
        { id: dev.id, webhookUrl: dev.webhook_url, webhookSecret: dev.webhook_secret, webhookEnabled: dev.webhook_enabled },
        status === 'completed' ? 'verification.completed' : 'verification.failed',
        { jobId, status, result: result.data || {}, error: result.error || null }
      );
    } catch (e: any) {
      logger.warn('Failed to fire developer webhook', { developerId, jobId, error: e.message });
    }
  }

  private async updatePortalCircuit(portal: string, success: boolean): Promise<void> {
    try {
      if (success) {
        await db.execute(sql`
          INSERT INTO screening_portal_circuit
            (portal, consecutive_failures, total_successes, last_success_at, circuit_open, updated_at)
          VALUES (${portal}, 0, 1, NOW(), false, NOW())
          ON CONFLICT (portal) DO UPDATE SET
            consecutive_failures = 0,
            total_successes = screening_portal_circuit.total_successes + 1,
            last_success_at = NOW(),
            circuit_open = false,
            circuit_open_until = NULL,
            updated_at = NOW()
        `);
      } else {
        await db.execute(sql`
          INSERT INTO screening_portal_circuit
            (portal, consecutive_failures, total_failures, last_failure_at, updated_at)
          VALUES (${portal}, 1, 1, NOW(), NOW())
          ON CONFLICT (portal) DO UPDATE SET
            consecutive_failures = screening_portal_circuit.consecutive_failures + 1,
            total_failures = screening_portal_circuit.total_failures + 1,
            last_failure_at = NOW(),
            circuit_open = CASE
              WHEN (screening_portal_circuit.consecutive_failures + 1) >= 3 THEN true
              ELSE screening_portal_circuit.circuit_open
            END,
            circuit_open_until = CASE
              WHEN (screening_portal_circuit.consecutive_failures + 1) >= 3
                AND NOT screening_portal_circuit.circuit_open
              THEN NOW() + INTERVAL '30 minutes'
              ELSE screening_portal_circuit.circuit_open_until
            END,
            updated_at = NOW()
        `);
      }
      logger.info(`Portal circuit updated`, { portal, success });
    } catch (e: any) {
      logger.warn('Portal circuit update failed (non-critical)', { portal, error: e.message });
    }
  }

  private async triggerAIRecovery(job: RPAJob, errorMessage: string): Promise<void> {
    const serviceType = (job.service_type || '').toLowerCase();
    const isRPAService = serviceType.includes('waec') || serviceType.includes('neco') ||
      serviceType.includes('nabteb') || serviceType.includes('nbais') ||
      serviceType.includes('jamb');
    if (!isRPAService) return;

    const provider = serviceType.split('_')[0];
    logger.info('Triggering AI recovery analysis', { jobId: job.id, provider });
    await rpaRecoveryService.analyzeJobFailure(
      job.id,
      provider,
      job.service_type as string,
      errorMessage,
      'job_execution'
    );
  }

  getStatus() {
    return {
      running: this.isRunning,
      queueLength: jobQueue.getQueueLength(),
      activeJobs: this.activeJobCount,
      maxConcurrentJobs: config.RPA_MAX_CONCURRENT_JOBS || 100,
      browserPool: browserPool.getStats(),
    };
  }
}

export const rpaBot = new RPABot();
