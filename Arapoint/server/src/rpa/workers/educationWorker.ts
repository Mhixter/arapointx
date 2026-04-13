import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { browserPool } from '../browserPool';
import { config } from '../../config/env';

interface EducationQueryData {
  registrationNumber: string;
  examYear: number;
  examType?: string;
  cardSerialNumber?: string;
  cardPin?: string;
  portalUrl?: string;
  state?: string;
  schoolName?: string;
  examMonth?: string;
}

interface ExamSubject {
  subject: string;
  grade: string;
}

interface ExamResult {
  registrationNumber: string;
  candidateName?: string;
  examType?: string;
  examYear?: number;
  subjects: ExamSubject[];
  verificationStatus: 'verified' | 'not_found' | 'error';
  message: string;
  errorMessage?: string;
  screenshotBase64?: string;
  pdfBase64?: string;
  isOfficialPdf?: boolean;
}

interface ProviderProfile {
  name: string;
  settingsKey: string;
  selectors: {
    examYearSelect: string;
    examTypeSelect: string;
    examNumberInput: string;
    serialInput: string;
    pinInput: string;
    tokenInput: string;
    [key: string]: string;
  };
  examTypeNormalizer: (examType: string) => { isInternal: boolean };
  defaultExamType: string;
  usesToken: boolean;
  requiresSerial: boolean;
}

const PROVIDER_PROFILES: Record<string, ProviderProfile> = {
  waec: {
    name: 'WAEC',
    settingsKey: 'rpa_provider_url_waec',
    selectors: {
      examYearSelect: 'select[name="ExamYear"], select#ExamYear, select[name="examYear"]',
      examTypeSelect: 'select[name="ExamType"], select#ExamType',
      examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[name="CandNo"], input[placeholder*="Registration"]',
      serialInput: 'input[name="SerialNumber"], input#SerialNumber, input[name="Serial"]',
      pinInput: 'input[name="Pin"], input#Pin, input[name="PIN"], input[type="password"]',
      tokenInput: 'input[name="token"], input#token',
    },
    examTypeNormalizer: (examType: string) => {
      const t = examType.toLowerCase();
      return { isInternal: t.includes('wassce') || t.includes('school') || t.includes('internal') || !t.includes('gce') };
    },
    defaultExamType: 'WASSCE',
    usesToken: false,
    requiresSerial: true,
  },
  neco: {
    name: 'NECO',
    settingsKey: 'rpa_provider_url_neco',
    selectors: {
      examYearSelect: 'select[name="ExamYear"], select#ExamYear, select#year',
      examTypeSelect: 'select[name="ExamType"], select#ExamType',
      examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[name="CandNo"], input[placeholder*="Registration"]',
      serialInput: 'input[name="SerialNumber"], input#SerialNumber',
      pinInput: 'input[name="token"], input#token, input#tokenCode',
      tokenInput: 'input[name="token"], input#token, input#tokenCode, input[placeholder*="Token"]',
    },
    examTypeNormalizer: (examType: string) => {
      const t = examType.toLowerCase();
      return { isInternal: t.includes('school') || t.includes('internal') || t === 'school_candidate' };
    },
    defaultExamType: 'school_candidate',
    usesToken: true,
    requiresSerial: false,
  },
  nabteb: {
    name: 'NABTEB',
    settingsKey: 'rpa_provider_url_nabteb',
    selectors: {
      examYearSelect: 'select#examyear, select[name="examyear"]',
      examTypeSelect: 'select#examtype, select[name="examtype"]',
      examNumberInput: 'input#candid, input[name="candid"]',
      serialInput: 'input#serial, input[name="serial"]',
      pinInput: 'input#pin, input[name="pin"], input[type="password"]',
      tokenInput: 'input[name="token"], input#token',
    },
    examTypeNormalizer: (examType: string) => {
      const t = examType.toLowerCase();
      return { isInternal: !t.includes('gce') && !t.includes('private') };
    },
    defaultExamType: '01',
    usesToken: false,
    requiresSerial: true,
  },
  nbais: {
    name: 'NBAIS',
    settingsKey: 'rpa_provider_url_nbais',
    selectors: {
      examYearSelect: 'select[name="ExamYear"], select#ExamYear',
      examTypeSelect: 'select[name="ExamType"], select#ExamType',
      examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[placeholder*="Registration"], input[placeholder*="Exam Number"]',
      serialInput: 'input[name="SerialNumber"], input#SerialNumber',
      pinInput: 'input[name="Pin"], input#Pin, input[name="PIN"], input[type="password"]',
      tokenInput: 'input[name="token"], input#token',
      stateSelect: 'select[name="State"], select#State, select[name="state"], select[placeholder*="State"]',
      schoolNameInput: 'input[name="SchoolName"], input#SchoolName, input[name="schoolName"], input[placeholder*="School"]',
      examMonthSelect: 'select[name="Month"], select[name="ExamMonth"], select#ExamMonth, select[name="month"]',
    },
    examTypeNormalizer: () => ({ isInternal: true }),
    defaultExamType: 'AISSCE',
    usesToken: false,
    requiresSerial: true,
  },
};

export class EducationWorker extends BaseWorker {
  protected serviceName = 'education_service';
  private provider: string;
  private profile: ProviderProfile;

