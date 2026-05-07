import { Router } from 'express';
import {
  Request, Response, db, crypto, logger, sql, eq,
  developerUsers,
  apiKeyAuth, logApiCall, deductDeveloperBalance,
  API_PRICES, getCached, setCache, CACHE_TTL,
  sandboxNIN, sandboxBVN, sandboxEducation, sandboxFraudScore,
  rpaJobs,
} from './shared';

const router = Router();

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

export function nameSimilarityScore(a: string, b: string): number {
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

export function toDecision(score: number | null): 'PASS' | 'REVIEW' | 'FAIL' | 'PENDING' {
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

function analyzeIdentityCheck(
  ninData: any,
  bvnData: any,
  eduData: any,
): {
  crossCheck: {
    ninBvnNameMatch: boolean;
    ninBvnNameScore: number;
    ninBvnDobMatch: boolean;
    eduNameMatchesNin: boolean;
    eduNameMatchesBvn: boolean;
    eduNameScore: number;
    eduDobMatchesNin: boolean | null;
    eduDobMatchesBvn: boolean | null;
    allNamesConsistent: boolean;
    allDobConsistent: boolean;
  };
  ssceAnalysis: {
    totalSubjects: number;
    totalCredits: number;
    englishGrade: string | null;
    englishIsCredit: boolean;
    mathGrade: string | null;
    mathIsCredit: boolean;
    otherCreditSubjects: { name: string; grade: string }[];
    otherCreditCount: number;
    meetsMinimumRequirement: boolean;
    requirementSummary: string;
    subjects: { name: string; grade: string; isCredit: boolean }[];
  };
  overallScore: number;
  decision: 'PASS' | 'REVIEW' | 'FAIL';
  summary: string;
  flags: string[];
} {
  const flags: string[] = [];

  const ninName = ninData ? `${ninData.firstName || ''} ${ninData.middleName || ''} ${ninData.lastName || ''}`.replace(/\s+/g, ' ').trim() : '';
  const bvnName = bvnData ? `${bvnData.firstName || ''} ${bvnData.middleName || ''} ${bvnData.lastName || ''}`.replace(/\s+/g, ' ').trim() : '';
  const ninDob = ninData?.dateOfBirth || null;
  const bvnDob = bvnData?.dateOfBirth || null;

  const ninBvnNameScore = (ninName && bvnName) ? nameSimilarityScore(ninName, bvnName) : 0;
  const ninBvnNameMatch = ninBvnNameScore >= 0.72;
  const ninBvnDobMatch = !!(ninDob && bvnDob && ninDob === bvnDob);

  if (!ninBvnNameMatch) flags.push(`Name mismatch between NIN ("${ninName}") and BVN ("${bvnName}") — match score: ${Math.round(ninBvnNameScore * 100)}%`);
  if (ninDob && bvnDob && !ninBvnDobMatch) flags.push(`Date of birth mismatch — NIN: ${ninDob}, BVN: ${bvnDob}`);

  const eduCandidateName = eduData?.candidateName || '';
  const eduDob = eduData?.candidateDateOfBirth || eduData?.dateOfBirth || null;

  const eduNameScore = eduCandidateName
    ? Math.max(
        ninName ? nameSimilarityScore(eduCandidateName, ninName) : 0,
        bvnName ? nameSimilarityScore(eduCandidateName, bvnName) : 0,
      )
    : 0;
  const eduNameMatchesNin = eduCandidateName && ninName ? nameSimilarityScore(eduCandidateName, ninName) >= 0.72 : false;
  const eduNameMatchesBvn = eduCandidateName && bvnName ? nameSimilarityScore(eduCandidateName, bvnName) >= 0.72 : false;

  if (eduCandidateName && !eduNameMatchesNin && !eduNameMatchesBvn) {
    flags.push(`SSCE candidate name ("${eduCandidateName}") does not match NIN or BVN names`);
  }

  const eduDobMatchesNin = (eduDob && ninDob) ? eduDob === ninDob : null;
  const eduDobMatchesBvn = (eduDob && bvnDob) ? eduDob === bvnDob : null;
  if (eduDob && ninDob && !eduDobMatchesNin) flags.push(`SSCE date of birth (${eduDob}) does not match NIN DOB (${ninDob})`);
  if (eduDob && bvnDob && !eduDobMatchesBvn) flags.push(`SSCE date of birth (${eduDob}) does not match BVN DOB (${bvnDob})`);

  const allNamesConsistent = ninBvnNameMatch && (eduNameMatchesNin || eduNameMatchesBvn || !eduCandidateName);
  const allDobConsistent = ninBvnDobMatch && (eduDobMatchesNin !== false) && (eduDobMatchesBvn !== false);

  const subjects: { name: string; grade: string }[] = eduData?.subjects || [];
  const analyzedSubjects = subjects.map((s: { name: string; grade: string }) => ({
    name: s.name,
    grade: s.grade,
    isCredit: gradeIsCredit(s.grade),
  }));

  const englishSubject = subjects.find((s: { name: string; grade: string }) =>
    /english/i.test(s.name)
  );
  const mathSubject = subjects.find((s: { name: string; grade: string }) =>
    /math/i.test(s.name)
  );

  const englishGrade = englishSubject?.grade || null;
  const englishIsCredit = englishGrade ? gradeIsCredit(englishGrade) : false;
  const mathGrade = mathSubject?.grade || null;
  const mathIsCredit = mathGrade ? gradeIsCredit(mathGrade) : false;

  const otherCreditSubjects = subjects
    .filter((s: { name: string; grade: string }) => !/english/i.test(s.name) && !/math/i.test(s.name) && gradeIsCredit(s.grade))
    .map((s: { name: string; grade: string }) => ({ name: s.name, grade: s.grade }));

  const totalCredits = analyzedSubjects.filter(s => s.isCredit).length;
  const meetsMinimumRequirement = englishIsCredit && mathIsCredit && otherCreditSubjects.length >= 3;

  let requirementSummary: string;
  if (meetsMinimumRequirement) {
    requirementSummary = `PASS — ${totalCredits} credits including English (${englishGrade}) and Mathematics (${mathGrade}) plus ${otherCreditSubjects.length} other credit subject(s). Meets minimum 5-credit requirement.`;
  } else {
    const issues: string[] = [];
    if (!englishGrade) issues.push('English Language not found in results');
    else if (!englishIsCredit) issues.push(`English Language grade (${englishGrade}) is not a credit (C6 or above required)`);
    if (!mathGrade) issues.push('Mathematics not found in results');
    else if (!mathIsCredit) issues.push(`Mathematics grade (${mathGrade}) is not a credit (C6 or above required)`);
    if (otherCreditSubjects.length < 3) issues.push(`Only ${otherCreditSubjects.length} other credit subjects (minimum 3 required besides English and Maths)`);
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

  const summaryParts: string[] = [];
  summaryParts.push(`Identity: NIN ${ninData ? '✓' : '✗'}, BVN ${bvnData ? '✓' : '✗'}`);
  summaryParts.push(`Name match: NIN↔BVN ${ninBvnNameMatch ? '✓' : '✗'} (${Math.round(ninBvnNameScore * 100)}%)`);
  summaryParts.push(`DOB match: NIN↔BVN ${ninBvnDobMatch ? '✓' : '✗'}`);
  if (eduCandidateName) summaryParts.push(`SSCE name match: ${(eduNameMatchesNin || eduNameMatchesBvn) ? '✓' : '✗'} (${Math.round(eduNameScore * 100)}%)`);
  summaryParts.push(`SSCE: ${totalCredits} credit(s), English ${englishIsCredit ? '✓' : '✗'} (${englishGrade || 'N/A'}), Maths ${mathIsCredit ? '✓' : '✗'} (${mathGrade || 'N/A'})`);
  summaryParts.push(`Minimum requirement (5 credits incl. English & Maths): ${meetsMinimumRequirement ? 'MET' : 'NOT MET'}`);

  return {
    crossCheck: {
      ninBvnNameMatch, ninBvnNameScore: Math.round(ninBvnNameScore * 100),
      ninBvnDobMatch,
      eduNameMatchesNin, eduNameMatchesBvn, eduNameScore: Math.round(eduNameScore * 100),
      eduDobMatchesNin, eduDobMatchesBvn,
      allNamesConsistent, allDobConsistent,
    },
    ssceAnalysis: {
      totalSubjects: subjects.length,
      totalCredits,
      englishGrade, englishIsCredit,
      mathGrade, mathIsCredit,
      otherCreditSubjects,
      otherCreditCount: otherCreditSubjects.length,
      meetsMinimumRequirement,
      requirementSummary,
      subjects: analyzedSubjects,
    },
    overallScore, decision,
    summary: summaryParts.join(' | '),
    flags,
  };
}

router.post('/verify/nin', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, phone } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!nin && !phone) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'NIN or phone number required' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.nin, `NIN verification - ${nin || phone}`, (dev as any).environmentMode);

    if ((dev as any).environmentMode === 'sandbox') {
      const sbx = sandboxNIN(nin || phone);
      responseData = {
        status: 'success', code: 200, message: 'NIN verification completed (sandbox)',
        data: {
          verification: sbx.data,
          source: 'ARAPOINT-SANDBOX',
          cached: false,
          requestId: `NIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        }
      };
      return res.json(responseData);
    }

    const cacheKey = `nin:${nin || phone}`;
    const cached = getCached(cacheKey);
    if (cached) {
      const verificationData = cached.data || cached;
      responseData = {
        status: 'success', code: 200, message: 'NIN verification completed (cached)',
        data: {
          verification: verificationData,
          source: 'ARAPOINT',
          cached: true,
          requestId: `NIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        }
      };
      return res.json(responseData);
    }

    const { premblyService } = await import('../../../services/premblyService');
    let result;
    try {
      if (nin) {
        result = await premblyService.verifyNIN(nin);
      } else {
        result = await premblyService.verifyNINWithPhone(phone);
      }
      if (result && !result.error) setCache(cacheKey, result, CACHE_TTL.nin);
    } catch (serviceErr: any) {
      result = { error: serviceErr.message };
    }

    const verificationData = result?.data || result;
    responseData = {
      status: 'success', code: 200, message: 'NIN verification completed',
      data: {
        verification: verificationData,
        source: 'ARAPOINT',
        cached: false,
        requestId: `NIN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/nin', 'POST', { nin, phone },
      responseData, statusCode, statusCode === 200 ? API_PRICES.nin : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.post('/verify/bvn', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { bvn } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!bvn) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN required' };
      return res.status(400).json(responseData);
    }
    if (!/^\d{11}$/.test(bvn)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN must be 11 digits' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.bvn, `BVN verification - ${bvn}`, (dev as any).environmentMode);

    if ((dev as any).environmentMode === 'sandbox') {
      const sbx = sandboxBVN(bvn);
      responseData = {
        status: 'success', code: 200, message: 'BVN verification completed (sandbox)',
        data: {
          verification: sbx.data,
          source: 'ARAPOINT-SANDBOX',
          cached: false,
          requestId: `BVN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        }
      };
      return res.json(responseData);
    }

    const bvnCacheKey = `bvn:${bvn}`;
    const bvnCached = getCached(bvnCacheKey);
    if (bvnCached) {
      const rawBvnCached = bvnCached.data || bvnCached;
      const bvnCachedData = rawBvnCached
        ? { ...rawBvnCached, enrollmentBank: rawBvnCached.enrollmentInstitution || rawBvnCached.enrollmentBank || rawBvnCached.bankName }
        : rawBvnCached;
      responseData = {
        status: 'success', code: 200, message: 'BVN verification completed (cached)',
        data: {
          verification: bvnCachedData,
          source: 'CBN',
          cached: true,
          requestId: `BVN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        }
      };
      return res.json(responseData);
    }

    const { premblyService } = await import('../../../services/premblyService');
    let result;
    try {
      result = await premblyService.verifyBVN(bvn);
      if (result && !result.error) setCache(bvnCacheKey, result, CACHE_TTL.bvn);
    } catch (serviceErr: any) {
      result = { error: serviceErr.message };
    }

    const rawBvn = result?.data || result;
    const bvnVerificationData = rawBvn
      ? { ...rawBvn, enrollmentBank: rawBvn.enrollmentInstitution || rawBvn.enrollmentBank || rawBvn.bankName }
      : rawBvn;
    responseData = {
      status: 'success', code: 200, message: 'BVN verification completed',
      data: {
        verification: bvnVerificationData,
        source: 'CBN',
        cached: false,
        requestId: `BVN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/bvn', 'POST', { bvn },
      responseData, statusCode, statusCode === 200 ? API_PRICES.bvn : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.post('/verify/education', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const {
    provider, examYear, registrationNumber, examType,
    cardPin, cardSerialNumber, state, schoolName, examMonth,
  } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    const validProviders = ['waec', 'neco', 'nabteb', 'nbais', 'jamb'];
    if (!provider || !validProviders.includes(provider.toLowerCase())) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: `provider required. Valid values: ${validProviders.join(', ')}` };
      return res.status(400).json(responseData);
    }

    const p = provider.toLowerCase();
    const missing: string[] = [];

    if (!registrationNumber) missing.push('registrationNumber');
    if (!examYear) missing.push('examYear');
    if (!examType) missing.push('examType');

    if (p === 'neco') {
      if (!cardPin) missing.push('cardPin (NECO token)');
    } else if (p === 'waec') {
      if (!cardPin) missing.push('cardPin (scratch-card PIN)');
      if (!cardSerialNumber) missing.push('cardSerialNumber (scratch-card serial number)');
    } else if (p === 'nabteb') {
      if (!cardPin) missing.push('cardPin (scratch-card PIN)');
      if (!cardSerialNumber) missing.push('cardSerialNumber (card serial number)');
    } else if (p === 'nbais') {
      if (!examMonth) missing.push('examMonth (e.g. MAY or NOV)');
      if (!state) missing.push('state (candidate state of origin)');
      if (!schoolName) missing.push('schoolName (candidate school name)');
      if (!cardPin) missing.push('cardPin (scratch-card PIN)');
    }

    if (missing.length > 0) {
      statusCode = 400;
      responseData = {
        status: 'error', code: 400,
        message: `Missing required fields for ${p.toUpperCase()}: ${missing.join(', ')}`,
      };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.education,
      `Education verification - ${provider.toUpperCase()} ${registrationNumber}`, (dev as any).environmentMode);

    if ((dev as any).environmentMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'Education verification completed (sandbox)',
        data: {
          provider: provider.toUpperCase(), examYear, registrationNumber,
          status: 'completed', source: 'sandbox',
          result: sandboxEducation(provider, registrationNumber, examYear?.toString()),
        }
      };
      return res.json(responseData);
    }

    const serviceTypeMap: Record<string, string> = {
      waec: 'waec_result', neco: 'neco_result', nabteb: 'nabteb_result', nbais: 'nbais_result', jamb: 'jamb_score',
    };
    const serviceType = serviceTypeMap[p] || `${p}_result`;

    const [job] = await db.insert(rpaJobs).values({
      serviceType,
      queryData: {
        registrationNumber,
        examYear: parseInt(String(examYear), 10),
        examType: examType || provider.toUpperCase(),
        ...(cardPin        ? { cardPin }        : {}),
        ...(cardSerialNumber ? { cardSerialNumber } : {}),
        ...(state          ? { state }          : {}),
        ...(schoolName     ? { schoolName }     : {}),
        ...(examMonth      ? { examMonth }      : {}),
        source: 'developer_api',
        developerId: dev.id,
      },
      status: 'pending',
      priority: 0,
    }).returning({ id: rpaJobs.id });

    responseData = {
      status: 'success', code: 200, message: 'Education verification queued',
      data: {
        provider: provider.toUpperCase(), examYear, registrationNumber,
        status: 'processing', jobId: job.id,
        note: 'Results will be available in 1-3 minutes. Poll GET /verify/education/result?jobId=<jobId>',
      }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/education', 'POST',
      { provider, examYear, registrationNumber, examType,
        cardPin: cardPin ? '***' : undefined, cardSerialNumber, state, schoolName, examMonth },
      responseData, statusCode, statusCode === 200 ? API_PRICES.education : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.get('/verify/education/result', apiKeyAuth, async (req: Request, res: Response) => {
  const { jobId } = req.query;
  const dev = (req as any).developer;
  if (!jobId) {
    return res.status(400).json({ status: 'error', code: 400, message: 'jobId required' });
  }
  try {
    const [job] = await db.select().from(rpaJobs)
      .where(eq(rpaJobs.id, jobId as string)).limit(1);
    if (!job) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Job not found' });
    }
    const queryData = job.queryData as any;
    if (!queryData || queryData.developerId !== dev.id) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Job not found' });
    }
    res.json({
      status: 'success', code: 200, message: 'Job status retrieved',
      data: {
        jobId: job.id, status: job.status,
        result: job.result || null, error: job.errorMessage || null,
        createdAt: job.createdAt, completedAt: job.completedAt,
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to get result' });
  }
});

router.post('/verify/unified', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { reference, callbackUrl, identity = {}, checks = {}, options = {} } = req.body;
  const envMode: string = (dev as any).environmentMode || 'sandbox';
  let statusCode = 202;
  let responseData: any;

  try {
    const { nin, bvn, fullName, dateOfBirth } = identity;
    const { education = [], employment, fraudCheck = false } = checks;

    if (!nin && !bvn && education.length === 0 && !employment && !fraudCheck) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Provide at least one check in identity (nin/bvn) or checks (education, employment, fraudCheck)' };
      return res.status(400).json(responseData);
    }

    const validProviders = ['waec', 'neco', 'nabteb', 'nbais'];
    for (const edu of education) {
      if (!edu.type || !validProviders.includes(edu.type.toLowerCase())) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: `education[].type must be one of: ${validProviders.join(', ')}` };
        return res.status(400).json(responseData);
      }
      if (!edu.examNumber || !edu.examYear) {
        statusCode = 400;
        responseData = { status: 'error', code: 400, message: 'Each education check requires examNumber and examYear' };
        return res.status(400).json(responseData);
      }
    }

    let rawCost = 0;
    if (nin) rawCost += API_PRICES.nin;
    if (bvn) rawCost += API_PRICES.bvn;
    rawCost += education.length * API_PRICES.education;
    if (fraudCheck) rawCost += API_PRICES.fraud_score;
    if (employment) rawCost += API_PRICES.employment_standard;
    const bundleDiscount = rawCost > 300 ? 0.15 : 0;
    const totalCost = Math.round(rawCost * (1 - bundleDiscount));

    await deductDeveloperBalance(dev.id, totalCost,
      `Unified Verification — ${[nin && 'NIN', bvn && 'BVN', education.length > 0 && `${education.length}x SSCE`, fraudCheck && 'Fraud', employment && 'Employment'].filter(Boolean).join(', ')} (${bundleDiscount > 0 ? '15% bundle discount' : 'no discount'})`,
      envMode
    );

    const requestId = 'UNI-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    const checksRequested = {
      nin: !!nin, bvn: !!bvn,
      education: education.map((e: any) => ({ type: e.type, examYear: e.examYear })),
      employment: !!employment, fraud: fraudCheck,
    };
    const checksStatus: Record<string, string> = {};
    if (nin) checksStatus.nin = 'pending';
    if (bvn) checksStatus.bvn = 'pending';
    education.forEach((_: any, i: number) => { checksStatus[`education_${i}`] = 'pending'; });
    if (employment) checksStatus.employment = 'pending';
    if (fraudCheck) checksStatus.fraud = 'pending';

    if (envMode === 'sandbox') {
      const ninData = nin ? sandboxNIN(nin).data : null;
      const bvnData = bvn ? sandboxBVN(bvn).data : null;
      const nameScore = (ninData && bvnData)
        ? nameSimilarityScore(`${ninData.firstName} ${ninData.lastName}`, `${bvnData.firstName} ${bvnData.lastName}`)
        : (fullName && ninData ? nameSimilarityScore(fullName, `${ninData.firstName} ${ninData.lastName}`) : 1);

      const eduResults = education.map((edu: any) => ({
        type: edu.type.toUpperCase(), examNumber: edu.examNumber, examYear: edu.examYear,
        status: 'verified', ...sandboxEducation(edu.type, edu.examNumber, String(edu.examYear)).data,
      }));
      const fraudData = fraudCheck ? { score: 12, riskLevel: 'low', flags: [] } : null;
      const empData = employment
        ? { status: 'verified', level: employment.level || 'degree', employmentYear: employment.employmentYear, timeline: 'valid' }
        : null;

      const identityPts = (nin ? 20 : 0) + (bvn ? 20 : 0);
      const eduPts = education.length > 0 ? 25 : 0;
      const empPts = employment ? 25 : 0;
      const fraudDeduction = fraudData ? Math.floor(fraudData.score / 5) : 0;
      const maxPts = identityPts + eduPts + empPts;
      const rawScore = Math.max(0, maxPts - fraudDeduction);
      const score = maxPts > 0 ? Math.round((rawScore / maxPts) * 100) : 100;

      statusCode = 200;
      responseData = {
        status: 'completed', code: 200, message: 'Unified verification completed (sandbox)',
        data: {
          requestId, reference: reference || null, status: 'completed',
          decision: toDecision(score), score,
          summary: {
            identityMatch: ninData && bvnData ? nameScore >= 0.72 : true,
            educationVerified: eduResults.length > 0,
            employmentVerified: !!empData,
            fraudRisk: fraudData?.riskLevel || 'not_checked',
          },
          breakdown: {
            nin: ninData ? { status: 'matched', data: ninData } : { status: 'not_requested' },
            bvn: bvnData ? { status: 'matched', data: bvnData } : { status: 'not_requested' },
            nameMatchScore: Math.round(nameScore * 100),
            education: eduResults,
            employment: empData || { status: 'not_requested' },
            fraud: fraudData || { status: 'not_requested' },
          },
          flags: [],
          completedAt: new Date().toISOString(),
          pricing: { rawCost, bundleDiscount: `${bundleDiscount * 100}%`, totalCost },
        }
      };
      return res.json(responseData);
    }

    await db.execute(sql`
      INSERT INTO developer_unified_requests
        (id, developer_id, reference, callback_url, identity_nin, identity_bvn,
         identity_full_name, identity_dob, checks_requested, options, status,
         checks_status, total_cost, environment)
      VALUES
        (${requestId}, ${dev.id}, ${reference || null}, ${callbackUrl || null},
         ${nin ? nin.substring(0, 4) + '***' : null}, ${bvn ? bvn.substring(0, 4) + '***' : null},
         ${fullName || null}, ${dateOfBirth || null},
         ${JSON.stringify(checksRequested)}::jsonb, ${JSON.stringify(options)}::jsonb,
         'queued', ${JSON.stringify(checksStatus)}::jsonb, ${totalCost}, ${envMode})
    `);

    responseData = {
      status: 'accepted', code: 202,
      message: 'Unified verification started. Poll the result endpoint for status.',
      data: {
        requestId, reference: reference || null, status: 'queued',
        eta: education.length > 0 ? '60–120 seconds (SSCE via RPA)' : '10–30 seconds',
        checks: checksStatus,
        pollUrl: `GET /verify/unified/result/${requestId}`,
        webhookConfigured: !!callbackUrl,
        pricing: { rawCost, bundleDiscount: `${bundleDiscount * 100}%`, totalCost },
      }
    };
    res.status(202).json(responseData);

    setImmediate(async () => {
      try {
        await db.execute(sql`UPDATE developer_unified_requests SET status = 'processing' WHERE id = ${requestId}`);

        const flags: string[] = [];
        let ninData: any = null;
        let bvnData: any = null;
        const updatedChecksStatus = { ...checksStatus };

        if (nin || bvn) {
          const { premblyService } = await import('../../../services/premblyService');
          const tasks: Promise<any>[] = [];
          if (nin) tasks.push(premblyService.verifyNIN(nin));
          if (bvn) tasks.push(premblyService.verifyBVN(bvn));
          const results = await Promise.allSettled(tasks);
          let idx = 0;
          if (nin) {
            const r = results[idx++];
            if (r.status === 'fulfilled') { ninData = r.value?.data || null; updatedChecksStatus.nin = 'verified'; }
            else { flags.push(`NIN lookup failed: ${r.reason?.message}`); updatedChecksStatus.nin = 'failed'; }
          }
          if (bvn) {
            const r = results[idx++];
            if (r.status === 'fulfilled') { bvnData = r.value?.data || null; updatedChecksStatus.bvn = 'verified'; }
            else { flags.push(`BVN lookup failed: ${r.reason?.message}`); updatedChecksStatus.bvn = 'failed'; }
          }
        }

        const uNameScore = (ninData && bvnData)
          ? nameSimilarityScore(`${ninData.firstName} ${ninData.lastName}`, `${bvnData.firstName} ${bvnData.lastName}`)
          : (fullName && ninData ? nameSimilarityScore(fullName, `${ninData.firstName} ${ninData.lastName}`) : null);

        if (uNameScore !== null && uNameScore < (options.strictNameMatch ? 0.90 : 0.72)) {
          flags.push(`Name mismatch between identity records (score: ${(uNameScore * 100).toFixed(0)}%)`);
        }

        const educationResults: any[] = [];
        const serviceTypeMap: Record<string, string> = { waec: 'waec_result', neco: 'neco_result', nabteb: 'nabteb_result', nbais: 'nbais_result' };
        const defaultExamTypeMap: Record<string, string> = { waec: 'WASSCE', neco: 'ssce_int', nabteb: 'NBC/NTC', nbais: 'AISSCE' };

        for (let i = 0; i < education.length; i++) {
          const edu = education[i];
          const provKey = edu.type.toLowerCase();
          try {
            const [job] = await db.insert(rpaJobs).values({
              serviceType: serviceTypeMap[provKey] || `${provKey}_result`,
              queryData: {
                registrationNumber: edu.examNumber,
                examYear: parseInt(String(edu.examYear), 10),
                examType: edu.examType || defaultExamTypeMap[provKey],
                cardPin: edu.card?.pin || edu.token,
                ...(edu.card?.serial ? { cardSerialNumber: edu.card.serial } : {}),
                source: 'developer_api_unified',
                unifiedRequestId: requestId,
                educationIndex: i,
              },
              status: 'pending', priority: 5,
            }).returning();
            educationResults.push({ type: edu.type.toUpperCase(), examNumber: edu.examNumber, examYear: edu.examYear, status: 'processing', jobId: job.id });
            updatedChecksStatus[`education_${i}`] = 'processing';
          } catch (rpaErr: any) {
            educationResults.push({ type: edu.type.toUpperCase(), examNumber: edu.examNumber, examYear: edu.examYear, status: 'failed', error: rpaErr.message });
            updatedChecksStatus[`education_${i}`] = 'failed';
            flags.push(`Education (${edu.type.toUpperCase()}) queue failed: ${rpaErr.message}`);
          }
        }

        let fraudResult: any = null;
        if (fraudCheck && ninData && bvnData) {
          const ninName = `${ninData.firstName || ''} ${ninData.lastName || ''}`.trim().toLowerCase();
          const bvnName = `${bvnData.firstName || ''} ${bvnData.lastName || ''}`.trim().toLowerCase();
          let riskScore = 0;
          const signals: Record<string, boolean> = {};
          if (ninName && bvnName && ninName !== bvnName) { riskScore += 25; signals.nameMismatch = true; }
          if (ninData.dateOfBirth !== bvnData.dateOfBirth) { riskScore += 15; signals.dobMismatch = true; }
          fraudResult = { score: riskScore, riskLevel: riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low', signals, flags: Object.keys(signals) };
          updatedChecksStatus.fraud = 'completed';
          if (riskScore >= 40) flags.push(`High fraud risk detected (score: ${riskScore})`);
        } else if (fraudCheck) {
          fraudResult = { score: 0, riskLevel: 'unknown', note: 'Requires both NIN and BVN for fraud scoring' };
          updatedChecksStatus.fraud = 'skipped';
        }

        let employmentResult: any = null;
        if (employment) {
          const empYear = employment.employmentYear || new Date().getFullYear();
          const dob = ninData?.dateOfBirth || bvnData?.dateOfBirth || dateOfBirth || null;
          const timeline = validateTimeline(dob, null, empYear);
          const empNameScore = uNameScore ?? (fullName && ninData ? nameSimilarityScore(fullName, `${ninData.firstName} ${ninData.lastName}`) : 0.5);
          flags.push(...timeline.issues);
          employmentResult = {
            status: ninData || bvnData ? 'verified' : 'partial',
            level: employment.level || 'degree',
            employmentYear: empYear,
            timeline: timeline.valid ? 'valid' : 'issues_found',
            ageAtEmployment: timeline.ageAtEmployment,
          };
          updatedChecksStatus.employment = 'completed';
        }

        const ninVerified = !!ninData;
        const bvnVerified = !!bvnData;
        const identityPts = (nin ? (ninVerified ? 20 : 0) : 0) + (bvn ? (bvnVerified ? 20 : 0) : 0);
        const eduPts = education.length > 0 ? 25 : 0;
        const empPts = employment ? (employmentResult?.status === 'verified' ? 25 : 10) : 0;
        const fraudDeduction = fraudResult ? Math.floor((fraudResult.score || 0) / 5) : 0;
        const maxPts = (nin ? 20 : 0) + (bvn ? 20 : 0) + eduPts + empPts;
        const rawScore2 = Math.max(0, identityPts + eduPts + empPts - fraudDeduction);
        const score = maxPts > 0 ? Math.round((rawScore2 / maxPts) * 100) : 100;
        const decision = toDecision(score);

        const breakdown = {
          nin: ninData ? { status: 'matched', data: { firstName: ninData.firstName, lastName: ninData.lastName, dateOfBirth: ninData.dateOfBirth } } : { status: nin ? 'failed' : 'not_requested' },
          bvn: bvnData ? { status: 'matched', data: { firstName: bvnData.firstName, lastName: bvnData.lastName, dateOfBirth: bvnData.dateOfBirth } } : { status: bvn ? 'failed' : 'not_requested' },
          nameMatchScore: uNameScore !== null ? Math.round(uNameScore * 100) : null,
          education: educationResults,
          employment: employmentResult || { status: 'not_requested' },
          fraud: fraudResult || { status: 'not_requested' },
        };

        const hasRpaJobs = educationResults.some(e => e.status === 'processing');
        const finalStatus = hasRpaJobs ? 'processing' : 'completed';

        await db.execute(sql`
          UPDATE developer_unified_requests SET
            status = ${finalStatus},
            checks_status = ${JSON.stringify(updatedChecksStatus)}::jsonb,
            nin_data = ${ninData ? JSON.stringify(ninData) : null}::jsonb,
            bvn_data = ${bvnData ? JSON.stringify(bvnData) : null}::jsonb,
            education_results = ${JSON.stringify(educationResults)}::jsonb,
            employment_result = ${employmentResult ? JSON.stringify(employmentResult) : null}::jsonb,
            fraud_result = ${fraudResult ? JSON.stringify(fraudResult) : null}::jsonb,
            score = ${score}, decision = ${decision},
            flags = ${JSON.stringify(flags)}::jsonb,
            breakdown = ${JSON.stringify(breakdown)}::jsonb,
            ${hasRpaJobs ? sql`completed_at = null` : sql`completed_at = now()`}
          WHERE id = ${requestId}
        `);

        if (callbackUrl && !hasRpaJobs) {
          try {
            const payload = { event: 'unified.completed', requestId, reference: reference || null, decision, score, breakdown, flags, completedAt: new Date().toISOString() };
            await fetch(callbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Arapoint-Event': 'unified.completed' }, body: JSON.stringify(payload) });
            await db.execute(sql`UPDATE developer_unified_requests SET webhook_delivered = true WHERE id = ${requestId}`);
          } catch (whErr: any) {
            logger.error('Unified webhook delivery failed', { requestId, error: whErr.message });
          }
        }
      } catch (bgErr: any) {
        logger.error('Unified background processing failed', { requestId, error: bgErr.message });
        await db.execute(sql`UPDATE developer_unified_requests SET status = 'failed' WHERE id = ${requestId}`).catch(() => {});
      }
    });

  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Unified verification failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/unified', 'POST',
      { reference, identity: { nin: identity.nin ? '***' : undefined, bvn: identity.bvn ? '***' : undefined }, checks: Object.keys(checks) },
      responseData, statusCode, [200, 202].includes(statusCode) ? (responseData?.data?.pricing?.totalCost || 0) : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.get('/verify/unified/result/:requestId', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { requestId } = req.params;
  let statusCode = 200;
  let responseData: any;

  try {
    const rows = await db.execute(sql`
      SELECT * FROM developer_unified_requests WHERE id = ${requestId} AND developer_id = ${dev.id}
    `);
    const row: any = rows.rows?.[0];

    if (!row) {
      statusCode = 404;
      responseData = { status: 'error', code: 404, message: 'Unified verification request not found or does not belong to your account' };
      return res.status(404).json(responseData);
    }

    if (row.status === 'queued' || row.status === 'processing') {
      statusCode = 202;
      responseData = {
        status: row.status, code: 202,
        message: 'Verification still in progress — check back in a few seconds',
        data: { requestId, reference: row.reference, status: row.status, checksStatus: row.checks_status },
      };
      return res.status(202).json(responseData);
    }

    if (row.status === 'failed') {
      statusCode = 500;
      responseData = { status: 'error', code: 500, message: 'Unified verification failed', data: { requestId, reference: row.reference } };
      return res.status(500).json(responseData);
    }

    statusCode = 200;
    responseData = {
      status: 'completed', code: 200,
      data: {
        requestId, reference: row.reference, status: 'completed',
        decision: row.decision, score: row.score,
        summary: {
          identityMatch: (row.breakdown as any)?.nin?.status === 'matched' || (row.breakdown as any)?.bvn?.status === 'matched',
          educationVerified: ((row.education_results as any[]) || []).some((e: any) => e.status === 'verified'),
          employmentVerified: (row.employment_result as any)?.status === 'verified',
          fraudRisk: (row.fraud_result as any)?.riskLevel || 'not_checked',
        },
        breakdown: row.breakdown,
        flags: row.flags,
        completedAt: row.completed_at,
      }
    };
    res.json(responseData);

  } catch (e: any) {
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Failed to retrieve unified result', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, `/verify/unified/result/${requestId}`, 'GET',
      {}, responseData, statusCode, 0, Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.post('/verify/fraud-score', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { nin, bvn, phone } = req.body;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!nin && !bvn && !phone) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'At least one of nin, bvn, or phone required' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, API_PRICES.fraud_score, `Fraud score - ${nin || bvn || phone}`, (dev as any).environmentMode);

    if ((dev as any).environmentMode === 'sandbox') {
      const sbxFraud = sandboxFraudScore(nin || bvn || phone);
      responseData = {
        status: 'success', code: 200, message: 'Fraud score calculated (sandbox)',
        data: {
          requestId: `FRD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          riskScore: sbxFraud.riskScore,
          riskLevel: sbxFraud.riskLevel,
          flags: [],
          summary: sbxFraud.recommendation || 'Identity records are consistent — low fraud risk.',
        }
      };
      return res.json(responseData);
    }

    let riskScore = 0;
    const signalFlags: string[] = [];

    if (nin && bvn) {
      const { premblyService } = await import('../../../services/premblyService');
      const [ninRes, bvnRes] = await Promise.allSettled([
        premblyService.verifyNIN(nin),
        premblyService.verifyBVN(bvn),
      ]);

      const ninData = ninRes.status === 'fulfilled' ? ninRes.value : null;
      const bvnData = bvnRes.status === 'fulfilled' ? bvnRes.value : null;

      if (!ninData || ninData.error) { riskScore += 30; signalFlags.push('NIN record could not be verified'); }
      if (!bvnData || bvnData.error) { riskScore += 30; signalFlags.push('BVN record could not be verified'); }

      if (ninData && bvnData && !ninData.error && !bvnData.error) {
        const ninName = `${ninData.data?.firstName || ''} ${ninData.data?.lastName || ''}`.trim().toLowerCase();
        const bvnName = `${bvnData.data?.firstName || ''} ${bvnData.data?.lastName || ''}`.trim().toLowerCase();
        if (ninName && bvnName && ninName !== bvnName) {
          riskScore += 25;
          signalFlags.push('Name mismatch between NIN and BVN records');
        }
        if (ninData.data?.dateOfBirth !== bvnData.data?.dateOfBirth) {
          riskScore += 15;
          signalFlags.push('Date of birth mismatch between NIN and BVN records');
        }
      }
    }

    const finalScore = Math.min(riskScore, 100);
    const riskLevel = finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low';
    const summary = finalScore < 30
      ? 'Identity records are consistent — low fraud risk.'
      : finalScore < 60
      ? 'Some identity inconsistencies detected — manual review recommended.'
      : 'High risk signals detected — identity verification strongly recommended.';

    responseData = {
      status: 'success', code: 200, message: 'Fraud score calculated',
      data: {
        requestId: `FRD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        riskScore: finalScore,
        riskLevel,
        flags: signalFlags,
        summary,
      }
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Fraud score failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/fraud-score', 'POST', { nin, bvn, phone },
      responseData, statusCode, statusCode === 200 ? API_PRICES.fraud_score : 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

router.post('/verify/employment-screening', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const envMode: string = (dev as any).environmentMode || 'sandbox';
  let statusCode = 202;
  let responseData: any;
  let totalCost = 0;

  const {
    reference, callbackUrl,
    nin, bvn,
    educationProvider,
    registrationNumber, examYear, examType,
    cardPin, cardSerialNumber,
    candidateNumber,
    token,
    state: candidateState, schoolName, examMonth,
  } = req.body || {};

  const regNo = registrationNumber || candidateNumber;

  try {
    const missing: string[] = [];
    if (!nin) missing.push('nin');
    if (!bvn) missing.push('bvn');
    if (!educationProvider) missing.push('educationProvider');

    if (missing.length > 0) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: `Missing required fields: ${missing.join(', ')}. Employment screening requires nin, bvn, and educationProvider.` };
      return res.status(400).json(responseData);
    }

    if (String(nin).replace(/\D/g, '').length !== 11) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'NIN must be 11 digits' };
      return res.status(400).json(responseData);
    }
    if (String(bvn).replace(/\D/g, '').length !== 11) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'BVN must be 11 digits' };
      return res.status(400).json(responseData);
    }

    const provider = educationProvider.toLowerCase();
    const validProviders = ['waec', 'neco', 'nabteb', 'nbais'];
    if (!validProviders.includes(provider)) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: `educationProvider must be one of: ${validProviders.join(', ')}` };
      return res.status(400).json(responseData);
    }

    const eduMissing: string[] = [];

    if (provider === 'waec') {
      if (!regNo) eduMissing.push('registrationNumber');
      if (!examYear) eduMissing.push('examYear');
      if (!examType) eduMissing.push('examType (Internal/GCE)');
      if (!cardSerialNumber) eduMissing.push('cardSerialNumber');
      if (!cardPin) eduMissing.push('cardPin');
    } else if (provider === 'neco') {
      if (!regNo) eduMissing.push('registrationNumber');
      if (!examYear) eduMissing.push('examYear');
      if (!examType) eduMissing.push('examType (Internal/GCE)');
      if (!(cardPin || token)) eduMissing.push('token (NECO verification token)');
    } else if (provider === 'nabteb') {
      if (!(regNo || candidateNumber)) eduMissing.push('candidateNumber');
      if (!examYear) eduMissing.push('examYear');
      if (!examType) eduMissing.push('examType (MAY/JUN)');
      if (!cardSerialNumber) eduMissing.push('cardSerialNumber');
      if (!cardPin) eduMissing.push('cardPin');
    } else if (provider === 'nbais') {
      if (!regNo) eduMissing.push('registrationNumber');
      if (!examYear) eduMissing.push('examYear');
      if (!examMonth) eduMissing.push('examMonth (MAY or NOV)');
      if (!candidateState) eduMissing.push('state (candidate state)');
      if (!schoolName) eduMissing.push('schoolName');
      if (!cardPin) eduMissing.push('cardPin');
    }

    if (eduMissing.length > 0) {
      statusCode = 400;
      responseData = {
        status: 'error', code: 400,
        message: `Missing required fields for ${provider.toUpperCase()} education verification: ${eduMissing.join(', ')}`,
      };
      return res.status(400).json(responseData);
    }

    const rawCost = API_PRICES.nin + API_PRICES.bvn + API_PRICES.education;
    const bundleDiscount = 0.15;
    totalCost = Math.round(rawCost * (1 - bundleDiscount));

    await deductDeveloperBalance(dev.id, totalCost,
      `Employment Screening — NIN + BVN + ${provider.toUpperCase()} (15% bundle discount)`, envMode);

    const requestId = 'IDC-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    if (envMode === 'sandbox') {
      const ninData = sandboxNIN(nin).data;
      const bvnData = sandboxBVN(bvn).data;
      const eduResult = sandboxEducation(provider, regNo, String(examYear));
      const analysis = analyzeIdentityCheck(ninData, bvnData, eduResult.data);

      statusCode = 200;
      responseData = {
        status: 'success', code: 200, message: 'Employment screening completed (sandbox)',
        data: {
          requestId, reference: reference || null, status: 'completed',
          decision: analysis.decision,
          score: analysis.overallScore,
          summary: analysis.summary,
          crossCheck: analysis.crossCheck,
          ssceAnalysis: analysis.ssceAnalysis,
          flags: analysis.flags,
          nin: {
            status: 'verified',
            firstName: ninData.firstName, middleName: ninData.middleName || null,
            lastName: ninData.lastName, dateOfBirth: ninData.dateOfBirth, gender: ninData.gender,
          },
          bvn: {
            status: 'verified',
            firstName: bvnData.firstName, middleName: bvnData.middleName || null,
            lastName: bvnData.lastName, dateOfBirth: bvnData.dateOfBirth,
          },
          education: {
            provider: provider.toUpperCase(),
            status: 'verified',
            examYear,
            registrationNumber: regNo,
            candidateName: eduResult.data.candidateName,
            candidateDateOfBirth: eduResult.data.candidateDateOfBirth || null,
            subjects: analysis.ssceAnalysis.subjects,
          },
          pricing: { rawCost, bundleDiscount: '15%', totalCost },
          completedAt: new Date().toISOString(),
        }
      };
      return res.json(responseData);
    }

    const checksRequested = { nin: true, bvn: true, education: [{ type: provider, examYear }] };
    const checksStatus: Record<string, string> = { nin: 'pending', bvn: 'pending', education_0: 'pending' };

    await db.execute(sql`
      INSERT INTO developer_unified_requests
        (id, developer_id, reference, callback_url, identity_nin, identity_bvn,
         checks_requested, options, status, checks_status, total_cost, environment)
      VALUES
        (${requestId}, ${dev.id}, ${reference || null}, ${callbackUrl || null},
         ${nin.substring(0, 4) + '***'}, ${bvn.substring(0, 4) + '***'},
         ${JSON.stringify(checksRequested)}::jsonb, ${JSON.stringify({ source: 'employment-screening' })}::jsonb,
         'queued', ${JSON.stringify(checksStatus)}::jsonb, ${totalCost}, ${envMode})
    `);

    responseData = {
      status: 'accepted', code: 202,
      message: 'Employment screening started. NIN + BVN will be verified immediately, education results via RPA in 1-3 minutes.',
      data: {
        requestId, reference: reference || null, status: 'queued',
        eta: '60–120 seconds',
        checks: checksStatus,
        pollUrl: `GET /verify/employment-screening/result/${requestId}`,
        webhookConfigured: !!callbackUrl,
        pricing: { rawCost, bundleDiscount: '15%', totalCost },
      }
    };
    res.status(202).json(responseData);

    setImmediate(async () => {
      try {
        await db.execute(sql`UPDATE developer_unified_requests SET status = 'processing' WHERE id = ${requestId}`);

        const { premblyService } = await import('../../../services/premblyService');
        const [ninRes, bvnRes] = await Promise.allSettled([
          premblyService.verifyNIN(nin),
          premblyService.verifyBVN(bvn),
        ]);

        let ninData: any = null;
        let bvnData: any = null;
        const flags: string[] = [];
        const updatedChecksStatus = { ...checksStatus };

        if (ninRes.status === 'fulfilled') { ninData = ninRes.value?.data || null; updatedChecksStatus.nin = 'verified'; }
        else { flags.push(`NIN lookup failed: ${ninRes.reason?.message}`); updatedChecksStatus.nin = 'failed'; }

        if (bvnRes.status === 'fulfilled') { bvnData = bvnRes.value?.data || null; updatedChecksStatus.bvn = 'verified'; }
        else { flags.push(`BVN lookup failed: ${bvnRes.reason?.message}`); updatedChecksStatus.bvn = 'failed'; }

        const nameScore = (ninData && bvnData)
          ? nameSimilarityScore(`${ninData.firstName} ${ninData.lastName}`, `${bvnData.firstName} ${bvnData.lastName}`)
          : null;

        if (nameScore !== null && nameScore < 0.72) {
          flags.push(`Name mismatch between NIN and BVN records (score: ${(nameScore * 100).toFixed(0)}%)`);
        }

        const serviceTypeMap: Record<string, string> = { waec: 'waec_result', neco: 'neco_result', nabteb: 'nabteb_result', nbais: 'nbais_result' };
        const defaultExamTypeMap: Record<string, string> = { waec: 'WASSCE', neco: 'ssce_int', nabteb: 'NBC/NTC', nbais: 'AISSCE' };

        let educationResult: any = { status: 'processing' };
        try {
          const [job] = await db.insert(rpaJobs).values({
            serviceType: serviceTypeMap[provider] || `${provider}_result`,
            queryData: {
              registrationNumber: regNo,
              examYear: parseInt(String(examYear), 10),
              examType: examType || defaultExamTypeMap[provider],
              ...(cardPin ? { cardPin } : {}),
              ...(token ? { cardPin: token } : {}),
              ...(cardSerialNumber ? { cardSerialNumber } : {}),
              ...(candidateState ? { state: candidateState } : {}),
              ...(schoolName ? { schoolName } : {}),
              ...(examMonth ? { examMonth } : {}),
              source: 'developer_api_employment_screening',
              unifiedRequestId: requestId,
            },
            status: 'pending', priority: 5,
          }).returning();
          educationResult = { type: provider.toUpperCase(), registrationNumber: regNo, examYear, status: 'processing', jobId: job.id };
          updatedChecksStatus.education_0 = 'processing';
        } catch (rpaErr: any) {
          educationResult = { type: provider.toUpperCase(), registrationNumber: regNo, examYear, status: 'failed', error: rpaErr.message };
          updatedChecksStatus.education_0 = 'failed';
          flags.push(`Education (${provider.toUpperCase()}) queue failed: ${rpaErr.message}`);
        }

        const hasRpaJobs = educationResult.status === 'processing';
        const finalStatus = hasRpaJobs ? 'processing' : 'completed';

        let analysis: any = null;
        let score: number | null = null;
        if (!hasRpaJobs) {
          analysis = analyzeIdentityCheck(ninData, bvnData, educationResult.result || null);
          score = analysis.overallScore;
          flags.push(...analysis.flags);
        }

        const breakdown = {
          nin: ninData ? { status: 'matched', data: { firstName: ninData.firstName, middleName: ninData.middleName || null, lastName: ninData.lastName, dateOfBirth: ninData.dateOfBirth } } : { status: 'failed' },
          bvn: bvnData ? { status: 'matched', data: { firstName: bvnData.firstName, middleName: bvnData.middleName || null, lastName: bvnData.lastName, dateOfBirth: bvnData.dateOfBirth } } : { status: 'failed' },
          nameMatchScore: nameScore !== null ? Math.round(nameScore * 100) : null,
          education: [educationResult],
          crossCheck: analysis?.crossCheck || null,
          ssceAnalysis: analysis?.ssceAnalysis || null,
        };

        await db.execute(sql`
          UPDATE developer_unified_requests SET
            status = ${finalStatus},
            checks_status = ${JSON.stringify(updatedChecksStatus)}::jsonb,
            nin_data = ${ninData ? JSON.stringify(ninData) : null}::jsonb,
            bvn_data = ${bvnData ? JSON.stringify(bvnData) : null}::jsonb,
            education_results = ${JSON.stringify([educationResult])}::jsonb,
            score = ${score}, decision = ${score !== null ? toDecision(score) : 'PENDING'},
            flags = ${JSON.stringify(flags)}::jsonb,
            breakdown = ${JSON.stringify(breakdown)}::jsonb,
            ${hasRpaJobs ? sql`completed_at = null` : sql`completed_at = now()`}
          WHERE id = ${requestId}
        `);

        if (callbackUrl && !hasRpaJobs) {
          try {
            const payload = { event: 'employment-screening.completed', requestId, reference: reference || null, decision: analysis?.decision || toDecision(score), score, breakdown, flags, completedAt: new Date().toISOString() };
            await fetch(callbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Arapoint-Event': 'employment-screening.completed' }, body: JSON.stringify(payload) });
            await db.execute(sql`UPDATE developer_unified_requests SET webhook_delivered = true WHERE id = ${requestId}`).catch(() => {});
          } catch (whErr: any) {
            logger.error('Employment screening webhook delivery failed', { requestId, error: whErr.message });
          }
        }
      } catch (bgErr: any) {
        logger.error('Employment screening background processing failed', { requestId, error: bgErr.message });
        await db.execute(sql`UPDATE developer_unified_requests SET status = 'failed' WHERE id = ${requestId}`).catch(() => {});
      }
    });

  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Employment screening failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/employment-screening', 'POST',
      { reference, nin: '***', bvn: '***', educationProvider, examYear, registrationNumber: regNo || candidateNumber },
      responseData, statusCode, [200, 202].includes(statusCode) ? totalCost : 0,
      Date.now() - start, req.ip || '', envMode);
  }
});

