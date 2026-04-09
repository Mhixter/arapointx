import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

function normaliseName(s: string = ''): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  const matchDist = Math.floor(Math.max(la, lb) / 2) - 1;
  const aMatch = new Array(la).fill(false);
  const bMatch = new Array(lb).fill(false);
  let matches = 0, transpositions = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - matchDist), end = Math.min(i + matchDist + 1, lb);
    for (let j = start; j < end; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  return (matches / la + matches / lb + (matches - transpositions / 2) / matches) / 3;
}

function jaroWinklerSimilarity(a: string, b: string): number {
  const jaro = jaroSimilarity(a, b);
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix++;
  return parseFloat((jaro + prefix * 0.1 * (1 - jaro)).toFixed(4));
}

function nameSimilarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normaliseName(a), nb = normaliseName(b);
  if (na === nb) return 1;
  const fullScore = jaroWinklerSimilarity(na, nb);
  const aWords = na.split(' ').filter(Boolean);
  const bWords = nb.split(' ').filter(Boolean);
  let tokenScore = 0;
  if (aWords.length > 0 && bWords.length > 0) {
    const total = aWords.reduce((sum, aw) => {
      const best = bWords.reduce((m, bw) => Math.max(m, jaroWinklerSimilarity(aw, bw)), 0);
      return sum + best;
    }, 0);
    tokenScore = total / aWords.length;
  }
  return parseFloat(Math.max(fullScore, tokenScore).toFixed(4));
}

function toDecision(score: number | null): 'PASS' | 'REVIEW' | 'FAIL' | 'PENDING' {
  if (score === null || score === undefined) return 'PENDING';
  if (score >= 85) return 'PASS';
  if (score >= 60) return 'REVIEW';
  return 'FAIL';
}

const CREDIT_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];

function gradeIsCredit(grade: unknown): boolean {
  if (typeof grade !== 'string' || !grade) return false;
  return CREDIT_GRADES.includes(grade.toUpperCase().trim());
}

