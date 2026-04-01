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
      examYearSelect: 'select[name="ExamYear"], select#ExamYear',
      examTypeSelect: 'select[name="ExamType"], select#ExamType',
      examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[name="CandNo"], input[placeholder*="Registration"]',
      serialInput: 'input[name="SerialNumber"], input#SerialNumber',
      pinInput: 'input[name="Pin"], input#Pin, input[type="password"]',
      tokenInput: 'input[name="token"], input#token',
    },
    examTypeNormalizer: (examType: string) => {
      const t = examType.toLowerCase();
      return { isInternal: !t.includes('gce') && !t.includes('private') };
    },
    defaultExamType: 'NBC/NTC',
    usesToken: false,
    requiresSerial: true,
  },
  nbais: {
    name: 'NBAIS',
    settingsKey: 'rpa_provider_url_mbais',
    selectors: {
      examYearSelect: 'select[name="ExamYear"], select#ExamYear',
      examTypeSelect: 'select[name="ExamType"], select#ExamType',
      examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[placeholder*="Registration"]',
      serialInput: 'input[name="SerialNumber"], input#SerialNumber',
      pinInput: 'input[name="Pin"], input#Pin, input[type="password"]',
      tokenInput: 'input[name="token"], input#token',
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

      const result = await Promise.race([
        this.performVerification(page, portalUrl, data, selectors),
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
    const candidateName: string =
      apiBody?.data?.candidate?.name || apiBody?.candidate?.name || apiBody?.name || apiBody?.candidateName || '';
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
        const nameMatch = text.match(/Name[:\s]+([A-Z][A-Za-z\s]+)/);
        return nameMatch ? nameMatch[1].trim() : undefined;
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