router.get('/verify/employment-screening/result/:requestId', apiKeyAuth, async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const { requestId } = req.params;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!requestId?.startsWith('IDC-')) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Invalid requestId. Employment screening request IDs start with IDC-' };
      return res.status(400).json(responseData);
    }

    const rows = await db.execute(sql`
      SELECT * FROM developer_unified_requests WHERE id = ${requestId} AND developer_id = ${dev.id}
    `);
    const row: any = rows.rows?.[0];

    if (!row) {
      statusCode = 404;
      responseData = { status: 'error', code: 404, message: 'Employment screening request not found or does not belong to your account' };
      return res.status(404).json(responseData);
    }

    let currentStatus = row.status;
    let breakdown = row.breakdown || {};
    let flags = row.flags || [];
    let checksStatus = row.checks_status || {};
    let score = row.score;
    let decision = row.decision;

    if (currentStatus === 'processing' && row.education_results) {
      const eduResults = typeof row.education_results === 'string' ? JSON.parse(row.education_results) : row.education_results;
      let allDone = true;

      for (let i = 0; i < eduResults.length; i++) {
        const edu = eduResults[i];
        if (edu.status === 'processing' && edu.jobId) {
          const jobRows = await db.execute(sql`SELECT status, result, error_message FROM rpa_jobs WHERE id = ${edu.jobId}`);
          const job: any = jobRows.rows?.[0];
          if (job) {
            if (job.status === 'completed') {
              edu.status = 'verified';
              edu.result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
              checksStatus[`education_${i}`] = 'verified';
            } else if (job.status === 'failed') {
              edu.status = 'failed';
              edu.error = job.error_message || 'Verification failed';
              checksStatus[`education_${i}`] = 'failed';
              flags.push(`Education (${edu.type}) verification failed: ${job.error_message || 'Unknown error'}`);
            } else {
              allDone = false;
            }
          } else {
            allDone = false;
          }
        }
      }

      if (allDone) {
        currentStatus = 'completed';
        breakdown.education = eduResults;

        const ninDataParsed = row.nin_data ? (typeof row.nin_data === 'string' ? JSON.parse(row.nin_data) : row.nin_data) : null;
        const bvnDataParsed = row.bvn_data ? (typeof row.bvn_data === 'string' ? JSON.parse(row.bvn_data) : row.bvn_data) : null;

        const verifiedEdu = eduResults.find((e: any) => e.status === 'verified');
        const eduResultData = verifiedEdu?.result || null;

        if (eduResultData || ninDataParsed || bvnDataParsed) {
          const analysis = analyzeIdentityCheck(ninDataParsed, bvnDataParsed, eduResultData);
          score = analysis.overallScore;
          decision = analysis.decision;
          flags = [...flags, ...analysis.flags];
          breakdown.crossCheck = analysis.crossCheck;
          breakdown.ssceAnalysis = analysis.ssceAnalysis;
          breakdown.summary = analysis.summary;
        }

        await db.execute(sql`
          UPDATE developer_unified_requests SET
            status = 'completed',
            education_results = ${JSON.stringify(eduResults)}::jsonb,
            checks_status = ${JSON.stringify(checksStatus)}::jsonb,
            score = ${score}, decision = ${decision || 'PENDING'},
            flags = ${JSON.stringify(flags)}::jsonb,
            breakdown = ${JSON.stringify(breakdown)}::jsonb,
            completed_at = now()
          WHERE id = ${requestId}
        `);
      }
    }

    const ninData = row.nin_data ? (typeof row.nin_data === 'string' ? JSON.parse(row.nin_data) : row.nin_data) : null;
    const bvnData = row.bvn_data ? (typeof row.bvn_data === 'string' ? JSON.parse(row.bvn_data) : row.bvn_data) : null;
    const finalEduResults = (currentStatus === 'completed' && breakdown.education)
      ? breakdown.education
      : (row.education_results ? (typeof row.education_results === 'string' ? JSON.parse(row.education_results) : row.education_results) : []);

    if (currentStatus === 'completed' && !breakdown.crossCheck && (ninData || bvnData)) {
      const verifiedEdu = finalEduResults.find((e: any) => e.status === 'verified');
      const repairAnalysis = analyzeIdentityCheck(ninData, bvnData, verifiedEdu?.result || null);
      score = repairAnalysis.overallScore;
      decision = repairAnalysis.decision;
      flags = [...flags, ...repairAnalysis.flags];
      breakdown.crossCheck = repairAnalysis.crossCheck;
      breakdown.ssceAnalysis = repairAnalysis.ssceAnalysis;
      breakdown.summary = repairAnalysis.summary;
      await db.execute(sql`
        UPDATE developer_unified_requests SET
          score = ${score}, decision = ${decision},
          flags = ${JSON.stringify(flags)}::jsonb,
          breakdown = ${JSON.stringify(breakdown)}::jsonb
        WHERE id = ${requestId}
      `).catch(() => {});
    }

    const eduEntry = finalEduResults.length > 0 ? finalEduResults[0] : { status: checksStatus.education_0 || 'pending' };

    responseData = {
      status: 'success', code: 200,
      message: currentStatus === 'completed' ? 'Employment screening completed' : 'Employment screening still processing',
      data: {
        requestId,
        reference: row.reference || null,
        status: currentStatus,
        decision: decision || 'PENDING',
        score: score ?? null,
        summary: breakdown.summary || null,
        crossCheck: breakdown.crossCheck || null,
        ssceAnalysis: breakdown.ssceAnalysis || null,
        nin: ninData
          ? { status: 'verified', firstName: ninData.firstName, middleName: ninData.middleName || null, lastName: ninData.lastName, dateOfBirth: ninData.dateOfBirth, gender: ninData.gender }
          : { status: checksStatus.nin || 'pending' },
        bvn: bvnData
          ? { status: 'verified', firstName: bvnData.firstName, middleName: bvnData.middleName || null, lastName: bvnData.lastName, dateOfBirth: bvnData.dateOfBirth }
          : { status: checksStatus.bvn || 'pending' },
        education: eduEntry.status === 'verified' ? {
          provider: eduEntry.type,
          status: 'verified',
          registrationNumber: eduEntry.registrationNumber,
          examYear: eduEntry.examYear,
          candidateName: eduEntry.result?.candidateName || null,
          candidateDateOfBirth: eduEntry.result?.candidateDateOfBirth || eduEntry.result?.dateOfBirth || null,
          subjects: breakdown.ssceAnalysis?.subjects || eduEntry.result?.subjects || [],
        } : eduEntry,
        flags,
        pricing: { rawCost: API_PRICES.nin + API_PRICES.bvn + API_PRICES.education, bundleDiscount: '15%', totalCost: row.total_cost },
        completedAt: row.completed_at || null,
      }
    };
    res.json(responseData);
  } catch (e: any) {
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Failed to fetch employment screening result', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, `/verify/employment-screening/result/${requestId}`, 'GET',
      { requestId }, responseData, statusCode, 0,
      Date.now() - start, req.ip || '', (dev as any).environmentMode || 'sandbox');
  }
});

