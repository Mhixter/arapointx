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
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 45000;
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
      await this.sleep(1000);

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

  private async performVerification(
    page: Page,
    portalUrl: string,
    data: EducationQueryData,
    selectors: Record<string, string>
  ): Promise<ExamResult> {
    logger.info(`Navigating to ${this.profile.name} portal`, { url: portalUrl });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await this.sleep(2000);
    await this.closePrivacyPopup(page);

    try {
      await page.waitForSelector('form, input, select', { timeout: 10000 });
    } catch {
      throw new Error(`Could not find form on ${this.profile.name} portal. The page may have changed.`);
    }

    logger.info(`Filling ${this.profile.name} form fields`);

    await this.selectExamYear(page, data.examYear);
    await this.selectExamType(page, data.examType || this.profile.defaultExamType);
    await this.fillRegistrationNumber(page, data.registrationNumber, selectors);
    
    if (data.cardSerialNumber) {
      await this.fillField(page, selectors.serialInput, data.cardSerialNumber, 'serial number');
    }
    
    if (data.cardPin) {
      const pinOrTokenSelector = this.provider === 'neco' ? selectors.tokenInput : selectors.pinInput;
      await this.fillField(page, pinOrTokenSelector, data.cardPin, 'PIN/token');
    }

    await this.sleep(1000);
    logger.info(`Submitting ${this.profile.name} form`);
    
    page.on('dialog', async (dialog) => {
      logger.info('Dialog appeared', { message: dialog.message() });
      await dialog.accept();
    });

    const urlBeforeSubmit = page.url();
    await this.submitForm(page);
    
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch {}
    
    await this.sleep(3000);

    const resultUrl = page.url();
    if (this.isStillOnFormPage(resultUrl, urlBeforeSubmit)) {
      const pageError = await this.checkForErrors(page);
      if (pageError) {
        throw new Error(pageError);
      }
      throw new Error(`Could not submit form to ${this.profile.name} portal. Please verify your details.`);
    }

    let screenshotBase64: string | undefined;
    try {
      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
      screenshotBase64 = screenshotBuffer.toString('base64');
    } catch {}

    const subjects = await this.extractSubjects(page);
    const candidateName = await this.extractCandidateName(page);

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType,
      examYear: data.examYear,
      subjects,
      verificationStatus: subjects.length > 0 ? 'verified' : 'not_found',
      message: subjects.length > 0 ? `${this.profile.name} result retrieved successfully` : 'No results found for this candidate',
      screenshotBase64,
    };
  }

  private async selectExamYear(page: Page, examYear: number): Promise<void> {
    if (!examYear) return;
    
    try {
      const yearStr = examYear.toString();
      await page.evaluate((year) => {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));
          for (const option of options) {
            if (option.value === year || option.textContent?.includes(year)) {
              (select as HTMLSelectElement).value = option.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
          }
        }
      }, yearStr);
      logger.info('Selected exam year', { year: examYear });
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
      
      await this.sleep(500);
    } catch (e: any) {
      logger.warn('Error selecting exam type', { error: e.message });
    }
  }

  private async fillRegistrationNumber(page: Page, regNumber: string, selectors: Record<string, string>): Promise<void> {
    const selectorList = selectors.examNumberInput?.split(', ') || [];
    
    for (const selector of selectorList) {
      try {
        const input = await page.$(selector);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(regNumber);
          logger.info('Entered registration number', { selector });
          return;
        }
      } catch { continue; }
    }
    
    const textInputs = await page.$$('input[type="text"]');
    if (textInputs.length > 0) {
      await textInputs[0].type(regNumber);
      logger.info('Used fallback for registration number');
    } else {
      throw new Error('Could not find registration number input field');
    }
  }

  private async fillField(page: Page, selectorString: string, value: string, fieldName: string): Promise<void> {
    const selectorList = selectorString?.split(', ') || [];
    
    for (const selector of selectorList) {
      try {
        const input = await page.$(selector);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(value);
          logger.info(`Entered ${fieldName}`, { selector });
          return;
        }
      } catch { continue; }
    }
    
    logger.warn(`Could not find ${fieldName} input field`);
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
          return;
        }
      } catch { continue; }
    }

    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
      for (const btn of buttons) {
        const text = (btn.textContent || '').toLowerCase();
        const value = ((btn as HTMLInputElement).value || '').toLowerCase();
        if (text.includes('check') || text.includes('submit') || value.includes('check') || value.includes('submit')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    
    if (!clicked) {
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
          if (cells.length >= 2) {
            const subject = cells[0]?.textContent?.trim() || '';
            const grade = cells[cells.length - 1]?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
            
            if (subject && grade && subject.length > 1 && grade.length <= 3) {
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
}

export const waecWorker = EducationWorkerFactory.getWorker('waec');
export const necoWorker = EducationWorkerFactory.getWorker('neco');
export const nabtebWorker = EducationWorkerFactory.getWorker('nabteb');
export const nbaisWorker = EducationWorkerFactory.getWorker('nbais');