function analyzeIdentityCheck(ninData: any, bvnData: any, eduData: any) {
  const flags: string[] = [];

  const ninName = ninData
    ? `${ninData.firstName || ''} ${ninData.middleName || ''} ${ninData.lastName || ''}`.replace(/\s+/g, ' ').trim()
    : '';
  const bvnName = bvnData
    ? `${bvnData.firstName || ''} ${bvnData.middleName || ''} ${bvnData.lastName || ''}`.replace(/\s+/g, ' ').trim()
    : '';
  const ninDob = ninData?.dateOfBirth || null;
  const bvnDob = bvnData?.dateOfBirth || null;

  const ninBvnNameScore = ninName && bvnName ? nameSimilarityScore(ninName, bvnName) : 0;
  const ninBvnNameMatch = ninBvnNameScore >= 0.72;
  const ninBvnDobMatch = !!(ninDob && bvnDob && ninDob === bvnDob);

  if (!ninBvnNameMatch)
    flags.push(`Name mismatch between NIN ("${ninName}") and BVN ("${bvnName}") — match score: ${Math.round(ninBvnNameScore * 100)}%`);
  if (ninDob && bvnDob && !ninBvnDobMatch)
    flags.push(`Date of birth mismatch — NIN: ${ninDob}, BVN: ${bvnDob}`);

  const eduCandidateName = eduData?.candidateName || '';
  const eduDob = eduData?.candidateDateOfBirth || eduData?.dateOfBirth || null;

  const eduNameScore = eduCandidateName
    ? Math.max(
        ninName ? nameSimilarityScore(eduCandidateName, ninName) : 0,
        bvnName ? nameSimilarityScore(eduCandidateName, bvnName) : 0,
      )
    : 0;
  const eduNameMatchesNin =
    eduCandidateName && ninName ? nameSimilarityScore(eduCandidateName, ninName) >= 0.72 : false;
  const eduNameMatchesBvn =
    eduCandidateName && bvnName ? nameSimilarityScore(eduCandidateName, bvnName) >= 0.72 : false;

  if (eduCandidateName && !eduNameMatchesNin && !eduNameMatchesBvn)
    flags.push(`SSCE candidate name ("${eduCandidateName}") does not match NIN or BVN names`);

  const eduDobMatchesNin = eduDob && ninDob ? eduDob === ninDob : null;
  const eduDobMatchesBvn = eduDob && bvnDob ? eduDob === bvnDob : null;
  if (eduDob && ninDob && !eduDobMatchesNin)
    flags.push(`SSCE date of birth (${eduDob}) does not match NIN DOB (${ninDob})`);
  if (eduDob && bvnDob && !eduDobMatchesBvn)
    flags.push(`SSCE date of birth (${eduDob}) does not match BVN DOB (${bvnDob})`);

  const allNamesConsistent =
    ninBvnNameMatch && (eduNameMatchesNin || eduNameMatchesBvn || !eduCandidateName);
  const allDobConsistent =
    ninBvnDobMatch && eduDobMatchesNin !== false && eduDobMatchesBvn !== false;

  const subjects: { name: string; grade: string }[] = eduData?.subjects || [];
  const analyzedSubjects = subjects.map((s) => ({
    name: s.name,
    grade: s.grade,
    isCredit: gradeIsCredit(s.grade),
  }));

  const englishSubject = subjects.find((s) => /english/i.test(s.name));
  const mathSubject = subjects.find((s) => /math/i.test(s.name));
  const englishGrade = englishSubject?.grade || null;
  const englishIsCredit = englishGrade ? gradeIsCredit(englishGrade) : false;
  const mathGrade = mathSubject?.grade || null;
  const mathIsCredit = mathGrade ? gradeIsCredit(mathGrade) : false;

  const otherCreditSubjects = subjects
    .filter((s) => !/english/i.test(s.name) && !/math/i.test(s.name) && gradeIsCredit(s.grade))
    .map((s) => ({ name: s.name, grade: s.grade }));

  const totalCredits = analyzedSubjects.filter((s) => s.isCredit).length;
  const meetsMinimumRequirement = englishIsCredit && mathIsCredit && otherCreditSubjects.length >= 3;

  let requirementSummary: string;
  if (meetsMinimumRequirement) {
    requirementSummary = `PASS — ${totalCredits} credits including English (${englishGrade}) and Mathematics (${mathGrade}) plus ${otherCreditSubjects.length} other credit subject(s). Meets minimum 5-credit requirement.`;
  } else {
    const issues: string[] = [];
    if (!englishGrade) issues.push('English Language not found in results');
    else if (!englishIsCredit)
      issues.push(`English Language grade (${englishGrade}) is not a credit (C6 or above required)`);
    if (!mathGrade) issues.push('Mathematics not found in results');
    else if (!mathIsCredit)
      issues.push(`Mathematics grade (${mathGrade}) is not a credit (C6 or above required)`);
    if (otherCreditSubjects.length < 3)
      issues.push(`Only ${otherCreditSubjects.length} other credit subjects (minimum 3 required besides English and Maths)`);
    requirementSummary = `FAIL — ${issues.join('; ')}. Total credits: ${totalCredits}.`;
  }

  if (!englishIsCredit && englishGrade) flags.push(`English Language grade (${englishGrade}) is below credit level`);
  if (!mathIsCredit && mathGrade) flags.push(`Mathematics grade (${mathGrade}) is below credit level`);

  let overallScore = 0;
  if (ninData) overallScore += 15;
  if (bvnData) overallScore += 15;
  if (ninBvnNameMatch) overallScore += 10;
  if (ninBvnDobMatch) overallScore += 5;
  if (subjects.length > 0) overallScore += 10;
  if (eduNameMatchesNin || eduNameMatchesBvn) overallScore += 10;
  if (allDobConsistent) overallScore += 5;
  if (englishIsCredit) overallScore += 10;
  if (mathIsCredit) overallScore += 10;
  if (meetsMinimumRequirement) overallScore += 10;

  const decision = toDecision(overallScore) as 'PASS' | 'REVIEW' | 'FAIL';

  const summaryParts: string[] = [
    `Identity: NIN ${ninData ? '✓' : '✗'}, BVN ${bvnData ? '✓' : '✗'}`,
    `Name match: NIN↔BVN ${ninBvnNameMatch ? '✓' : '✗'} (${Math.round(ninBvnNameScore * 100)}%)`,
    `DOB match: NIN↔BVN ${ninBvnDobMatch ? '✓' : '✗'}`,
    ...(eduCandidateName
      ? [`SSCE name match: ${eduNameMatchesNin || eduNameMatchesBvn ? '✓' : '✗'} (${Math.round(eduNameScore * 100)}%)`]
      : []),
    `SSCE: ${totalCredits} credit(s), English ${englishIsCredit ? '✓' : '✗'} (${englishGrade || 'N/A'}), Maths ${mathIsCredit ? '✓' : '✗'} (${mathGrade || 'N/A'})`,
    `Minimum requirement (5 credits incl. English & Maths): ${meetsMinimumRequirement ? 'MET' : 'NOT MET'}`,
  ];

  return {
    crossCheck: {
      ninBvnNameMatch,
      ninBvnNameScore: Math.round(ninBvnNameScore * 100),
      ninBvnDobMatch,
      eduNameMatchesNin,
      eduNameMatchesBvn,
      eduNameScore: Math.round(eduNameScore * 100),
      eduDobMatchesNin,
      eduDobMatchesBvn,
      allNamesConsistent,
      allDobConsistent,
    },
    ssceAnalysis: {
      totalSubjects: subjects.length,
      totalCredits,
      englishGrade,
      englishIsCredit,
      mathGrade,
      mathIsCredit,
      otherCreditSubjects,
      otherCreditCount: otherCreditSubjects.length,
      meetsMinimumRequirement,
      requirementSummary,
      subjects: analyzedSubjects,
    },
    overallScore,
    decision,
    summary: summaryParts.join(' | '),
    flags,
  };
}

