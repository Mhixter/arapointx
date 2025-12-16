import { db } from '../config/database';
import { rpaJobs, bvnServices, educationServices, identityVerifications, birthAttestations, airtimeServices, dataServices, electricityServices, cableServices } from '../db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { generateJobId, generateReferenceId, calculateEstimatedWaitTime } from '../utils/helpers';

type ServiceType = 
  | 'bvn_retrieval' | 'bvn_digital_card' | 'bvn_modify'
  | 'nin_lookup' | 'nin_phone' | 'lost_nin'
  | 'jamb_score' | 'waec_result' | 'neco_result' | 'nabteb_result' | 'nbais_result'
  | 'birth_attestation'
  | 'airtime_purchase' | 'data_purchase'
  | 'electricity_purchase' | 'cable_purchase';

interface CreateJobInput {
  userId: string;
  serviceType: ServiceType;
  queryData: Record<string, any>;
  priority?: number;
}

export const jobService = {
  async createJob(input: CreateJobInput) {
    const { userId, serviceType, queryData, priority = 0 } = input;

    const pendingJobs = await db.select()
      .from(rpaJobs)
      .where(eq(rpaJobs.status, 'pending'));

    const queueLength = pendingJobs.length;

    const [job] = await db.insert(rpaJobs).values({
      userId,
      serviceType,
      queryData,
      priority,
      status: 'pending',
      maxRetries: 3,
      retryCount: 0,
    }).returning();

    logger.info('RPA job created', { jobId: job.id, serviceType, userId });

    return {
      jobId: job.id,
      status: job.status,
      serviceType,
      estimatedWaitTime: calculateEstimatedWaitTime(queueLength),
      queuePosition: queueLength + 1,
    };
  },

  async getJobStatus(jobId: string, userId: string) {
    const [job] = await db.select()
      .from(rpaJobs)
      .where(and(eq(rpaJobs.id, jobId), eq(rpaJobs.userId, userId)))
      .limit(1);

    if (!job) {
      throw new Error('Job not found');
    }

    return {
      jobId: job.id,
      status: job.status,
      serviceType: job.serviceType,
      result: job.result,
      resultData: job.result,
      error: job.errorMessage,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  },

  async getJobsByUser(userId: string, serviceType?: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    let query = db.select()
      .from(rpaJobs)
      .where(eq(rpaJobs.userId, userId))
      .orderBy(desc(rpaJobs.createdAt))
      .limit(limit)
      .offset(offset);

    const jobs = await query;

    return {
      jobs,
      pagination: {
        page,
        limit,
      },
    };
  },

  async createBvnJob(userId: string, data: { bvn: string; phone?: string; serviceType: 'retrieval' | 'digital_card' | 'modification' }) {
    const requestId = generateReferenceId();

    await db.insert(bvnServices).values({
      userId,
      bvn: data.bvn,
      phone: data.phone,
      serviceType: data.serviceType,
      requestId,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: `bvn_${data.serviceType}` as ServiceType,
      queryData: { bvn: data.bvn, phone: data.phone, requestId },
      priority: 5,
    });
  },

  async createIdentityJob(userId: string, data: { nin?: string; phone?: string; enrollmentId?: string; type: 'nin' | 'nin_phone' | 'lost_nin' }) {
    await db.insert(identityVerifications).values({
      userId,
      verificationType: data.type,
      nin: data.nin,
      phone: data.phone,
      secondEnrollmentId: data.enrollmentId,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: data.type === 'nin' ? 'nin_lookup' : data.type === 'nin_phone' ? 'nin_phone' : 'lost_nin',
      queryData: data,
      priority: 5,
    });
  },

  async createEducationJob(userId: string, data: { 
    serviceType: 'jamb' | 'waec' | 'neco' | 'nabteb' | 'nbais';
    registrationNumber: string;
    examYear?: number;
    cardSerialNumber?: string;
    cardPin?: string;
    examType?: string;
  }) {
    const jobResult = await this.createJob({
      userId,
      serviceType: data.serviceType === 'jamb' ? 'jamb_score' : `${data.serviceType}_result` as ServiceType,
      queryData: data,
      priority: 3,
    });

    await db.insert(educationServices).values({
      userId,
      jobId: jobResult.jobId,
      serviceType: `${data.serviceType}_result`,
      registrationNumber: data.registrationNumber,
      examYear: data.examYear,
      status: 'pending',
    });

    return jobResult;
  },

  async createBirthJob(userId: string, data: { fullName: string; dateOfBirth: string; registrationNumber?: string }) {
    await db.insert(birthAttestations).values({
      userId,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      registrationNumber: data.registrationNumber,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: 'birth_attestation',
      queryData: data,
      priority: 3,
    });
  },

  async createAirtimeJob(userId: string, data: { network: string; phoneNumber: string; amount: number; type?: string }) {
    const transactionId = generateReferenceId();

    await db.insert(airtimeServices).values({
      userId,
      network: data.network,
      phoneNumber: data.phoneNumber,
      amount: data.amount.toFixed(2),
      type: data.type || 'sme',
      transactionId,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: 'airtime_purchase',
      queryData: { ...data, transactionId },
      priority: 7,
    });
  },

  async createDataJob(userId: string, data: { network: string; phoneNumber: string; planName: string; amount: number; type?: string }) {
    const transactionId = generateReferenceId();

    await db.insert(dataServices).values({
      userId,
      network: data.network,
      phoneNumber: data.phoneNumber,
      planName: data.planName,
      amount: data.amount.toFixed(2),
      type: data.type || 'sme',
      transactionId,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: 'data_purchase',
      queryData: { ...data, transactionId },
      priority: 7,
    });
  },

  async createElectricityJob(userId: string, data: { discoName: string; meterNumber: string; amount: number }) {
    const transactionId = generateReferenceId();

    await db.insert(electricityServices).values({
      userId,
      discoName: data.discoName,
      meterNumber: data.meterNumber,
      amount: data.amount.toFixed(2),
      transactionId,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: 'electricity_purchase',
      queryData: { ...data, transactionId },
      priority: 6,
    });
  },

  async createCableJob(userId: string, data: { provider: string; smartcardNumber: string; package: string; amount: number }) {
    const transactionId = generateReferenceId();

    await db.insert(cableServices).values({
      userId,
      provider: data.provider,
      smartcardNumber: data.smartcardNumber,
      package: data.package,
      amount: data.amount.toFixed(2),
      transactionId,
      status: 'pending',
    });

    return this.createJob({
      userId,
      serviceType: 'cable_purchase',
      queryData: { ...data, transactionId },
      priority: 6,
    });
  },

  async updateJobStatus(jobId: string, status: string, result?: any, error?: string) {
    const updateData: any = {
      status,
      ...(result && { result }),
      ...(error && { errorMessage: error }),
    };

    if (status === 'processing') {
      updateData.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await db.update(rpaJobs)
      .set(updateData)
      .where(eq(rpaJobs.id, jobId));

    logger.info('Job status updated', { jobId, status });
  },

  async retryJob(jobId: string) {
    const [job] = await db.select()
      .from(rpaJobs)
      .where(eq(rpaJobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error('Job not found');
    }

    if ((job.retryCount || 0) >= (job.maxRetries || 3)) {
      throw new Error('Max retries exceeded');
    }

    await db.update(rpaJobs)
      .set({
        status: 'pending',
        retryCount: (job.retryCount || 0) + 1,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      })
      .where(eq(rpaJobs.id, jobId));

    logger.info('Job retry scheduled', { jobId, retryCount: (job.retryCount || 0) + 1 });

    return { jobId, status: 'pending', retryCount: (job.retryCount || 0) + 1 };
  },
};