  constructor(provider: string) {
    super();
    this.provider = provider.toLowerCase();
    this.profile = PROVIDER_PROFILES[this.provider] || PROVIDER_PROFILES.waec;
    this.serviceName = `${this.provider}_service`;
  }

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as EducationQueryData;
    logger.info(`${this.profile.name} Worker starting job`, { 
      registrationNumber: data.registrationNumber,
      examYear: data.examYear,
      provider: this.provider
    });

    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 28000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const portalUrl = data.portalUrl || await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult(`${this.profile.name} portal URL not configured. Please configure in admin settings.`);
      }

      const customSelectors = await this.getCustomSelectors();
      const selectors = { ...this.profile.selectors, ...customSelectors };

      pooledResource = await browserPool.acquire();
      if (!pooledResource) {
        return this.createErrorResult('No available browser. System is at capacity, please try again.');
      }

      const { page } = pooledResource;
      logger.info(`${this.profile.name} Worker acquired browser from pool`);

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Request timeout exceeded')), requestTimeout);
      });

      const verifyFn = this.provider === 'nbais'
        ? this.executeNbaisFlow(page, portalUrl, data)
        : this.provider === 'nabteb'
          ? this.executeNabtebFlow(page, portalUrl, data)
          : this.performVerification(page, portalUrl, data, selectors);

      const result = await Promise.race([
        verifyFn,
        timeoutPromise
      ]);

      if (result.verificationStatus === 'verified') {
        return this.createSuccessResult(result as unknown as Record<string, unknown>);
      } else {
        return {
          success: false,
          error: result.message,
          data: {
            verificationStatus: result.verificationStatus,
            errorMessage: result.message,
            registrationNumber: result.registrationNumber,
            examYear: result.examYear,
            examType: result.examType,
          },
        };
      }
    } catch (error: any) {
      logger.error(`${this.profile.name} Worker error`, { error: error.message });
      return this.createErrorResult(error.message, true);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (pooledResource) {
        await pooledResource.release();
      }
    }
  }

  private async getPortalUrl(): Promise<string | null> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, this.profile.settingsKey))
        .limit(1);

      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error(`Failed to get ${this.profile.name} portal URL`, { error: error.message });
      return null;
    }
  }

  private async getCustomSelectors(): Promise<Record<string, string>> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, `rpa_selectors_${this.provider}`))
        .limit(1);

      if (setting?.settingValue) {
        return JSON.parse(setting.settingValue);
      }
      return {};
    } catch (error: any) {
      logger.warn(`Failed to get custom ${this.profile.name} selectors`, { error: error.message });
      return {};
    }
  }

  private async closePrivacyPopup(page: Page): Promise<void> {
    logger.info(`Checking for ${this.profile.name} privacy popup`);
    
    try {
      await this.sleep(400);

      const closed = await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, .popup, .overlay, [role="dialog"], .swal2-container');
        for (const modal of Array.from(modals)) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            const closeSelectors = ['button.close', '[data-dismiss="modal"]', '.btn-close', '.swal2-confirm'];
            for (const sel of closeSelectors) {
              const btn = modal.querySelector(sel) || document.querySelector(sel);
              if (btn) {
                (btn as HTMLElement).click();
                return true;
              }
            }
            const buttons = Array.from(modal.querySelectorAll('button'));
            for (const btn of buttons) {
              const text = (btn.textContent || '').toLowerCase();
              if (text.includes('close') || text.includes('ok') || text.includes('accept') || text.includes('continue')) {
                btn.click();
                return true;
              }
            }
          }
        }
        return false;
      });

      if (closed) {
        await this.sleep(500);
      } else {
        try { await page.keyboard.press('Escape'); } catch {}
      }
    } catch (error: any) {
      logger.warn('Error handling popup', { error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NECO hybrid: fast API pre-check → browser pool for official print PDF
  // ─────────────────────────────────────────────────────────────────────────────

  /** Map user-friendly examType string to NECO API parameter value */
  private mapNecoExamType(examType?: string): string {
    const t = (examType || 'school_candidate').toLowerCase();
    if (t.includes('ssce_ext') || t.includes('gce') || t.includes('external') || t.includes('private')) return 'ssce_ext';
    if (t.includes('bece')) return 'bece';
    if (t.includes('ncee')) return 'ncee';
    if (t.includes('gifted')) return 'gifted';
    return 'ssce_int';
  }

  /** Step 1: Verify via NECO REST API (no browser, ~1 second).
   *  Returns { ok: true, body } on success or { ok: false, error } on failure. */
  private async verifyNecoApi(data: EducationQueryData, examType: string, token: string)
    : Promise<{ ok: true; body: any } | { ok: false; error: string; retryable: boolean }> {
    const params = new URLSearchParams({
      exam_year: data.examYear.toString(),
      exam_type: examType,
      reg_no: data.registrationNumber,
      token,
    });
    const apiUrl = `https://result.api.neco.gov.ng/api/results/check?${params.toString()}`;
    logger.info('NECO Direct API call', { url: apiUrl });

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://results.neco.gov.ng',
          'Referer': 'https://results.neco.gov.ng/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err: any) {
      return { ok: false, error: `NECO API unreachable: ${err.message}`, retryable: true };
    }

    let body: any;
    try { body = await response.json(); } catch {
      return { ok: false, error: 'NECO API returned an unexpected response. Please try again.', retryable: true };
    }

    logger.info('NECO API response', { status: response.status, body: JSON.stringify(body).slice(0, 500) });

    if (!response.ok) {
      const msg: string = body?.info || body?.message ||
        'Result not found. Kindly verify the accuracy of the registration number and exam year combination or token provided';
      return { ok: false, error: msg, retryable: false };
    }

    logger.info('NECO API SUCCESS', { body: JSON.stringify(body).slice(0, 500) });
    return { ok: true, body };
  }

  private async executeNecoDirectApi(data: EducationQueryData): Promise<WorkerResult> {
    const examType = this.mapNecoExamType(data.examType);
    const token = (data.cardPin || '').replace(/\s+/g, '');

    // ── Step 1: fast API verification ───────────────────────────────────────
    const apiResult = await this.verifyNecoApi(data, examType, token);
    if (!apiResult.ok) {
      return this.createErrorResult(apiResult.error, apiResult.retryable);
    }

    const apiBody = apiResult.body;
    const rawCandidateName: string =
      apiBody?.data?.candidate?.name || apiBody?.candidate?.name || apiBody?.name || apiBody?.candidateName || '';
    const candidateName: string = rawCandidateName.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    const rawSubjects: any[] = apiBody?.data?.results || apiBody?.results || apiBody?.data?.subjects || apiBody?.subjects || [];
    const subjects: ExamSubject[] = rawSubjects.map((r: any) => ({
      subject: r.subject || r.name || r.subjectName || String(r.subject_name || ''),
      grade: r.grade || r.score || r.result || String(r.letter_grade || ''),
    }));

    // ── Step 2: browser pool → NECO portal → official print PDF ─────────────
    logger.info('NECO API verified result. Acquiring browser for official PDF...');

    const portalUrl = await this.getPortalUrl() || 'https://results.neco.gov.ng/';
    const selectors = { ...this.profile.selectors };

    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 28000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      pooledResource = await browserPool.acquire();

      if (!pooledResource) {
        logger.warn('No browser available for NECO official PDF — using custom PDF fallback');
        return this.buildNecoCustomPdfResult(data, examType, subjects, candidateName, apiBody);
      }

      const { page } = pooledResource;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Browser timeout for NECO PDF')), requestTimeout);
      });

      const result = await Promise.race([
        this.performVerification(page, portalUrl, data, selectors),
        timeoutPromise,
      ]);

      if (result.verificationStatus === 'verified') {
        return this.createSuccessResult(result as unknown as Record<string, unknown>);
      }

      // Browser succeeded but no result detected — use fallback PDF
      logger.warn('NECO browser returned non-verified status despite API success; using fallback PDF');
      return this.buildNecoCustomPdfResult(data, examType, subjects, candidateName, apiBody);

    } catch (err: any) {
      logger.warn('NECO browser PDF failed — API confirmed result exists, returning custom PDF fallback', { error: err.message });
      return this.buildNecoCustomPdfResult(data, examType, subjects, candidateName, apiBody);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (pooledResource) await pooledResource.release();
    }
  }

  /** Fallback: generate a custom HTML → PDF when browser cannot reach NECO portal */
  private async buildNecoCustomPdfResult(
    data: EducationQueryData,
    examType: string,
    subjects: ExamSubject[],
    candidateName: string,
    apiBody?: any,
  ): Promise<WorkerResult> {
    let pdfBase64: string | undefined;
    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    try {
      pooledResource = await browserPool.acquire();
      if (pooledResource) {
        const { page } = pooledResource;
        const html = this.buildNecoResultHtml({ candidateName, registrationNumber: data.registrationNumber, examYear: data.examYear, examType, subjects, rawData: apiBody });
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' } });
        pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
        logger.info('NECO fallback custom PDF generated', { size: pdfBuffer.length });
      }
    } catch (err: any) {
      logger.warn('NECO fallback PDF generation failed', { error: err.message });
    } finally {
      if (pooledResource) await pooledResource.release();
    }

    if (!pdfBase64) {
      return this.createErrorResult('NECO result found but PDF generation failed. Please retry.');
    }

    return this.createSuccessResult({
      registrationNumber: data.registrationNumber,
      candidateName,
      examType,
      examYear: data.examYear,
      subjects,
      verificationStatus: 'verified',
      message: 'NECO result retrieved successfully',
      pdfBase64,
      isOfficialPdf: false,
    });
  }

  private buildNecoResultHtml(opts: {
    candidateName: string;
    registrationNumber: string;
    examYear: number;
    examType: string;
    subjects: ExamSubject[];
    rawData: any;
  }): string {
    const { candidateName, registrationNumber, examYear, examType, subjects, rawData } = opts;

    const subjectRows = subjects.length
      ? subjects.map((s, i) => `
          <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
            <td style="padding:8px 12px;border:1px solid #ddd">${s.subject}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:600">${s.grade}</td>
          </tr>`).join('')
      : `<tr><td colspan="2" style="padding:12px;text-align:center;color:#666">No subject breakdown available</td></tr>`;

    // Fallback: show raw JSON if no structured data parsed
    const rawBlock = !subjects.length
      ? `<pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:11px;overflow-wrap:break-word;white-space:pre-wrap">${JSON.stringify(rawData, null, 2)}</pre>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NECO Result - ${registrationNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .header { text-align: center; border-bottom: 3px solid #006400; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { color: #006400; margin: 0 0 4px; font-size: 22px; }
    .header p { margin: 2px 0; font-size: 13px; color: #555; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .info-item { background: #f0f7f0; padding: 8px 12px; border-radius: 4px; }
    .info-item label { font-size: 11px; color: #666; display: block; text-transform: uppercase; }
    .info-item span { font-weight: 600; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #006400; color: white; padding: 10px 12px; text-align: left; }
    .footer { text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>NATIONAL EXAMINATIONS COUNCIL (NECO)</h1>
    <p>Official Result Slip — Retrieved via Arapoint</p>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Candidate Name</label><span>${candidateName || 'N/A'}</span></div>
    <div class="info-item"><label>Registration Number</label><span>${registrationNumber}</span></div>
    <div class="info-item"><label>Examination Year</label><span>${examYear}</span></div>
    <div class="info-item"><label>Examination Type</label><span>${examType.toUpperCase().replace('_', ' ')}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th style="width:100px;text-align:center">Grade</th>
      </tr>
    </thead>
    <tbody>${subjectRows}</tbody>
  </table>

  ${rawBlock}

  <div class="footer">
    <p>Result verified via NECO Result Portal (result.api.neco.gov.ng) &bull; Arapoint Digital Services &bull; ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
</body>
</html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NABTEB dedicated flow — uses exact portal selectors from eworld.nabteb.gov.ng
  // Form: #candid (text), #examtype (select), #examyear (select), #serial (text), #pin (password)
  // Submit: input[name="Submit"]
  // ─────────────────────────────────────────────────────────────────────────────
  private mapNabtebExamType(examType?: string): string {
    const t = (examType || '01').trim();
    if (/^0[1-7]$/.test(t)) return t;
    const lower = t.toLowerCase();
    if (lower.includes('may') || lower.includes('jun')) return '01';
    if (lower.includes('nov') || (lower.includes('dec') && !lower.includes('modular'))) return '02';
    if (lower.includes('march') || lower.includes('mar')) return '03';
    if (lower.includes('modular') && lower.includes('dec')) return '04';
    if (lower.includes('modular') && lower.includes('jun')) return '05';
    if (lower.includes('gce') || lower.includes('a-level') || lower.includes('a level')) return '06';
    if (lower.includes('common') || lower.includes('entrance')) return '07';
    return '01';
  }

  private async executeNabtebFlow(page: Page, portalUrl: string, data: EducationQueryData): Promise<ExamResult> {
    logger.info('NABTEB flow starting', {
      registrationNumber: data.registrationNumber,
      examYear: data.examYear,
      examType: data.examType,
    });

    // Always target the root form page (strip any path so we don't land on newonsite.htm)
    const nabtebOrigin = (() => { try { return new URL(portalUrl).origin; } catch { return portalUrl; } })();
    const formUrl = nabtebOrigin + '/';

    await page.goto(formUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await this.sleep(800);

    // If the portal redirected us to newonsite.htm (announcement page), go back to the form
    const landedUrl = page.url();
    if (landedUrl.includes('newonsite') || landedUrl.includes('newsite') || !landedUrl.includes(nabtebOrigin.replace('https://', '').replace('http://', ''))) {
      logger.info('NABTEB redirected away from form — navigating back', { landedUrl, formUrl });
      await page.goto(formUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await this.sleep(600);
    }

    // Close any announcement popup / cookie notice
    await this.closePrivacyPopup(page);
    // Also dismiss any visible modal with an OK/Close/Continue button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      for (const btn of btns) {
        const t = ((btn as HTMLElement).innerText || '').toLowerCase().trim();
        if (t === 'ok' || t === 'close' || t === 'continue' || t === 'dismiss' || t === 'proceed') {
          const style = window.getComputedStyle(btn as HTMLElement);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            (btn as HTMLElement).click();
            return;
          }
        }
      }
    });

    try {
      await page.waitForSelector('#candid, input[name="candid"]', { timeout: 10000 });
    } catch {
      const currentUrl = page.url();
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 200));
      throw new Error(`Could not find NABTEB form. Current page: ${currentUrl}. Content: ${pageText}`);
    }

    const examTypeValue = this.mapNabtebExamType(data.examType);
    const examYearStr = String(data.examYear);

    logger.info('NABTEB filling form', { candid: data.registrationNumber, examType: examTypeValue, examYear: examYearStr });

    // 1. Select Examination Type
    try {
      await page.select('#examtype', examTypeValue);
      logger.info('NABTEB exam type selected', { value: examTypeValue });
    } catch (e: any) {
      logger.warn('NABTEB #examtype select failed', { error: e.message });
    }

    // 2. Select Examination Year
    try {
      await page.select('#examyear', examYearStr);
      logger.info('NABTEB exam year selected', { year: examYearStr });
    } catch (e: any) {
      logger.warn('NABTEB #examyear select failed', { error: e.message });
    }

    // 3. Enter Candidate Number
    const candidHandle = await page.$('#candid, input[name="candid"]');
    if (!candidHandle) throw new Error('Could not find Candidate Number input on NABTEB portal.');
    await candidHandle.click({ clickCount: 3 });
    await candidHandle.type(data.registrationNumber.trim(), { delay: 40 });
    logger.info('NABTEB candidate number entered', { value: data.registrationNumber });

    // 4. Enter Serial Number (required by NABTEB)
    if (data.cardSerialNumber) {
      const serialHandle = await page.$('#serial, input[name="serial"]');
      if (serialHandle) {
        await serialHandle.click({ clickCount: 3 });
        await serialHandle.type(data.cardSerialNumber.trim(), { delay: 40 });
        logger.info('NABTEB serial number entered', { value: data.cardSerialNumber });
      }
    }

    // 5. Enter PIN
    if (data.cardPin) {
      const pinHandle = await page.$('#pin, input[name="pin"]');
      if (pinHandle) {
        await pinHandle.click({ clickCount: 3 });
        await pinHandle.type(data.cardPin.trim(), { delay: 40 });
        logger.info('NABTEB PIN entered');
      }
    }

    await this.sleep(500);

    // 6. Intercept portal JavaScript before submitting:
    //    - The NABTEB form has target="results" which opens a NEW POPUP window (not same tab)
    //    - form_submit() validates, then calls displayresults() → window.open("","results")
    //    - We override window.open to suppress all popups, and set form.target="_self" so the
    //      POST to results.asp loads in the same tab (which Puppeteer can follow)
    //    - We also capture any alert() calls (validation errors) silently
    await page.evaluate(() => {
      // Capture alert() validation messages without blocking
      (window as any)._nabtebValidationError = null;
      (window as any).alert = (msg: string) => { (window as any)._nabtebValidationError = msg; };
      // Suppress all window.open popups (newonsite.htm + results window)
      (window as any).open = function() {
        return { focus() {}, document: { write() {}, close() {} }, location: {} };
      };
      // Redirect form from popup target to same tab
      const form = document.querySelector('form[name="form1"], form') as HTMLFormElement | null;
      if (form) form.target = '_self';
      // Pre-set flag to avoid email validation
      const flagEl = document.querySelector('input[name="flag"]') as HTMLInputElement | null;
      if (flagEl) flagEl.value = 'false';
    });

    // Belt-and-suspenders: also dismiss any native CDP dialog that slips through
    const dialogHandler = async (dialog: any) => {
      logger.warn('NABTEB native dialog intercepted', { message: dialog.message() });
      await dialog.dismiss();
    };
    page.on('dialog', dialogHandler);

    // Set up navigation BEFORE clicking — form now posts to _self, so same-tab navigation follows
    const nabtebNavPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => null);

    // Click submit via evaluate (avoids "target closed" Puppeteer race if navigation is immediate)
    await page.evaluate(() => {
      const btn = document.querySelector('input[name="Submit"]') as HTMLInputElement | null;
      if (btn) btn.click();
    });
    logger.info('NABTEB submit button clicked — form will POST to results.asp in same tab');

    await nabtebNavPromise;
    page.off('dialog', dialogHandler);
    await this.sleep(1200);

    const textAfterSubmit = await page.evaluate(() => document.body.innerText);
    const resultUrl = page.url();
    logger.info('NABTEB after submit', { url: resultUrl, preview: textAfterSubmit.slice(0, 500) });

    // If form_submit() called alert() (client-side validation error), surface it
    const clientValidationError = await page.evaluate(() => (window as any)._nabtebValidationError as string | null);
    if (clientValidationError) {
      throw new Error(`NABTEB validation: ${clientValidationError}`);
    }

    // Check for server-side error messages on the results page
    const pageError = await this.checkNabtebErrors(page);
    if (pageError) throw new Error(pageError);

    const hasResults = await page.evaluate(() => {
      const t = document.body.innerText;
      return t.includes('Subject') || t.includes('SUBJECT') || t.includes('Grade') || t.includes('GRADE') || t.includes('Score');
    });
    if (!hasResults) {
      const portalMsg = textAfterSubmit.trim().slice(0, 400);
      throw new Error(`NABTEB: No results found for this candidate. ${portalMsg ? `Portal says: ${portalMsg}` : 'Check candidate number, serial number, and PIN.'}`);
    }

    const candidateName = await this.extractCandidateName(page);
    const subjects = await this.extractSubjects(page);
    logger.info('NABTEB results extracted', { candidateName, subjectCount: subjects.length });

    // Click Print button and generate PDF
    let pdfBase64: string | undefined;
    try {
      const printClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, input'));
        for (const btn of btns) {
          const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase().trim();
          if (text === 'print' || text === 'print result' || text === 'print results') {
            (btn as HTMLElement).click(); return true;
          }
        }
        for (const btn of btns) {
          if ((btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase().includes('print')) {
            (btn as HTMLElement).click(); return true;
          }
        }
        return false;
      });
      if (printClicked) {
        try { await Promise.race([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 6000 }), this.sleep(2500)]); } catch {}
        await this.sleep(600);
      }
      await page.emulateMediaType('print');
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      await page.emulateMediaType('screen');
      logger.info('NABTEB PDF generated', { size: pdfBuffer.length });
    } catch (e: any) {
      logger.warn('NABTEB PDF generation failed', { error: e.message });
    }

    if (!pdfBase64) throw new Error('Failed to generate NABTEB result PDF.');

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType,
      examYear: data.examYear,
      subjects,
      verificationStatus: 'verified',
      message: `NABTEB result retrieved successfully${candidateName ? ` for ${candidateName}` : ''}.`,
      pdfBase64,
      isOfficialPdf: true,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NBAIS 2-step flow: Step 1 (details) → Proceed → Step 2 (PIN) → Submit
  // ─────────────────────────────────────────────────────────────────────────────
  private async executeNbaisFlow(page: Page, portalUrl: string, data: EducationQueryData): Promise<ExamResult> {
    logger.info('NBAIS 2-step flow starting', {
      registrationNumber: data.registrationNumber,
      state: data.state,
      school: data.schoolName,
      year: data.examYear,
      month: data.examMonth,
      examType: data.examType,
    });

    // ── Navigate ────────────────────────────────────────────────────────────────
    await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.sleep(1200);
    await this.closePrivacyPopup(page);

    try {
      await page.waitForSelector('select, input', { timeout: 10000 });
    } catch {
      throw new Error('Could not find form on NBAIS portal. The page may have changed.');
    }

    // ── Dump ALL form elements for diagnostics ─────────────────────────────────
    const pageSnapshot = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => {
        const el = s as HTMLSelectElement;
        return { id: el.id, name: el.name, optCount: el.options.length, opts: Array.from(el.options).slice(0, 8).map(o => `${o.value}|${o.text.trim()}`) };
      });
      const inputs = Array.from(document.querySelectorAll('input')).map(i => {
        const el = i as HTMLInputElement;
        return { id: el.id, name: el.name, type: el.type, placeholder: el.placeholder?.slice(0, 30) };
      });
      const buttons = Array.from(document.querySelectorAll('button,input[type="submit"]')).map(b => ({
        tag: b.tagName, type: (b as any).type, text: (b as HTMLElement).innerText?.trim().slice(0, 30), cls: b.className.slice(0, 40),
      }));
      return { url: location.href, selects, inputs, buttons };
    });
    logger.info('NBAIS portal snapshot', { pageSnapshot: JSON.stringify(pageSnapshot).slice(0, 2000) });

    // ── STEP 1: Fill the details form ─────────────────────────────────────────

    // 1. Select State using Puppeteer native page.select() — most reliable, fires all browser events
    if (data.state) {
      // Find the state select's CSS selector and the correct option value
      const stateSelectInfo = await page.evaluate((stateVal: string) => {
        const stateKeywords = ['abia','adamawa','akwa','anambra','bauchi','borno','cross river','delta',
          'enugu','gombe','imo','jigawa','kaduna','kano','katsina','kebbi','kogi','kwara','lagos',
          'nasarawa','niger','ogun','ondo','osun','oyo','plateau','rivers','sokoto','taraba',
          'yobe','zamfara','fct','abuja'];
        const selects = Array.from(document.querySelectorAll('select'));
        const lower = stateVal.toLowerCase();
        for (let si = 0; si < selects.length; si++) {
          const el = selects[si] as HTMLSelectElement;
          const optTexts = Array.from(el.options).map(o => o.text.trim().toLowerCase());
          if (!stateKeywords.some(k => optTexts.some(t => t.includes(k)))) continue;
          for (let i = 0; i < el.options.length; i++) {
            const opt = el.options[i];
            if (opt.text.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)) {
              // Build a CSS selector for this select element
              const selector = el.id ? `#${el.id}` : el.name ? `select[name="${el.name}"]` : `select:nth-of-type(${si + 1})`;
              return { found: true, selector, optionValue: opt.value, optionText: opt.text };
            }
          }
          return { found: false, selector: '', optionValue: '', optionText: '', options: optTexts.slice(0, 6) };
        }
        return { found: false, selector: '', optionValue: '', optionText: '' };
      }, data.state);

      logger.info('NBAIS state select info', { stateSelectInfo });

      if (stateSelectInfo.found && stateSelectInfo.selector && stateSelectInfo.optionValue) {
        // Use Puppeteer's native page.select() — properly fires input + change events triggering AJAX
        try {
          await page.select(stateSelectInfo.selector, stateSelectInfo.optionValue);
          logger.info('NBAIS state selected via page.select()', { selector: stateSelectInfo.selector, value: stateSelectInfo.optionValue, text: stateSelectInfo.optionText });
        } catch (err: any) {
          logger.warn('NBAIS page.select() failed, falling back to evaluate', { err: err.message });
          // Fallback: direct DOM manipulation + jQuery trigger
          await page.evaluate((sel: string, val: string) => {
            const el = document.querySelector(sel) as HTMLSelectElement | null;
            if (!el) return;
            const idx = Array.from(el.options).findIndex(o => o.value === val);
            if (idx >= 0) el.selectedIndex = idx;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            const jq = (window as any).jQuery || (window as any).$;
            if (jq) { try { jq(el).trigger('change'); } catch(_) {} }
          }, stateSelectInfo.selector, stateSelectInfo.optionValue);
        }
      } else {
        logger.warn('NBAIS state select not found', { stateSelectInfo });
      }

      // Wait for school dropdown to populate (AJAX response) — threshold ≥ 2 options (small states may have few schools)
      logger.info('NBAIS waiting for school dropdown to populate...');
      try {
        await page.waitForFunction(() => {
          const stateKeywords = ['abia','adamawa','akwa','taraba','yobe','sokoto','kano','lagos'];
          const monthKeywords = ['june','july','november','january'];
          const typeKeywords = ['saissce','science','tahfeez'];
          const selects = Array.from(document.querySelectorAll('select'));
          return selects.some(sel => {
            if (sel.options.length < 2) return false;
            const optTexts = Array.from(sel.options).map(o => o.text.trim().toLowerCase());
            if (optTexts.some(o => /^20\d{2}$/.test(o))) return false;
            if (optTexts.some(o => monthKeywords.some(k => o.includes(k)))) return false;
            if (optTexts.some(o => typeKeywords.some(k => o.includes(k)))) return false;
            if (optTexts.some(o => stateKeywords.some(k => o.includes(k)))) return false;
            // Has at least 1 non-placeholder option
            const realOpts = Array.from(sel.options).filter(o => o.value && !o.text.toLowerCase().includes('select') && !o.text.toLowerCase().includes('choose'));
            return realOpts.length >= 1;
          });
        }, { timeout: 12000 });
        logger.info('NBAIS school dropdown populated');
      } catch {
        logger.warn('NBAIS school dropdown did not populate within 12s');
        await this.sleep(2000);
      }

      // Log ALL available school options for diagnostics
      const allSchoolOptions = await page.evaluate(() => {
        const stateKeywords = ['abia','adamawa','akwa','taraba','yobe','sokoto','kano','lagos','abuja','borno'];
        const monthKeywords = ['june','july','november','january'];
        const typeKeywords = ['saissce','science','tahfeez'];
        const selects = Array.from(document.querySelectorAll('select'));
        for (const sel of selects) {
          if (sel.options.length < 2) continue;
          const optTexts = Array.from(sel.options).map(o => o.text.trim().toLowerCase());
          if (optTexts.some(o => /^20\d{2}$/.test(o))) continue;
          if (optTexts.some(o => monthKeywords.some(k => o.includes(k)))) continue;
          if (optTexts.some(o => typeKeywords.some(k => o.includes(k)))) continue;
          if (optTexts.some(o => stateKeywords.some(k => o.includes(k)))) continue;
          return Array.from(sel.options).map(o => ({ text: o.text.trim(), value: o.value }));
        }
        return [];
      });
      logger.info('NBAIS portal school options', { count: allSchoolOptions.length, schools: allSchoolOptions });
    }

    // 2. Select School from #sub_cat (AJAX-populated after state selection)
    // Portal: #sub_cat, starts empty, fills after state AJAX
    if (data.schoolName) {
      const schoolMatch = await page.evaluate((schoolName: string) => {
        const sub = document.querySelector('#sub_cat') as HTMLSelectElement | null;
        if (!sub || sub.options.length === 0) return { value: null, options: [] };
        const lower = schoolName.toLowerCase();
        const keywords = lower.split(/\s+/).filter(w => w.length > 3);
        const allOpts = Array.from(sub.options).map(o => ({ text: o.text.trim(), value: o.value }));
        // Pass 1: exact match
        const exact = allOpts.find(o => o.text.toLowerCase() === lower);
        if (exact) return { value: exact.value, matched: exact.text, options: allOpts };
        // Pass 2: substring
        const substr = allOpts.find(o => o.text.toLowerCase().includes(lower));
        if (substr) return { value: substr.value, matched: substr.text, options: allOpts };
        // Pass 3: keyword scoring (≥60% of keywords match)
        const threshold = Math.ceil(keywords.length * 0.6);
        let best = { value: '', text: '', score: 0 };
        for (const o of allOpts) {
          const score = keywords.filter(k => o.text.toLowerCase().includes(k)).length;
          if (score > best.score) best = { value: o.value, text: o.text, score };
        }
        if (best.score >= threshold) return { value: best.value, matched: best.text, options: allOpts };
        return { value: null, options: allOpts };
      }, data.schoolName);

      logger.info('NBAIS school match result', { matched: schoolMatch.matched, value: schoolMatch.value, allSchools: schoolMatch.options });

      if (!schoolMatch.value) {
        const available = (schoolMatch.options as any[]).map((o: any) => o.text).join(' | ');
        throw new Error(`Your school "${data.schoolName}" was not found in the portal. Available schools: ${available || 'none (AJAX may not have loaded)'}`);
      }
      await page.select('#sub_cat', schoolMatch.value);
      logger.info('NBAIS school selected via page.select()', { value: schoolMatch.value, text: schoolMatch.matched });
      await this.sleep(300);
    }

    // 3. Select Year — portal: #year-select, option values are 4-digit year strings
    const examYear = String(data.examYear);
    try {
      await page.select('#year-select', examYear);
      logger.info('NBAIS year selected', { year: examYear });
    } catch {
      logger.warn('NBAIS #year-select page.select() failed, trying fallback');
      await page.evaluate((yr: string) => {
        const el = document.querySelector('#year-select') as HTMLSelectElement | null;
        if (!el) return;
        const idx = Array.from(el.options).findIndex(o => o.value === yr || o.text.trim() === yr);
        if (idx >= 0) { el.selectedIndex = idx; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }, examYear);
    }
    await this.sleep(300);

    // 4. Select Month — portal: #month-select, values: "June/July", "Nov/Dec"
    const examMonth = data.examMonth || 'June/July';
    try {
      await page.select('#month-select', examMonth);
      logger.info('NBAIS month selected', { month: examMonth });
    } catch {
      // Fallback: try matching by text
      await page.evaluate((mo: string) => {
        const el = document.querySelector('#month-select') as HTMLSelectElement | null;
        if (!el) return;
        const lower = mo.toLowerCase();
        const idx = Array.from(el.options).findIndex(o => o.value.toLowerCase().includes(lower) || o.text.toLowerCase().includes(lower));
        if (idx >= 0) { el.selectedIndex = idx; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }, examMonth);
    }
    await this.sleep(300);

    // 5. Select Exam Type — portal: #exam_type, values: "SAISSCE", "SCIENCE", "TAHFEEZ"
    const examType = data.examType || 'SAISSCE';
    try {
      await page.select('#exam_type', examType);
      logger.info('NBAIS exam type selected', { examType });
    } catch {
      await page.evaluate((et: string) => {
        const el = document.querySelector('#exam_type') as HTMLSelectElement | null;
        if (!el) return;
        const idx = Array.from(el.options).findIndex(o => o.value === et || o.text.trim() === et);
        if (idx >= 0) { el.selectedIndex = idx; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }, examType);
    }
    await this.sleep(300);

    // 6. Enter Registration Number — portal: input[name="exam_no"], placeholder "Your Exam Number"
    // Use Puppeteer native type() for real keyboard events (satisfies HTML5 required validation)
    let regFilled = false;
    const regSelectors = ['input[name="exam_no"]', 'input[placeholder*="Exam Number"]', 'input[placeholder*="exam"]'];
    for (const sel of regSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click({ clickCount: 3 });
          await el.type(data.registrationNumber.trim(), { delay: 40 });
          logger.info('NBAIS registration number typed', { selector: sel, value: data.registrationNumber });
          regFilled = true;
          break;
        }
      } catch { /* try next */ }
    }
    if (!regFilled) throw new Error('Could not find exam number input on NBAIS portal.');

    await this.sleep(600);

    // ── Snapshot before submit ────────────────────────────────────────────────
    const step1State = await page.evaluate(() => ({
      url: location.href,
      selects: Array.from(document.querySelectorAll('select')).map(s => {
        const el = s as HTMLSelectElement;
        return { id: el.id, name: el.name, value: el.value, selectedText: el.options[el.selectedIndex]?.text };
      }),
      textInputs: Array.from(document.querySelectorAll('input[type="text"],input:not([type])')).map(i => {
        const el = i as HTMLInputElement;
        return { id: el.id, name: el.name, value: el.value };
      }),
    }));
    logger.info('NBAIS Step 1 state before submit', { step1State: JSON.stringify(step1State) });

    // Take a diagnostic screenshot right before submit so admin can see exactly what was filled
    const preSubmitScreenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    logger.info('NBAIS pre-submit screenshot captured', { size: preSubmitScreenshot.length });

    // 7. Click Proceed — portal uses: button.submit[type="submit"]
    let clickedProceed = false;
    const proceedSelectors = [
      'button.submit',
      'button[type="submit"]',
      'input[type="submit"]',
      'button.btn-success',
      'button.btn-primary',
    ];
    for (const sel of proceedSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          logger.info('NBAIS clicked Proceed button', { selector: sel });
          clickedProceed = true;
          break;
        }
      } catch { /* try next */ }
    }
    if (!clickedProceed) {
      // Last resort: submit via keyboard Enter on the input
      await page.keyboard.press('Enter');
      logger.info('NBAIS submitted via Enter key');
    }

    // ── Wait for Step 2 (results-1.php) ───────────────────────────────────────
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        page.waitForFunction(
          () => document.body.innerText.toLowerCase().includes('welcome') || document.body.innerText.toLowerCase().includes('enter your pin') || window.location.href.includes('results'),
          { timeout: 20000 }
        ),
      ]);
    } catch {
      logger.warn('NBAIS Step 1 navigation timeout — inspecting current page');
    }
    await this.sleep(800);

    const step2Url = page.url();
    const step2Text = await page.evaluate(() => document.body.innerText);
    logger.info('NBAIS after Step 1 submit', { url: step2Url, preview: step2Text.slice(0, 400) });

    // Step 2 detection: page must have BOTH a name-confirmation signal AND a visible input field.
    // "welcome" alone is NOT enough — the portal header says "Welcome to NBAIS" on every page.
    const step2Signals = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasPin   = text.includes('enter your pin') || text.includes('enter pin');
      const hasNameConfirm = /welcome[,\s]+[a-z]/i.test(document.body.innerText);
      const urlOk   = window.location.href.toLowerCase().includes('result');
      const hasVisibleInput = Array.from(
        document.querySelectorAll('input[type="text"], input[type="password"], input:not([type])')
      ).some(el => {
        const inp = el as HTMLInputElement;
        return !inp.disabled && !inp.readOnly && !!inp.offsetParent;
      });
      // Also capture any error alerts for diagnostics
      const errorEls = Array.from(document.querySelectorAll('.alert,.alert-danger,.alert-warning,.error,.text-danger'));
      const errorText = errorEls.map(e => (e as HTMLElement).innerText?.trim()).filter(Boolean).join(' | ');
      return { hasPin, hasNameConfirm, urlOk, hasVisibleInput, errorText };
    });
    logger.info('NBAIS Step 2 signals', { step2Signals });

    // True Step 2: must have a visible input AND either pin text, name confirmation, or results URL
    const onStep2 = step2Signals.hasVisibleInput &&
                    (step2Signals.hasPin || step2Signals.hasNameConfirm || step2Signals.urlOk);

    if (!onStep2) {
      // Surface the actual portal error message
      const portalMsg = step2Signals.errorText ||
        await page.evaluate(() => document.body.innerText.trim().slice(0, 300));
      throw new Error(`NBAIS portal did not advance to step 2. Portal message: ${portalMsg || 'No message received.'}`);
    }

    // ── STEP 2: Candidate confirmed — enter PIN and submit ───────────────────

    const candidateName = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/Welcome[,\s]+([A-Z][A-Z\s]+?)\s*\|/i);
      return m?.[1]?.trim() || '';
    });
    logger.info('NBAIS candidate confirmed', { candidateName });

    if (!data.cardPin) throw new Error('PIN is required to retrieve NBAIS results.');

    // Wait for any visible text/password input to appear (handle dynamic rendering)
    try {
      await page.waitForSelector(
        'input[type="text"]:not([disabled]), input[type="password"]:not([disabled]), input:not([type]):not([disabled])',
        { visible: true, timeout: 6000 }
      );
    } catch {
      logger.warn('NBAIS PIN waitForSelector timed out — will try anyway');
    }

    // Fill PIN using Puppeteer native typing
    const pinSelectors = [
      'input[name="pin"]', 'input[name="Pin"]', 'input[name="PIN"]',
      'input[type="password"]',
      'input[placeholder*="Pin"]', 'input[placeholder*="pin"]', 'input[placeholder*="PIN"]',
      'input[type="text"]', 'input:not([type])',
    ];
    let pinFilled = false;
    for (const sel of pinSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click({ clickCount: 3 });
          await el.type(data.cardPin, { delay: 40 });
          logger.info('NBAIS PIN entered via selector', { selector: sel });
          pinFilled = true;
          break;
        }
      } catch { /* try next */ }
    }
    if (!pinFilled) throw new Error('Could not find PIN input on NBAIS step 2 page.');
    await this.sleep(400);

    // Submit Step 2 — set up waitForNavigation BEFORE the click to avoid "target closed" race
    const nbaisStep2NavPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);

    let step2Submitted = false;
    for (const sel of ['button[type="submit"]', 'input[type="submit"]', '.btn-success', '.btn-primary']) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          // Submit via evaluate to avoid "target closed" if navigation is immediate
          await page.evaluate((s: string) => {
            const el = document.querySelector(s) as HTMLElement | null;
            if (el) el.click();
          }, sel);
          logger.info('NBAIS Step 2 submitted', { selector: sel });
          step2Submitted = true;
          break;
        }
      } catch { /* try next */ }
    }
    if (!step2Submitted) await page.keyboard.press('Enter');

    // Wait for navigation or result content
    await nbaisStep2NavPromise;
    await this.sleep(1500);

    const resultsUrl = page.url();
    const resultsText = await page.evaluate(() => document.body.innerText);
    logger.info('NBAIS results page', { url: resultsUrl, preview: resultsText.slice(0, 500) });

    // Check for PIN/card errors (invalid card, limit exceeded, used, expired, etc.)
    const pinError = await this.checkNbaisErrors(page);
    if (pinError) throw new Error(`NBAIS error: ${pinError}`);

    // Extract results
    const subjects = await this.extractSubjects(page);

    // Click Print button and capture official PDF (instead of screenshot)
    let pdfBase64: string | undefined;
    try {
      const printClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, input'));
        for (const btn of btns) {
          const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase().trim();
          if (text === 'print' || text === 'print result' || text === 'print results') {
            (btn as HTMLElement).click(); return true;
          }
        }
        for (const btn of btns) {
          if ((btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase().includes('print')) {
            (btn as HTMLElement).click(); return true;
          }
        }
        return false;
      });
      if (printClicked) {
        try { await Promise.race([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 6000 }), this.sleep(2500)]); } catch {}
        await this.sleep(600);
        logger.info('NBAIS print button clicked — generating PDF from print view');
      } else {
        logger.info('NBAIS no print button found — generating PDF from results page directly');
      }
      await page.emulateMediaType('print');
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      await page.emulateMediaType('screen');
      logger.info('NBAIS PDF generated', { size: pdfBuffer.length });
    } catch (e: any) {
      logger.warn('NBAIS PDF generation failed', { error: e.message });
    }

    return {
      verificationStatus: 'verified',
      candidateName,
      registrationNumber: data.registrationNumber,
      examYear: data.examYear,
      examType: examType,
      provider: 'NBAIS',
      subjects,
      message: `NBAIS result retrieved successfully${candidateName ? ` for ${candidateName}` : ''}.`,
      pdfBase64,
      isOfficialPdf: true,
      resultsUrl,
    } as unknown as ExamResult;
  }

  private async performVerification(
    page: Page,
    portalUrl: string,
    data: EducationQueryData,
    selectors: Record<string, string>
  ): Promise<ExamResult> {
    // Response listener — purely observational, fires for every response from NECO's domain.
    // Does NOT require setRequestInterception so it can't break the page flow.
    const responseHandler = async (response: any) => {
      const url: string = response.url();
      if (url.includes('neco.gov.ng') || url.includes('results.neco')) {
        const method: string = response.request().method();
        const status: number = response.status();
        // Also log the initiating request URL (shows GET query params)
        const reqUrl: string = response.request().url();
        let body = '';
        try { body = await response.text(); } catch {}
        logger.info(`${this.profile.name} network response`, {
          method,
          reqUrl: reqUrl.slice(0, 800),
          status,
          bodyLength: body.length,
          bodyPreview: body.slice(0, 600),
        });
      }
    };

    page.on('response', responseHandler);

    try {

    logger.info(`Navigating to ${this.profile.name} portal`, { url: portalUrl });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await this.sleep(800);
    await this.closePrivacyPopup(page);

    try {
      await page.waitForSelector('form, input, select', { timeout: 10000 });
    } catch {
      throw new Error(`Could not find form on ${this.profile.name} portal. The page may have changed.`);
    }

    logger.info(`Filling ${this.profile.name} form fields`);

    await this.selectExamYear(page, data.examYear);
    // Wait for any AJAX-driven exam-type dropdown refresh after year selection
    await this.sleep(800);
    await this.selectExamType(page, data.examType || this.profile.defaultExamType);

    // Log the current state of all selects for debugging
    const formState = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map(s => ({
        name: s.name || s.id,
        value: s.value,
        options: Array.from(s.querySelectorAll('option')).map(o => o.value || o.textContent?.trim()),
      }));
    });
    logger.info(`${this.profile.name} form state after year+type selection`, { formState });
    
    if (this.profile.usesToken) {
      if (data.cardPin) {
        await this.fillField(page, selectors.tokenInput, data.cardPin, 'token');
      } else {
        logger.warn('Token required for NECO but not provided');
      }
      await this.fillRegistrationNumber(page, data.registrationNumber, selectors);
    } else {
      await this.fillRegistrationNumber(page, data.registrationNumber, selectors);
      if (data.cardSerialNumber && this.profile.requiresSerial) {
        await this.fillField(page, selectors.serialInput, data.cardSerialNumber, 'serial number');
      }
      if (data.cardPin) {
        await this.fillField(page, selectors.pinInput, data.cardPin, 'PIN');
      }
    }

    // NBAIS-specific fields: state, school name, exam month
    if (this.provider === 'nbais') {
      if (data.state && selectors.stateSelect) {
        await this.selectByText(page, selectors.stateSelect, data.state, 'state');
        await this.sleep(500);
      }
      if (data.schoolName && selectors.schoolNameInput) {
        await this.fillField(page, selectors.schoolNameInput, data.schoolName, 'school name');
      }
      if (data.examMonth && selectors.examMonthSelect) {
        await this.selectByText(page, selectors.examMonthSelect, data.examMonth, 'exam month');
        await this.sleep(400);
      }
    }

    await this.sleep(500);

    // Read back ALL inputs (any type) to confirm exact values being submitted
    const fieldReadback = await page.evaluate(() => {
      const tokenEl = document.querySelector('input[name="token"]') as HTMLInputElement | null;
      const regEl = (
        document.querySelector('input[name="CandNo"]') ||
        document.querySelector('input[name="ExamNumber"]') ||
        document.querySelector('input[placeholder*="Registration"]') ||
        document.querySelector('input[placeholder*="registration"]')
      ) as HTMLInputElement | null;

      const allInputs = Array.from(document.querySelectorAll('input')).map(el => {
        const inp = el as HTMLInputElement;
        return {
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder?.slice(0, 40),
          value: inp.value,
          maxLength: inp.maxLength,
        };
      });

      return {
        tokenField: tokenEl ? { type: tokenEl.type, value: tokenEl.value, maxLength: tokenEl.maxLength } : null,
        regField: regEl ? { type: regEl.type, value: regEl.value, name: regEl.name, placeholder: regEl.placeholder } : null,
        allInputs,
      };
    });
    logger.info(`${this.profile.name} field values before submit`, { fieldReadback });

    logger.info(`Submitting ${this.profile.name} form`);
    
    page.on('dialog', async (dialog) => {
      logger.info('Dialog appeared', { message: dialog.message() });
      await dialog.accept();
    });

    const textBeforeSubmit = await page.evaluate(() => document.body.innerText);
    
    await this.submitForm(page);
    
    // NECO shows a confirmation dialog - need to click "Proceed"
    await this.sleep(600);
    const hasConfirmation = await this.handleNecoConfirmation(page);
    if (hasConfirmation) {
      logger.info('NECO confirmation dialog handled, clicked Proceed');
    }
    
    // Wait for the page to respond — navigation, results, or any error message
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 }),
        page.waitForFunction((textBefore: string) => {
          const current = document.body.innerText;
          // Content changed significantly (more than just timestamps)
          const lengthDiff = Math.abs(current.length - textBefore.length);
          const hasTable = !!document.querySelector('table');
          const hasResultText = current.includes('Subject') || current.includes('Grade') || current.includes('Score');
          const hasError = current.includes('Invalid') || current.includes('Expired') || 
                           current.includes('Used') || current.includes('Error') ||
                           current.includes('Wrong') || current.includes('Not Found') ||
                           current.includes('Incorrect') || current.includes('already') ||
                           current.includes('not available') || current.includes('not found');
          return hasTable || hasResultText || hasError || lengthDiff > 100;
        }, { timeout: 14000 }, textBeforeSubmit)
      ]);
    } catch {
      logger.info('No navigation or content change detected within timeout');
    }
    
    await this.sleep(1500);

    // Capture the actual page state for debugging and error reporting
    const textAfterSubmit = await page.evaluate(() => document.body.innerText);
    const resultUrl = page.url();
    logger.info(`${this.profile.name} page state after submit`, { 
      url: resultUrl,
      textLength: textAfterSubmit.length,
      preview: textAfterSubmit.substring(0, 300)
    });

    // Take a screenshot to capture what the portal is actually showing
    let screenshotBase64: string | undefined;
    try {
      const shot = await page.screenshot({ encoding: 'base64', fullPage: false });
      screenshotBase64 = shot as string;
    } catch { /* non-critical */ }
    
    // Check for errors first (on any page)
    const pageError = await this.checkForErrors(page);
    if (pageError) {
      throw new Error(pageError);
    }

    // If the page text hasn't changed meaningfully, report the actual portal text
    const textChanged = Math.abs(textAfterSubmit.length - textBeforeSubmit.length) > 50 ||
                        textAfterSubmit !== textBeforeSubmit;
    if (!textChanged) {
      const portalText = textAfterSubmit.trim().substring(0, 400) || 
        `Form submitted but portal did not respond. URL: ${resultUrl}`;
      throw new Error(`${this.profile.name} portal response: ${portalText}`);
    }
    
    logger.info('Form submitted, checking for results', { textChanged, resultUrl });

    // Check if we have results by looking for subject/grade content
    const hasResults = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Subject') || bodyText.includes('SUBJECT') || 
             bodyText.includes('Grade') || bodyText.includes('GRADE');
    });

    if (!hasResults) {
      throw new Error('No results found for this candidate');
    }

    // Extract candidate info before clicking print
    const candidateName = await this.extractCandidateName(page);
    const subjects = await this.extractSubjects(page);
    
    logger.info('Results found', { candidateName, subjectCount: subjects.length });

    let pdfBase64: string | undefined;
    
    // Click NECO's "Print result" button to navigate to the official print view
    try {
      const printClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          if (text === 'print' || text === 'print result') {
            (btn as HTMLElement).click();
            return true;
          }
        }
        // Fallback: any button containing "print"
        for (const btn of buttons) {
          if ((btn.textContent || '').toLowerCase().includes('print')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (printClicked) {
        logger.info('Clicked NECO print button — waiting for print view to load');
        // Wait for navigation to the print view page, or content change
        try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }),
            this.sleep(3000),
          ]);
        } catch { /* navigation may not fire if it's SPA */ }
        await this.sleep(800);
      }
    } catch (e) {
      logger.warn('Could not click print button', { error: (e as Error).message });
    }

    // Generate PDF — trust NECO's own print CSS (matches browser print at 100% scale)
    try {
      await page.emulateMediaType('print');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: false,
        scale: 1.0,
      });

      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      logger.info('Official NECO PDF generated (A4, 100% scale)', { size: pdfBuffer.length });

      await page.emulateMediaType('screen');
    } catch (e) {
      logger.warn('Failed to generate PDF', { error: (e as Error).message });
    }

    if (!pdfBase64) {
      throw new Error('Failed to generate result PDF');
    }

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType,
      examYear: data.examYear,
      subjects,
      verificationStatus: 'verified',
      message: `${this.profile.name} result retrieved successfully`,
      pdfBase64,
      isOfficialPdf: true,
    };

    } finally {
      // Clean up: remove named response handler so the pooled page is clean for the next job
      page.off('response', responseHandler);
    }
  }

  private async selectExamYear(page: Page, examYear: number): Promise<void> {
    if (!examYear) return;
    
    try {
      const yearStr = examYear.toString();
      const result = await page.evaluate((year) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const allYears: string[] = [];
        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));
          for (const option of options) {
            allYears.push(option.value || option.textContent?.trim() || '');
            if (option.value === year || option.textContent?.includes(year)) {
              (select as HTMLSelectElement).value = option.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.dispatchEvent(new Event('input', { bubbles: true }));
              return { found: true, selectedValue: option.value, availableYears: allYears };
            }
          }
        }
        return { found: false, availableYears: allYears };
      }, yearStr);
      if (result.found) {
        logger.info('Selected exam year', { year: examYear, value: result.selectedValue });
      } else {
        logger.warn('Exam year not found in dropdown — year may not be released yet', { 
          year: examYear, 
          availableYears: result.availableYears.filter(y => y).slice(0, 20)
        });
      }
    } catch (e: any) {
      logger.warn('Could not select exam year', { error: e.message });
    }
  }

  private async selectExamType(page: Page, examType: string): Promise<void> {
    const normalized = this.profile.examTypeNormalizer(examType);
    
    try {
      await page.evaluate((isInternal, provider) => {
        const selects = Array.from(document.querySelectorAll('select'));
        
        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));
          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const optText = (option.textContent || '').toLowerCase();
            const optValue = (option.value || '').toLowerCase();
            
            let isMatch = false;
            
            if (provider === 'neco') {
              if (isInternal) {
                isMatch = optText.includes('internal') || optText.includes('school') || optValue.includes('int');
              } else {
                isMatch = optText.includes('external') || optText.includes('private') || optText.includes('gce') || optValue.includes('ext');
              }
            } else if (provider === 'waec') {
              if (isInternal) {
                isMatch = optText.includes('wassce') || optText.includes('school') || optValue.includes('school') || optValue === '1';
              } else {
                isMatch = optText.includes('gce') || optText.includes('private') || optValue === '2';
              }
            } else {
              if (isInternal) {
                isMatch = !optText.includes('gce') && !optText.includes('private');
              } else {
                isMatch = optText.includes('gce') || optText.includes('private');
              }
            }
            
            if (isMatch) {
              (select as HTMLSelectElement).selectedIndex = i;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.dispatchEvent(new Event('input', { bubbles: true }));
              return { success: true, text: option.textContent };
            }
          }
        }
        return { success: false };
      }, normalized.isInternal, this.provider);
      
      await this.sleep(200);
    } catch (e: any) {
      logger.warn('Error selecting exam type', { error: e.message });
    }
  }

  private parseSelectors(selectorString: string | undefined): string[] {
    if (!selectorString) return [];
    return selectorString.split(/,\s*/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private async fillRegistrationNumber(page: Page, regNumber: string, selectors: Record<string, string>): Promise<void> {
    const selectorList = this.parseSelectors(selectors.examNumberInput);
    
    for (const selector of selectorList) {
      try {
        const filled = await this.setInputValue(page, selector, regNumber);
        if (filled) {
          logger.info('Entered registration number', { selector, value: regNumber });
          return;
        }
      } catch { continue; }
    }
    
    // Last-resort fallback: pick the last visible input on the page (usually the reg number field)
    const lastInput = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const visible = inputs.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && (el as HTMLInputElement).type !== 'hidden';
      });
      const last = visible[visible.length - 1];
      return last ? (last.name || last.id || last.placeholder || '__last__') : null;
    });
    if (lastInput) {
      const fallbackSel = lastInput === '__last__'
        ? 'input:not([type="hidden"]):last-of-type'
        : `input[name="${lastInput}"], input[id="${lastInput}"]`;
      await this.setInputValue(page, fallbackSel, regNumber);
      logger.info('Used fallback for registration number', { value: regNumber, fallback: lastInput });
    } else {
      throw new Error('Could not find registration number input field');
    }
  }

  // Sets an input's value reliably: focus, clear, type with delay, then verify.
  // If the typed value doesn't stick (portal overrides it), falls back to native
  // DOM setter + synthetic events so React/Vue state is also updated.
  private async setInputValue(page: Page, selector: string, value: string): Promise<boolean> {
    const input = await page.$(selector);
    if (!input) return false;

    // Focus the field and select all existing content
    await input.focus();
    await this.sleep(100);
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await this.sleep(100);

    // Type character-by-character at 40ms/char so portal JS handlers fire naturally
    await input.type(value, { delay: 40 });
    await this.sleep(150);

    // Read back to verify the value stuck
    const actual = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      return el ? el.value : null;
    }, selector);

    if (actual === value) return true;

    // Value didn't stick — use native prototype setter as fallback (React/Vue compatible)
    logger.warn(`Physical typing did not stick for ${selector}`, { expected: value, actual });
    await page.evaluate((sel: string, val: string) => {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (nativeSetter?.set) nativeSetter.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, value);

    return true;
  }

  private async fillField(page: Page, selectorString: string, value: string, fieldName: string): Promise<void> {
    const selectorList = this.parseSelectors(selectorString);
    
    for (const selector of selectorList) {
      try {
        const filled = await this.setInputValue(page, selector, value);
        if (filled) {
          logger.info(`Entered ${fieldName}`, { selector, value });
          return;
        }
      } catch { continue; }
    }
    
    logger.warn(`Could not find ${fieldName} input field`);
  }

  private async selectByText(page: Page, selectorString: string, value: string, fieldName: string): Promise<void> {
    const selectorList = this.parseSelectors(selectorString);
    const valueLower = value.toLowerCase();

    for (const selector of selectorList) {
      try {
        const selected = await page.evaluate((sel: string, val: string) => {
          const el = document.querySelector(sel) as HTMLSelectElement | null;
          if (!el) return false;
          const options = Array.from(el.querySelectorAll('option'));
          for (let i = 0; i < options.length; i++) {
            const text = (options[i].textContent || '').toLowerCase();
            const optVal = (options[i].value || '').toLowerCase();
            if (text.includes(val) || optVal.includes(val)) {
              el.selectedIndex = i;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            }
          }
          return false;
        }, selector, valueLower);

        if (selected) {
          logger.info(`Selected ${fieldName}`, { selector, value });
          return;
        }
      } catch { continue; }
    }

    logger.warn(`Could not select ${fieldName} option`, { value });
  }

  private async handleNecoConfirmation(page: Page): Promise<boolean> {
    // NECO shows a confirmation popup with "Proceed" and "Cancel" buttons
    try {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        
        // Look for "Proceed" button in confirmation dialog
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          if (text === 'proceed' || text === 'confirm' || text === 'yes') {
            (btn as HTMLElement).click();
            console.log('Clicked confirmation button:', btn.textContent);
            return true;
          }
        }
        
        // Also check for links styled as buttons
        const links = Array.from(document.querySelectorAll('a'));
        for (const link of links) {
          const text = (link.textContent || '').trim().toLowerCase();
          if (text === 'proceed' || text === 'confirm') {
            (link as HTMLElement).click();
            return true;
          }
        }
        
        return false;
      });
      
      if (clicked) {
        await this.sleep(800);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async submitForm(page: Page): Promise<void> {
    const submitSelectors = [
      'button#btnSubmit', 'input#btnSubmit',
      'input[value*="Check"]', 'input[value*="Submit"]',
      'button[type="submit"]', 'input[type="submit"]',
      '.btn-success', '.btn-primary'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          logger.info('Clicked submit button', { selector });
          return;
        }
      } catch { continue; }
    }

    // For SPAs like NECO - find button by text content with flexible matching
    const clicked = await page.evaluate(() => {
      // First try to find buttons with exact text patterns
      const allButtons = Array.from(document.querySelectorAll('button'));
      
      // Look for "Check Result" button specifically (NECO)
      for (const btn of allButtons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (text === 'check result' || text === 'check my result') {
          (btn as HTMLElement).click();
          console.log('Clicked button with text:', btn.textContent);
          return true;
        }
      }
      
      // Look for buttons containing check/submit keywords
      for (const btn of allButtons) {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('check') || text.includes('submit') || text.includes('verify')) {
          (btn as HTMLElement).click();
          console.log('Clicked button with text:', btn.textContent);
          return true;
        }
      }
      
      // Try input buttons as fallback
      const inputButtons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"]'));
      for (const btn of inputButtons) {
        const value = ((btn as HTMLInputElement).value || '').toLowerCase();
        if (value.includes('check') || value.includes('submit')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      
      return false;
    });
    
    if (clicked) {
      logger.info('Clicked submit button via page.evaluate');
    } else {
      throw new Error(`Could not find submit button on ${this.profile.name} portal`);
    }
  }

  private isStillOnFormPage(currentUrl: string, originalUrl: string): boolean {
    if (currentUrl === originalUrl) return true;
    
    const provider = this.provider;
    if (provider === 'neco' && currentUrl.includes('results.neco.gov.ng')) {
      return currentUrl.endsWith('/') || currentUrl.includes('home') || currentUrl.includes('token');
    }
    if (provider === 'waec' && currentUrl.includes('waecdirect.org')) {
      return !currentUrl.includes('Result') && !currentUrl.includes('Error');
    }
    
    return false;
  }

  private async checkForErrors(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      const errSelectors = [
        '.alert-danger', '.error', '.text-danger', '#lblError',
        '.validation-summary-errors', '.errorMessage', '[class*="error"]'
      ];
      
      for (const sel of errSelectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of Array.from(elements)) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && el.textContent?.trim()) {
            return el.textContent.trim();
          }
        }
      }
      
      const bodyText = document.body.innerText;
      const errorKeywords = ['Invalid', 'Incorrect', 'Expired', 'Used', 'Wrong', 'Not Found'];
      for (const kw of errorKeywords) {
        if (bodyText.includes(kw) && bodyText.length < 500) {
          return bodyText.trim();
        }
      }
      
      return null;
    });
  }

  /** NABTEB-specific error detection on results.asp after form submission */
  private async checkNabtebErrors(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      const errorKeywords = [
        'invalid', 'incorrect', 'wrong', 'expired', 'used', 'not found',
        'no record', 'not exist', 'error', 'failed', 'denied', 'access'
      ];
      // Check styled error elements first
      const errEls = document.querySelectorAll(
        '.alert-danger,.alert-error,.error,.text-danger,.alert-warning,.errormessage,#error,#lblError,font[color="red"],font[color="#ff0000"]'
      );
      for (const el of Array.from(errEls)) {
        const t = (el as HTMLElement).innerText?.trim();
        if (t && t.length > 3) return t;
      }
      // Scan all leaf text nodes for error keywords
      const allEls = document.querySelectorAll('p, h1, h2, h3, h4, h5, td, li, div, span, b, strong');
      for (const el of Array.from(allEls)) {
        if (el.children.length > 0) continue;
        const t = (el as HTMLElement).innerText?.trim() || '';
        if (!t || t.length < 5 || t.length > 350) continue;
        const low = t.toLowerCase();
        if (errorKeywords.some(k => low.includes(k))) return t;
      }
      return null;
    });
  }

  /** NBAIS-specific error detection — covers "invalid card", "limit exceeded", "used", etc. */
  private async checkNbaisErrors(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      const errorKeywords = [
        'invalid', 'incorrect', 'wrong', 'expired', 'used', 'limit exceed',
        'card limit', 'exhausted', 'not found', 'no record', 'error',
        'failed', 'denied', 'cannot be used', 'already used', 'pin error'
      ];
      // Check styled error elements first
      const errEls = document.querySelectorAll(
        '.alert-danger,.alert-error,.error,.text-danger,.alert-warning,.errormessage,#error'
      );
      for (const el of Array.from(errEls)) {
        const t = (el as HTMLElement).innerText?.trim();
        if (t && t.length > 3) return t;
      }
      // Scan all leaf text nodes for error keywords (NBAIS may use plain paragraphs)
      const allEls = document.querySelectorAll('p, h1, h2, h3, h4, h5, td, li, div, span, b, strong, font');
      for (const el of Array.from(allEls)) {
        if (el.children.length > 0) continue;
        const t = (el as HTMLElement).innerText?.trim() || '';
        if (!t || t.length < 5 || t.length > 350) continue;
        const low = t.toLowerCase();
        if (errorKeywords.some(k => low.includes(k))) return t;
      }
      return null;
    });
  }

  private async extractSubjects(page: Page): Promise<ExamSubject[]> {
    try {
      return await page.evaluate(() => {
        const subjects: { subject: string; grade: string }[] = [];
        const rows = document.querySelectorAll('table tbody tr, table tr');
        
        for (const row of Array.from(rows)) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            // NECO format: S/N | SUBJECT | GRADE | REMARK
            // WAEC format: SUBJECT | GRADE
            const firstCell = cells[0]?.textContent?.trim() || '';
            
            let subject = '';
            let grade = '';
            
            // If first cell is a number (S/N), subject is in second cell
            if (/^\d+$/.test(firstCell)) {
              subject = cells[1]?.textContent?.trim() || '';
              grade = cells[2]?.textContent?.trim() || '';
            } else {
              // Standard format: subject in first cell
              subject = firstCell;
              grade = cells[1]?.textContent?.trim() || '';
            }
            
            // Validate: subject should be text, grade should be short (like A1, B2, C4, D7, E8, F9)
            if (subject && grade && 
                subject.length > 2 && 
                grade.length <= 3 &&
                !/^(S\/N|SUBJECT|GRADE|REMARK)$/i.test(subject)) {
              subjects.push({ subject, grade });
            }
          } else if (cells.length === 2) {
            // Fallback for 2-column tables
            const subject = cells[0]?.textContent?.trim() || '';
            const grade = cells[1]?.textContent?.trim() || '';
            
            if (subject && grade && subject.length > 2 && grade.length <= 3) {
              subjects.push({ subject, grade });
            }
          }
        }
        return subjects;
      });
    } catch {
      return [];
    }
  }

  private async extractCandidateName(page: Page): Promise<string | undefined> {
    try {
      return await page.evaluate(() => {
        const nameSelectors = ['.candidate-name', '#candidateName', '.name'];
        for (const sel of nameSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        
        const text = document.body.innerText;
        const nameMatch = text.match(/(?:Candidate\s+)?Name[:\s]+([A-Z][A-Za-z ]{2,50})/m);
        return nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : undefined;
      });
    } catch {
      return undefined;
    }
  }
}