export async function finalizeUnifiedRequest(
  requestId: string,
  jobId: string,
  result: { success: boolean; data?: Record<string, unknown>; error?: string },
  hasError: boolean,
): Promise<void> {
  try {
    const rows = await db.execute(
      sql`SELECT * FROM developer_unified_requests WHERE id = ${requestId}`,
    );
    const row: any = rows.rows?.[0];

    if (!row) {
      logger.warn('Unified finalizer: request not found', { requestId, jobId });
      return;
    }

    if (row.status === 'completed' || row.status === 'failed') {
      logger.info('Unified finalizer: already finalised, skipping', { requestId });
      return;
    }

    const educationResults: any[] = Array.isArray(row.education_results)
      ? row.education_results
      : [];
    const checksStatus: Record<string, string> = row.checks_status
      ? { ...row.checks_status }
      : {};

    const updatedIdx = educationResults.findIndex((e: any) => e.jobId === jobId);
    if (updatedIdx === -1) {
      logger.warn('Unified finalizer: no education slot matched jobId', { requestId, jobId });
      return;
    }

    if (hasError || !result.success) {
      educationResults[updatedIdx] = {
        ...educationResults[updatedIdx],
        status: 'failed',
        error: result.error || 'Verification failed',
      };
      checksStatus[`education_${updatedIdx}`] = 'failed';
    } else {
      educationResults[updatedIdx] = {
        ...educationResults[updatedIdx],
        status: 'verified',
        ...(result.data || {}),
      };
      checksStatus[`education_${updatedIdx}`] = 'verified';
    }

    const allDone = !Object.values(checksStatus).some(
      (s) => s === 'processing' || s === 'pending',
    );

    if (!allDone) {
      await db.execute(sql`
        UPDATE developer_unified_requests
        SET education_results = ${JSON.stringify(educationResults)}::jsonb,
            checks_status     = ${JSON.stringify(checksStatus)}::jsonb
        WHERE id = ${requestId}
      `);
      logger.info('Unified finalizer: partial update saved, still processing', {
        requestId,
        checksStatus,
      });
      return;
    }

    const ninData = row.nin_data || null;
    const bvnData = row.bvn_data || null;
    const verifiedEdu = educationResults.find((e: any) => e.status === 'verified') || null;

    const analysis = analyzeIdentityCheck(ninData, bvnData, verifiedEdu);
    const { overallScore, decision, flags, crossCheck, ssceAnalysis, summary } = analysis;

    const breakdown = {
      nin: ninData ? { status: 'matched', data: ninData } : { status: 'not_checked' },
      bvn: bvnData ? { status: 'matched', data: bvnData } : { status: 'not_checked' },
      education: educationResults,
      employment: row.employment_result || null,
      fraud: row.fraud_result || null,
      crossCheck,
      ssceAnalysis,
      summary,
    };

    await db.execute(sql`
      UPDATE developer_unified_requests
      SET status            = 'completed',
          checks_status     = ${JSON.stringify(checksStatus)}::jsonb,
          education_results = ${JSON.stringify(educationResults)}::jsonb,
          score             = ${overallScore},
          decision          = ${decision},
          flags             = ${JSON.stringify(flags)}::jsonb,
          breakdown         = ${JSON.stringify(breakdown)}::jsonb,
          completed_at      = now()
      WHERE id = ${requestId}
    `);

    logger.info('Unified finalizer: request completed', {
      requestId,
      decision,
      score: overallScore,
    });

    const callbackUrl: string | null = row.callback_url || null;
    if (callbackUrl) {
      try {
        const payload = {
          event: 'unified.completed',
          requestId,
          reference: row.reference || null,
          decision,
          score: overallScore,
          breakdown,
          flags,
          completedAt: new Date().toISOString(),
        };
        await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Arapoint-Event': 'unified.completed',
          },
          body: JSON.stringify(payload),
        });
        await db.execute(sql`
          UPDATE developer_unified_requests
          SET webhook_delivered = true
          WHERE id = ${requestId}
        `);
        logger.info('Unified finalizer: callback webhook delivered', { requestId, callbackUrl });
      } catch (whErr: any) {
        logger.error('Unified finalizer: callback webhook failed', {
          requestId,
          callbackUrl,
          error: whErr.message,
        });
      }
    }
  } catch (err: any) {
    logger.error('Unified finalizer: unhandled error', {
      requestId,
      jobId,
      error: err.message,
    });
  }
}

