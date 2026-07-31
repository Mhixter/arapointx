import { Router } from 'express';
import {
  Request, Response, db, crypto, logger, sql, eq,
  apiKeyAuth, logApiCall, deductDeveloperBalance,
  API_PRICES, sandboxNIN, sandboxBVN, sandboxEducation, rpaJobs,
} from './shared';
import { nameSimilarityScore, toDecision, validateTimeline } from './verification';

const router = Router();
const EMPLOYMENT_MODEL_VERSION = 'employment-screening-v2';

function buildIntegrationModel(level: string) {
  return {
    version: EMPLOYMENT_MODEL_VERSION,
    level,
    checks: ['nin', 'bvn', 'identity_cross_match', 'timeline', 'ssce'],
    scoring: {
      nin: 20,
      bvn: 20,
      name_match: 20,
      dob_match: 15,
      timeline: 10,
      ssce: 15,
      max_with_ssce: 100,
      max_without_ssce: 85,
    },
  };
}

function dobsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const clean = (d: string) => d.replace(/[^0-9]/g, '');
  return clean(a).includes(clean(b).substring(0, 6)) || clean(b).includes(clean(a).substring(0, 6));
}

function labelScore(score: number): { label: string; level: string } {
  if (score >= 90) return { label: 'Very High Confidence', level: 'A' };
  if (score >= 75) return { label: 'High Confidence', level: 'B' };
  if (score >= 55) return { label: 'Moderate Confidence', level: 'C' };
  if (score >= 35) return { label: 'Low Confidence', level: 'D' };
  return { label: 'Very Low Confidence', level: 'F' };
}

