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

    await this.sleep(1000);
    logger.info(`Submitting ${this.profile.name} form`);
    
    page.on('dialog', async (dialog) => {
      logger.info('Dialog appeared', { message: dialog.message() });
      await dialog.accept();
    });

    const urlBeforeSubmit = page.url();
    const htmlBeforeSubmit = await page.content();
    
    await this.submitForm(page);
    
    // NECO shows a confirmation dialog - need to click "Proceed"
    await this.sleep(1000);
    const hasConfirmation = await this.handleNecoConfirmation(page);
    if (hasConfirmation) {
      logger.info('NECO confirmation dialog handled, clicked Proceed');
    }
    
    // Wait for either navigation or content change (for SPAs)
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        page.waitForFunction(() => {
          // Check for result content appearing
          const hasTable = document.querySelector('table');
          const hasResultText = document.body.innerText.includes('Subject') || 
                                document.body.innerText.includes('Grade') ||
                                document.body.innerText.includes('Score');
          const hasError = document.body.innerText.includes('Invalid') || 
                           document.body.innerText.includes('Expired') ||
                           document.body.innerText.includes('Used');
          return hasTable || hasResultText || hasError;
        }, { timeout: 15000 })
      ]);
    } catch {
      logger.info('No navigation or content change detected within timeout');
    }
    
    await this.sleep(3000);

    const resultUrl = page.url();
    const htmlAfterSubmit = await page.content();
    const contentChanged = htmlBeforeSubmit !== htmlAfterSubmit;
    
    // Check for errors first (on any page)
    const pageError = await this.checkForErrors(page);
    if (pageError) {
      throw new Error(pageError);
    }
    
    // For SPAs like NECO, check if content changed even if URL stayed the same
    if (this.isStillOnFormPage(resultUrl, urlBeforeSubmit) && !contentChanged) {
      throw new Error(`Could not submit form to ${this.profile.name} portal. Please verify your details.`);
    }
    
    logger.info('Form submitted, checking for results', { contentChanged, urlChanged: resultUrl !== urlBeforeSubmit });

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
    
    // Click NECO's "Print result" or "Print" button to get the official print view
    try {
      const printClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          if (text.includes('print')) {
            (btn as HTMLElement).click();
            console.log('Clicked print button:', btn.textContent);
            return true;
          }
        }
        return false;
      });

      if (printClicked) {
        logger.info('Clicked NECO print button');
        await this.sleep(2000); // Wait for print view to load
      }
    } catch (e) {
      logger.warn('Could not click print button', { error: (e as Error).message });
    }

    // Generate PDF of the official NECO result page
    try {
      // Use emulateMediaType to ensure we get print styles
      await page.emulateMediaType('print');
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        preferCSSPageSize: true
      });
      // Convert Uint8Array to proper base64 string using Buffer
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      logger.info('Official NECO PDF generated successfully', { size: pdfBuffer.length });
      
      // Reset media type
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

  private parseSelectors(selectorString: string | undefined): string[] {
    if (!selectorString) return [];
    return selectorString.split(/,\s*/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private async fillRegistrationNumber(page: Page, regNumber: string, selectors: Record<string, string>): Promise<void> {
    const selectorList = this.parseSelectors(selectors.examNumberInput);
    
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
    const selectorList = this.parseSelectors(selectorString);
    
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
        await this.sleep(2000); // Wait for dialog to process
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