export class EducationWorkerFactory {
  private static workers: Map<string, EducationWorker> = new Map();

  static getWorker(provider: string): EducationWorker {
    const key = provider.toLowerCase();
    
    if (!this.workers.has(key)) {
      this.workers.set(key, new EducationWorker(key));
    }
    
    return this.workers.get(key)!;
  }

  static getSupportedProviders(): string[] {
    return Object.keys(PROVIDER_PROFILES);
  }

  static isSupported(provider: string): boolean {
    return provider.toLowerCase() in PROVIDER_PROFILES;
  }

  static getProfile(provider: string): ProviderProfile | undefined {
    return PROVIDER_PROFILES[provider.toLowerCase()];
  }

  static async validateConfiguration(provider: string): Promise<{ valid: boolean; error?: string }> {
    const profile = PROVIDER_PROFILES[provider.toLowerCase()];
    if (!profile) {
      return { valid: false, error: `Unknown provider: ${provider}` };
    }

    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, profile.settingsKey))
        .limit(1);

      if (!setting?.settingValue) {
        return { valid: false, error: `${profile.name} portal URL not configured in admin settings` };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Failed to validate configuration: ${error.message}` };
    }
  }
}

export const waecWorker = EducationWorkerFactory.getWorker('waec');
export const necoWorker = EducationWorkerFactory.getWorker('neco');
export const nabtebWorker = EducationWorkerFactory.getWorker('nabteb');
export const nbaisWorker = EducationWorkerFactory.getWorker('nbais');