export function validateTimeline(dob: string | null, ssceYear: number | null, employmentYear: number): {
  valid: boolean; ageAtEmployment: number | null; ageAtExam: number | null; issues: string[];
} {
  const issues: string[] = [];
  if (!dob) {
    return { valid: false, ageAtEmployment: null, ageAtExam: null, issues: ['Date of birth unavailable for timeline check'] };
  }
  let birthYear: number | null = null;
  const parts = dob.replace(/[^\d]/g, '-').split('-').filter(Boolean);
  for (const p of parts) {
    const y = parseInt(p, 10);
    if (y >= 1940 && y <= new Date().getFullYear() - 5) { birthYear = y; break; }
  }
  if (!birthYear) {
    return { valid: false, ageAtEmployment: null, ageAtExam: null, issues: ['Could not parse date of birth for timeline check'] };
  }
  const ageAtEmployment = employmentYear - birthYear;
  let ageAtExam: number | null = null;
  if (ageAtEmployment < 18) {
    issues.push(`Age at employment year ${employmentYear} is ${ageAtEmployment} — below minimum working age of 18`);
  } else if (ageAtEmployment > 80) {
    issues.push(`Age at employment year ${employmentYear} is ${ageAtEmployment} — unusually high, please verify`);
  }
  if (ssceYear !== null) {
    ageAtExam = ssceYear - birthYear;
    if (ageAtExam < 13) {
      issues.push(`Age at SSCE exam year ${ssceYear} would be ${ageAtExam} — too young for SSCE`);
    } else if (ageAtExam > 35) {
      issues.push(`Age at SSCE exam year ${ssceYear} would be ${ageAtExam} — unusually old for SSCE`);
    }
    if (ssceYear > employmentYear) {
      issues.push(`SSCE exam year (${ssceYear}) is after employment year (${employmentYear})`);
    }
  }
  return { valid: issues.length === 0, ageAtEmployment, ageAtExam, issues };
}