router.post('/verify/employment', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, bvn, ssce, level = 'standard', employment_year, consent } = req.body;
  let statusCode = 202;
  let responseData: any;
  const empYear = employment_year ? parseInt(employment_year, 10) : new Date().getFullYear();

  try {
    if (consent !== true) {
      statusCode = 400;
      responseData = {
        status: 'error', code: 400,
        message: 'Candidate consent is required. Set consent: true to confirm the candidate has given explicit authorisation for their data to be verified.',
      };
      return res.status(400).json(responseData);
    }

    if (!nin || !bvn) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Both nin and bvn are required for employment verification' };
      return res.status(400).json(responseData);
    }
    if (!/^\d{11}$/.test(nin)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'NIN must be exactly 11 digits' };
      return res.status(400).json(responseData);
    }
    if (!/^\d{11}$/.test(bvn)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN must be exactly 11 digits' };
      return res.status(400).json(responseData);
    }
    if (isNaN(empYear) || empYear < 2000 || empYear > new Date().getFullYear() + 5) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'employment_year must be a valid year (2000 – current year + 5)' };
      return res.status(400).json(responseData);
    }
    if (ssce) {
      const validProviders = ['waec', 'neco', 'nabteb', 'nbais'];
      const providerLower = ssce.provider?.toLowerCase();

      if (!providerLower || !validProviders.includes(providerLower)) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `ssce.provider must be one of: ${validProviders.join(', ')}` };
        return res.status(400).json(responseData);
      }
      if (!ssce.examYear || !ssce.registrationNumber) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: 'ssce.examYear and ssce.registrationNumber are required when providing ssce' };
        return res.status(400).json(responseData);
      }
      if (!ssce.cardPin) {
        const pinLabel = providerLower === 'neco' ? 'ssce.cardPin (token)' : 'ssce.cardPin (scratch-card PIN)';
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `${pinLabel} is required for ${providerLower.toUpperCase()} verification` };
        return res.status(400).json(responseData);
      }
      const requiresSerial = ['waec', 'nabteb', 'nbais'].includes(providerLower);
      if (requiresSerial && !ssce.cardSerialNumber) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `ssce.cardSerialNumber (scratch-card serial) is required for ${providerLower.toUpperCase()} verification` };
        return res.status(400).json(responseData);
      }
    }

    const priceKey = level === 'higher' ? 'employment_higher' : 'employment_standard';
    await deductDeveloperBalance(dev.id, API_PRICES[priceKey],
      `Employment verification (${level}) — NIN ${nin.substring(0, 4)}***`, (dev as any).environmentMode);

    const requestId = 'EMP-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    if ((dev as any).environmentMode === 'sandbox') {
      const ninSandbox = sandboxNIN(nin);
      const bvnSandbox = sandboxBVN(bvn);
      const ninName = `${ninSandbox.data.firstName} ${ninSandbox.data.lastName}`;
      const bvnName = `${bvnSandbox.data.firstName} ${bvnSandbox.data.lastName}`;
      const nameScore = nameSimilarityScore(ninName, bvnName);
      const timeline = validateTimeline(ninSandbox.data.dateOfBirth, ssce?.examYear ? parseInt(ssce.examYear, 10) : null, empYear);
      statusCode = 200;
      responseData = {
        status: 'success', code: 200, message: 'Employment verification completed (sandbox)',
        data: {
          requestId, level, queueStatus: 'completed', processedAt: new Date().toISOString(),
          decision: 'PASS', flags: [],
          model: buildIntegrationModel(level),
          organization: {
            id: dev.id,
            name: dev.company || dev.name || null,
            email: dev.email || null,
          },
          checks: { identity_match: true, name_match_score: nameScore, dob_match: true, education_verified: !!ssce, timeline_valid: timeline.valid },
          confidence: { score: 100, label: 'Very High Confidence', grade: 'A', earned: 100, maxPossible: 100 },
          checkpoints: {
            nin:  { checkpoint: 'NIN Verification', status: 'verified', weight: '20 pts', earned: 20, data: ninSandbox.data },
            bvn:  { checkpoint: 'BVN Verification', status: 'verified', weight: '20 pts', earned: 20, data: bvnSandbox.data },
            crossMatch: {
              checkpoint: 'Identity Cross-Reference (NIN ↔ BVN)', status: 'completed',
              nameMatch: { result: true, score: nameScore, earned: 20, weight: '20 pts', ninName, bvnName },
              dobMatch:  { result: true, earned: 15, weight: '15 pts', ninDob: ninSandbox.data.dateOfBirth, bvnDob: bvnSandbox.data.dateOfBirth },
            },
            timeline: {
              checkpoint: 'Timeline Validation', status: 'passed', weight: '10 pts', earned: 10,
              employmentYear: empYear, ageAtEmployment: timeline.ageAtEmployment, ageAtExam: timeline.ageAtExam, issues: [],
            },
            ...(ssce ? {
              ssce: {
                checkpoint: 'SSCE / Qualifications Check', status: 'completed', weight: '15 pts', earned: 15,
                provider: ssce.provider.toUpperCase(),
                data: sandboxEducation(ssce.provider, ssce.registrationNumber, ssce.examYear?.toString()),
              },
            } : {}),
          },
          consentRecorded: { given: true, timestamp: new Date().toISOString() },
        },
      };
      return res.json(responseData);
    }

    await db.execute(sql`
      INSERT INTO developer_employment_requests
        (id, developer_id, nin, bvn, employment_year, level, consent_given, consent_at,
         ssce_provider, queue_status, developer_email, developer_name)
      VALUES
        (${requestId}, ${dev.id},
         ${nin.substring(0, 4) + '***'}, ${bvn.substring(0, 4) + '***'},
         ${empYear}, ${level}, true, now(),
         ${ssce?.provider?.toUpperCase() || null},
         'queued',
         ${dev.email || null}, ${dev.name || null})
    `);

    responseData = {
      status: 'accepted', code: 202,
      message: 'Employment verification queued. Poll the result endpoint for status.',
      data: {
        requestId, level, queueStatus: 'queued',
        submittedAt: new Date().toISOString(),
        model: buildIntegrationModel(level),
        organization: {
          id: dev.id,
          name: dev.company || dev.name || null,
          email: dev.email || null,
        },
        pollUrl: `GET /verify/employment/result/${requestId}`,
        estimatedTime: ssce ? '60–120 seconds (SSCE lookup via RPA)' : '5–15 seconds (identity checks only)',
        checks: {
          nin: 'queued', bvn: 'queued',
          ...(ssce ? { ssce: `queued — ${ssce.provider.toUpperCase()} (${ssce.examYear})` } : {}),
        },
      },
    };
    res.status(202).json(responseData);

    setImmediate(async () => {
      try {
        await db.execute(sql`
          UPDATE developer_employment_requests SET queue_status = 'processing' WHERE id = ${requestId}
        `);

        const { premblyService } = await import('../../../services/premblyService');
        const [ninResult, bvnResult] = await Promise.allSettled([
          premblyService.verifyNIN(nin),
          premblyService.verifyBVN(bvn),
        ]);

        const ninRes = ninResult.status === 'fulfilled' ? ninResult.value : { success: false, error: (ninResult.reason as Error)?.message || 'NIN lookup failed' };
        const bvnRes = bvnResult.status === 'fulfilled' ? bvnResult.value : { success: false, error: (bvnResult.reason as Error)?.message || 'BVN lookup failed' };

        const ninOk = ninRes.success === true;
        const bvnOk = bvnRes.success === true;
        const ninData = (ninRes as any).data || null;
        const bvnData = (bvnRes as any).data || null;

        const ninFullName = `${ninData?.firstName || ''} ${ninData?.lastName || ''}`.trim();
        const bvnFullName = `${bvnData?.firstName || ''} ${bvnData?.lastName || ''}`.trim();
        const nameScore = (ninOk && bvnOk) ? nameSimilarityScore(ninFullName, bvnFullName) : 0;
        const nameMatchPass = nameScore >= 0.72;
        const dobMatchPass = (ninOk && bvnOk) ? dobsMatch(ninData?.dateOfBirth || '', bvnData?.dateOfBirth || '') : false;

        const dob = ninData?.dateOfBirth || bvnData?.dateOfBirth || null;
        const ssceYear = ssce?.examYear ? parseInt(ssce.examYear, 10) : null;
        const timeline = validateTimeline(dob, ssceYear, empYear);

        const flags: string[] = [];
        if (!ninOk) flags.push(`NIN verification failed: ${(ninRes as any).error || 'unknown error'}`);
        if (!bvnOk) flags.push(`BVN verification failed: ${(bvnRes as any).error || 'unknown error'}`);
        if (ninOk && bvnOk && !nameMatchPass) flags.push(`Name mismatch between NIN and BVN (similarity: ${nameScore.toFixed(2)})`);
        if (ninOk && bvnOk && !dobMatchPass) flags.push('Date of birth mismatch between NIN and BVN');
        flags.push(...timeline.issues);

        const WEIGHTS = { nin: 20, bvn: 20, nameMatch: 20, dobMatch: 15, timeline: 10, ssce: 15 };
        const ninEarned      = ninOk ? WEIGHTS.nin : 0;
        const bvnEarned      = bvnOk ? WEIGHTS.bvn : 0;
        const nameEarned     = Math.round(nameScore * WEIGHTS.nameMatch);
        const dobEarned      = dobMatchPass ? WEIGHTS.dobMatch : 0;
        const timelineEarned = timeline.valid ? WEIGHTS.timeline : 0;
        const identityEarned = ninEarned + bvnEarned + nameEarned + dobEarned + timelineEarned;

        let ssceJobId: string | null = null;
        if (ssce) {
          const serviceTypeMap: Record<string, string> = { waec: 'waec_result', neco: 'neco_result', nabteb: 'nabteb_result', nbais: 'nbais_result' };
          const defaultExamTypeMap: Record<string, string> = { waec: 'WASSCE', neco: 'ssce_int', nabteb: 'NBC/NTC', nbais: 'AISSCE' };
          const providerKey = ssce.provider.toLowerCase();
          const svcType = serviceTypeMap[providerKey] || `${providerKey}_result`;
          const examTypeValue = defaultExamTypeMap[providerKey] || ssce.provider.toUpperCase();

          try {
            const [job] = await db.insert(rpaJobs).values({
              serviceType: svcType,
              queryData: {
                registrationNumber: ssce.registrationNumber,
                examYear: parseInt(String(ssce.examYear), 10),
                examType: examTypeValue,
                cardPin: ssce.cardPin,
                ...(ssce.cardSerialNumber ? { cardSerialNumber: ssce.cardSerialNumber } : {}),
                source: 'developer_api_employment',
                employmentRequestId: requestId,
              },
              status: 'pending',
              priority: 5,
            }).returning();
            ssceJobId = job.id;
          } catch (rpaErr: any) {
            flags.push(`SSCE queue failed: ${rpaErr.message}`);
          }
        }

        const maxPossible = ssce ? 100 : 85;
        const initialScore = Math.min(100, Math.round((identityEarned / maxPossible) * 100));
        const initialDecision = toDecision(initialScore);

        const ninDataJson  = JSON.stringify(ninOk ? { firstName: ninData?.firstName, lastName: ninData?.lastName, dateOfBirth: ninData?.dateOfBirth, gender: ninData?.gender, phone: ninData?.phone } : null);
        const bvnDataJson  = JSON.stringify(bvnOk ? { firstName: bvnData?.firstName, lastName: bvnData?.lastName, dateOfBirth: bvnData?.dateOfBirth, gender: bvnData?.gender, phone: bvnData?.phone } : null);
        const flagsJson    = JSON.stringify(flags);

        if (ssce) {
          await db.execute(sql`
            UPDATE developer_employment_requests SET
              nin_score       = ${ninEarned},
              bvn_score       = ${bvnEarned},
              name_match_score= ${nameScore},
              dob_match       = ${dobMatchPass},
              timeline_valid  = ${timeline.valid},
              timeline_score  = ${timelineEarned},
              nin_data        = ${ninDataJson}::jsonb,
              bvn_data        = ${bvnDataJson}::jsonb,
              flags           = ${flagsJson}::jsonb,
              ssce_job_id     = ${ssceJobId}::uuid,
              initial_score   = ${initialScore},
              queue_status    = 'processing',
              error_message   = null
            WHERE id = ${requestId}
          `);
        } else {
          await db.execute(sql`
            UPDATE developer_employment_requests SET
              nin_score       = ${ninEarned},
              bvn_score       = ${bvnEarned},
              name_match_score= ${nameScore},
              dob_match       = ${dobMatchPass},
              timeline_valid  = ${timeline.valid},
              timeline_score  = ${timelineEarned},
              nin_data        = ${ninDataJson}::jsonb,
              bvn_data        = ${bvnDataJson}::jsonb,
              flags           = ${flagsJson}::jsonb,
              initial_score   = ${initialScore},
              final_score     = ${initialScore},
              decision        = ${initialDecision},
              queue_status    = 'completed',
              completed_at    = now(),
              error_message   = null
            WHERE id = ${requestId}
          `);
        }

        logger.info('Employment background processing done', {
          requestId, ninOk, bvnOk, initialScore, hasSsce: !!ssce, ssceJobId,
        });
      } catch (bgErr: any) {
        logger.error('Employment background processing error', { requestId, error: bgErr.message });
        try {
          await db.execute(sql`
            UPDATE developer_employment_requests SET
              queue_status = 'failed',
              error_message = ${bgErr.message},
              completed_at = now()
            WHERE id = ${requestId}
          `);
        } catch {}
      }
    });

  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Employment verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/employment', 'POST',
      { nin: nin ? nin.substring(0, 4) + '***' : null, bvn: bvn ? bvn.substring(0, 4) + '***' : null, ssce, level, employment_year: empYear },
      responseData, statusCode,
      [200, 202].includes(statusCode) ? API_PRICES[`employment_${level === 'higher' ? 'higher' : 'standard'}`] : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.get('/verify/employment/result/:requestId', apiKeyAuth, async (req: Request, res: Response) => {
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { requestId } = req.params;
  const start = Date.now();
  let statusCode = 200;
  let responseData: any;

  try {
    const rows = await db.execute(sql`
      SELECT * FROM developer_employment_requests
      WHERE id = ${requestId} AND developer_id = ${dev.id}
      LIMIT 1
    `);
    const stored: any = (rows as any).rows?.[0] || (rows as any)[0];

    if (!stored) {
      statusCode = 404;
      responseData = { status: 'error', code: 404, message: 'Employment request not found or does not belong to your account' };
      return res.status(404).json(responseData);
    }

    const queueStatus = stored.queue_status || 'completed';
    if (queueStatus === 'queued') {
      statusCode = 202;
      responseData = {
        status: 'accepted', code: 202, message: 'Verification is queued and will begin processing shortly.',
        data: {
          requestId,
          queueStatus: 'queued',
          submittedAt: stored.created_at,
          model: buildIntegrationModel(stored.level || 'standard'),
          pollUrl: `GET /verify/employment/result/${requestId}`,
        },
      };
      return res.status(202).json(responseData);
    }
    if (queueStatus === 'processing') {
      statusCode = 202;
      responseData = {
        status: 'accepted', code: 202, message: 'Identity checks complete. SSCE result is being retrieved via RPA.',
        data: {
          requestId, queueStatus: 'processing', submittedAt: stored.created_at,
          model: buildIntegrationModel(stored.level || 'standard'),
          pollUrl: `GET /verify/employment/result/${requestId}`,
          partial: {
            nin: stored.nin_score > 0 ? 'verified' : 'pending',
            bvn: stored.bvn_score > 0 ? 'verified' : 'pending',
            ssce: 'processing — ' + (stored.ssce_provider || 'unknown'),
          },
        },
      };
      return res.status(202).json(responseData);
    }
    if (queueStatus === 'failed') {
      statusCode = 500;
      responseData = {
        status: 'error', code: 500, message: 'Employment verification processing failed.',
        data: { requestId, queueStatus: 'failed', error: stored.error_message || 'Unknown error', submittedAt: stored.created_at },
      };
      return res.status(500).json(responseData);
    }

    const ninScore      = parseInt(stored.nin_score || '0', 10);
    const bvnScore      = parseInt(stored.bvn_score || '0', 10);
    const nameMatchSc   = parseFloat(stored.name_match_score || '0');
    const nameEarned    = Math.round(nameMatchSc * 20);
    const dobEarned     = stored.dob_match ? 15 : 0;
    const timelineEarned = stored.timeline_valid ? 10 : 0;

    let earned = ninScore + bvnScore + nameEarned + dobEarned + timelineEarned;
    let ssceEarned = 0;
    let ssceSection: any = null;
    let educationVerified = false;
    const flags: string[] = Array.isArray(stored.flags) ? [...stored.flags] : [];

    if (stored.ssce_job_id) {
      const [job] = await db.select().from(rpaJobs).where(eq(rpaJobs.id, stored.ssce_job_id)).limit(1);
      if (!job) {
        ssceSection = { status: 'not_found', jobId: stored.ssce_job_id };
        flags.push('SSCE job record not found');
      } else if (job.status === 'completed' && job.result) {
        ssceEarned = 15;
        earned += ssceEarned;
        educationVerified = true;
        ssceSection = {
          status: 'completed', provider: stored.ssce_provider,
          earned: ssceEarned, weight: '15 pts', data: job.result,
        };
      } else if (job.status === 'failed') {
        ssceSection = { status: 'failed', provider: stored.ssce_provider, jobId: stored.ssce_job_id };
        flags.push('SSCE/education verification could not be completed — result lookup failed');
      } else {
        ssceSection = {
          status: job.status || 'processing', provider: stored.ssce_provider,
          jobId: stored.ssce_job_id, note: 'Still processing. Try again in 60 seconds.',
        };
      }

      if (job?.status === 'completed' || job?.status === 'failed') {
        const maxPossible = 100;
        const finalScore = Math.min(100, Math.round((earned / maxPossible) * 100));
        const finalDecision = toDecision(finalScore);
        await db.execute(sql`
          UPDATE developer_employment_requests
          SET final_score = ${finalScore}, decision = ${finalDecision}
          WHERE id = ${requestId}
        `).catch(() => {});
      }
    }

    const maxPossible = stored.ssce_job_id ? 100 : 85;
    const scorePercent = Math.min(100, Math.round((earned / maxPossible) * 100));
    const { label: confidenceLabel, level: confidenceLevel } = labelScore(scorePercent);
    const decision = toDecision(scorePercent);

    responseData = {
      status: 'success', code: 200,
      message: 'Employment verification result retrieved',
      data: {
        requestId, level: stored.level,
        processedAt: stored.created_at,
        retrievedAt: new Date().toISOString(),
        model: buildIntegrationModel(stored.level || 'standard'),
        organization: {
          id: dev.id,
          name: dev.company || dev.name || null,
          email: dev.email || null,
        },
        decision, flags,
        checks: {
          identity_match: ninScore > 0 && bvnScore > 0,
          name_match_score: nameMatchSc,
          dob_match: stored.dob_match,
          education_verified: educationVerified,
          timeline_valid: stored.timeline_valid,
        },
        confidence: {
          score: scorePercent, label: confidenceLabel, grade: confidenceLevel,
          earned, maxPossible,
        },
        ...(ssceSection ? { ssce: ssceSection } : {}),
        consentRecorded: { given: stored.consent_given, timestamp: stored.consent_at },
      },
    };

    res.json(responseData);
  } catch (e: any) {
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Failed to retrieve employment result', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, `/verify/employment/result/${requestId}`, 'GET',
      {}, responseData, statusCode, 0, Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

export default router;
