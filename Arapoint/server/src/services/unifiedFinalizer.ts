import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/**
 * Normalises any Nigerian date format to YYYY-MM-DD for safe comparison.
 * Handles: 10-Nov-2001, 10-11-2001, 2001-11-10, November 10 2001, etc.
 */
export function normalizeDob(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const d = dob.trim();
  const dl = d.toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m1 = dl.match(/^(\d{1,2})[-\/\s]([a-z]+)[-\/\s](\d{4})$/);
  if (m1 && MONTH_MAP[m1[2]]) return `${m1[3]}-${MONTH_MAP[m1[2]]}-${m1[1].padStart(2, '0')}`;
  const m2 = dl.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  const m3 = dl.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;
  const m4 = dl.match(/^([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})$/);
  if (m4 && MONTH_MAP[m4[1]]) return `${m4[3]}-${MONTH_MAP[m4[1]]}-${m4[2].padStart(2, '0')}`;
  const m5 = dl.match(/^(\d{1,2})\s+([a-z]+)[,\s]+(\d{4})$/);
  if (m5 && MONTH_MAP[m5[2]]) return `${m5[3]}-${MONTH_MAP[m5[2]]}-${m5[1].padStart(2, '0')}`;
  return d;
}

/**
 * Compares two ID photos using GPT-4o Vision to detect if they show the same person.
 * Returns null if photos are unavailable or the API call fails.
 */
async function comparePhotos(
  photo1Base64: string | null | undefined,
  photo2Base64: string | null | undefined,
  label1: string,
  label2: string,
): Promise<{ match: boolean | null; confidence: string; note: string } | null> {
  if (!photo1Base64 || !photo2Base64) return null;
  try {
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!baseURL || !apiKey) return null;

    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL });

    const toUrl = (b64: string) =>
      b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a biometric verification assistant. Compare these two identity document photos (${label1} and ${label2}). Do they show the same person? Reply with exactly one of: MATCH, NO_MATCH, UNCLEAR. Then add a single sentence explaining why. Format: "MATCH: <reason>" or "NO_MATCH: <reason>" or "UNCLEAR: <reason>".`,
            },
            { type: 'image_url', image_url: { url: toUrl(photo1Base64) } },
            { type: 'image_url', image_url: { url: toUrl(photo2Base64) } },
          ],
        },
      ],
      max_tokens: 120,
    });

    const text = (response.choices[0]?.message?.content || '').trim();
    if (text.startsWith('MATCH')) return { match: true, confidence: 'ai_vision', note: text };
    if (text.startsWith('NO_MATCH')) return { match: false, confidence: 'ai_vision', note: text };
    return { match: null, confidence: 'ai_vision', note: text };
  } catch (err: any) {
    logger.warn('Photo comparison failed', { error: err.message });
    return null;
  }
}

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
  const ninDobRaw = ninData?.dateOfBirth || null;
  const bvnDobRaw = bvnData?.dateOfBirth || null;
  const ninDob = normalizeDob(ninDobRaw);
  const bvnDob = normalizeDob(bvnDobRaw);

  const ninBvnNameScore = ninName && bvnName ? nameSimilarityScore(ninName, bvnName) : 0;
  const ninBvnNameMatch = ninBvnNameScore >= 0.72;
  const ninBvnDobMatch = !!(ninDob && bvnDob && ninDob === bvnDob);

  if (!ninBvnNameMatch)
    flags.push(`Name mismatch between NIN ("${ninName}") and BVN ("${bvnName}") — match score: ${Math.round(ninBvnNameScore * 100)}%`);
  if (ninDob && bvnDob && !ninBvnDobMatch)
    flags.push(`Date of birth mismatch — NIN: ${ninDob}, BVN: ${bvnDob}`);

  const eduCandidateName = (eduData?.candidateName || '').replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  const eduDob = normalizeDob(eduData?.candidateDateOfBirth || eduData?.dateOfBirth || null);

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
    flags.push(`SSCE date of birth (${eduDob}) does not match NIN DOB (${ninDob}) — normalised from raw values`);
  if (eduDob && bvnDob && !eduDobMatchesBvn)
    flags.push(`SSCE date of birth (${eduDob}) does not match BVN DOB (${bvnDob}) — normalised from raw values`);

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

    // ── Photo / biometric face comparison ─────────────────────────────────────
    const photoComparison: Record<string, any> = {};
    const ninPhoto: string | null = ninData?.photo || null;
    const bvnPhoto: string | null = bvnData?.photo || null;
    const sscePhoto: string | null = verifiedEdu?.photo || verifiedEdu?.passportPhoto || null;

    if (ninPhoto && bvnPhoto) {
      const ninBvnFace = await comparePhotos(ninPhoto, bvnPhoto, 'NIN', 'BVN');
      if (ninBvnFace) {
        photoComparison.ninVsBvn = ninBvnFace;
        if (ninBvnFace.match === false)
          flags.push(`PHOTO MISMATCH — NIN and BVN photos appear to be different people. ${ninBvnFace.note}`);
        else if (ninBvnFace.match === null)
          flags.push(`PHOTO UNCLEAR — Could not conclusively compare NIN and BVN photos. ${ninBvnFace.note}`);
      }
    }
    if (sscePhoto && (ninPhoto || bvnPhoto)) {
      const ssceVsId = await comparePhotos(sscePhoto, ninPhoto || bvnPhoto, 'SSCE', ninPhoto ? 'NIN' : 'BVN');
      if (ssceVsId) {
        photoComparison.ssceVsId = ssceVsId;
        if (ssceVsId.match === false)
          flags.push(`PHOTO MISMATCH — SSCE result photo does not match identity document photos. ${ssceVsId.note}`);
        else if (ssceVsId.match === null)
          flags.push(`PHOTO UNCLEAR — Could not conclusively compare SSCE and identity photos. ${ssceVsId.note}`);
      }
    }

    const breakdown = {
      nin: ninData ? { status: 'matched', data: ninData } : { status: 'not_checked' },
      bvn: bvnData ? { status: 'matched', data: bvnData } : { status: 'not_checked' },
      education: educationResults,
      employment: row.employment_result || null,
      fraud: row.fraud_result || null,
      crossCheck,
      ssceAnalysis,
      photoComparison: Object.keys(photoComparison).length > 0 ? photoComparison : { note: 'No photos available for comparison' },
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