// ===== Face Verification Endpoints (Prembly biometrics) =====
import multer from 'multer';
import { premblyService } from '../../../services/premblyService';

const faceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/verify/face-liveness', apiKeyAuth, faceUpload.single('image'), async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const envMode = (dev as any).environmentMode || 'sandbox';
  const price = API_PRICES.faceLiveness ?? 50;
  let statusCode = 200;
  let responseData: any;

  try {
    if (!req.file) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'image file is required (multipart field name: image)' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, price, 'Face liveness check', envMode);

    if (envMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'Liveness verified (sandbox)',
        data: { verified: true, confidence: 99.5, reference: 'SBX-' + Date.now() },
      };
      return res.json(responseData);
    }

    const result = await premblyService.faceLiveness(req.file.buffer, req.file.mimetype);
    if (!result.success) {
      statusCode = 422;
      responseData = { status: 'error', code: 422, message: result.error, reference: result.reference };
      return res.status(422).json(responseData);
    }
    responseData = {
      status: 'success', code: 200,
      message: result.verified ? 'Liveness verified' : 'Liveness not detected',
      data: { verified: result.verified, confidence: result.confidence, reference: result.reference },
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Face liveness check failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/face-liveness', 'POST', { hasImage: !!req.file },
      responseData, statusCode, statusCode === 200 ? price : 0,
      Date.now() - start, req.ip || '', envMode);
  }
});