/**
 * Recovers unified requests that got stuck in 'processing' because the RPA job
 * completed before the finalizer hook existed (e.g., before this fix was deployed).
 * Safe to run on every boot — skips already-completed requests.
 */
export async function recoverStuckUnifiedRequests(): Promise<void> {
  try {
    const stuckRows = await db.execute(sql`
      SELECT id FROM developer_unified_requests
      WHERE status = 'processing'
        AND created_at < now() - interval '2 minutes'
    `);

    const stuck: any[] = stuckRows.rows || [];
    if (stuck.length === 0) return;

    logger.info(`Unified finalizer recovery: found ${stuck.length} stuck request(s)`);

    for (const { id: requestId } of stuck) {
      try {
        const jobRows = await db.execute(sql`
          SELECT id, status, result, query_data
          FROM rpa_jobs
          WHERE query_data->>'unifiedRequestId' = ${requestId}
            AND status IN ('completed', 'failed')
          ORDER BY completed_at DESC
        `);

        const completedJobs: any[] = jobRows.rows || [];
        if (completedJobs.length === 0) continue;

        logger.info(`Unified finalizer recovery: processing ${completedJobs.length} completed job(s) for ${requestId}`);

        for (const job of completedJobs) {
          const hasError = job.status === 'failed';
          const result = {
            success: !hasError,
            data: (job.result as any) || undefined,
            error: hasError ? ((job.result as any)?.errorMessage || 'Job failed') : undefined,
          };
          await finalizeUnifiedRequest(requestId, job.id, result, hasError);
        }
      } catch (innerErr: any) {
        logger.error('Unified finalizer recovery: error processing stuck request', {
          requestId,
          error: innerErr.message,
        });
      }
    }
  } catch (err: any) {
    logger.error('Unified finalizer recovery: failed', { error: err.message });
  }
}