router.post('/verify/face-match', apiKeyAuth, faceUpload.fields([{ name: 'image_1', maxCount: 1 }, { name: 'image_2', maxCount: 1 }]), async (req: Request, res: Response) => {
  const start = Date.now();
  const dev = (req as any).developer;
  const apiKeyId = (req as any).apiKeyId;
  const envMode = (dev as any).environmentMode || 'sandbox';
  const price = API_PRICES.faceMatch ?? 80;
  let statusCode = 200;
  let responseData: any;

  try {
    const files = req.files as { image_1?: Express.Multer.File[]; image_2?: Express.Multer.File[] };
    if (!files?.image_1?.[0] || !files?.image_2?.[0]) {
      statusCode = 400;
      responseData = { status: 'error', code: 400, message: 'Both image_1 and image_2 are required (multipart fields)' };
      return res.status(400).json(responseData);
    }

    await deductDeveloperBalance(dev.id, price, 'Face match comparison', envMode);

    if (envMode === 'sandbox') {
      responseData = {
        status: 'success', code: 200, message: 'Faces matched (sandbox)',
        data: { match: true, confidence: 97.8, reference: 'SBX-' + Date.now() },
      };
      return res.json(responseData);
    }

    const result = await premblyService.faceComparison(
      files.image_1[0].buffer, files.image_2[0].buffer,
      files.image_1[0].mimetype, files.image_2[0].mimetype,
    );
    if (!result.success) {
      statusCode = 422;
      responseData = { status: 'error', code: 422, message: result.error, reference: result.reference };
      return res.status(422).json(responseData);
    }
    responseData = {
      status: 'success', code: 200,
      message: result.match ? 'Faces matched' : 'Faces did not match',
      data: { match: result.match, confidence: result.confidence, reference: result.reference },
    };
    res.json(responseData);
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) {
      statusCode = 402;
      responseData = { status: 'error', code: 402, message: 'Insufficient wallet balance. Please fund your developer wallet.' };
      return res.status(402).json(responseData);
    }
    statusCode = 500;
    responseData = { status: 'error', code: 500, message: 'Face match failed', error: e.message };
    res.status(500).json(responseData);
  } finally {
    await logApiCall(dev.id, apiKeyId, '/verify/face-match', 'POST', { hasImage1: true, hasImage2: true },
      responseData, statusCode, statusCode === 200 ? price : 0,
      Date.now() - start, req.ip || '', envMode);
  }
});

export default router;
