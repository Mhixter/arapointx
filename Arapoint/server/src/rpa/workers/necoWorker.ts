import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { browserPool } from '../browserPool';
import { config } from '../../config/env';

interface NECOQueryData {
  registrationNumber: string;
  examYear: number;
  examType?: string;
  cardPin?: string;
}

interface NECOSubject {
  subject: string;
  grade: string;
}

interface NECOResult {
  registrationNumber: string;
  candidateName?: string;
  examType?: string;
  examYear?: number;
  subjects: NECOSubject[];
  verificationStatus: 'verified' | 'not_found' | 'error';
  message: string;
  errorMessage?: string;
  screenshotBase64?: string;
}

export class NECOWorker extends BaseWorker {
  protected serviceName = 'neco_service';

  private readonly DEFAULT_SELECTORS = {
    examYearSelect: 'select[name="ExamYear"], select#ExamYear, select[name="exam_year"], select#year',
    examTypeSelect: 'select[name="ExamType"], select#ExamType, select[name="exam_type"], select#examType',
    examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[name="CandNo"], input#CandNo, input[name="registrationNumber"], input[placeholder*="Registration"], input[placeholder*="Examination"]',
    tokenInput: 'input[name="token"], input#token, input#tokenCode, input[name="Token"], input[placeholder*="Token"]',
    resultTable: 'table, .result-table, #resultTable',
    candidateName: '.candidate-name, .name, #candidateName',
    errorMessage: '.alert-danger, .error-message, #lblError, .text-danger',
    subjectRow: 'tbody tr',
  };

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as NECOQueryData & { portalUrl?: string };
    logger.info('NECO Worker starting job', { 
      registrationNumber: data.registrationNumber,
      examYear: data.examYear 
    });

    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 45000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const portalUrl = data.portalUrl || await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult('NECO portal URL not configured. Please configure in admin settings.');
      }

      const customSelectors = await this.getCustomSelectors();
      const selectors = { ...this.DEFAULT_SELECTORS, ...customSelectors };

      pooledResource = await browserPool.acquire();
      if (!pooledResource) {
        return this.createErrorResult('No available browser. System is at capacity, please try again.');
      }

      const { page } = pooledResource;
      logger.info('NECO Worker acquired browser from pool');

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
      logger.error('NECO Worker error', { error: error.message });
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
        .where(eq(adminSettings.settingKey, 'rpa_provider_url_neco'))
        .limit(1);

      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error('Failed to get NECO portal URL', { error: error.message });
      return null;
    }
  }

  private async getCustomSelectors(): Promise<Record<string, string>> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'rpa_selectors_neco'))
        .limit(1);

      if (setting?.settingValue) {
        return JSON.parse(setting.settingValue);
      }
      return {};
    } catch (error: any) {
      logger.warn('Failed to get custom NECO selectors', { error: error.message });
      return {};
    }
  }

  private async closePrivacyPopup(page: Page): Promise<void> {
    logger.info('Checking for NECO privacy/data instruction popup');
    
    try {
      await this.sleep(1000);

      const hasPopup = await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, .popup, .overlay, [role="dialog"], .swal2-container');
        for (const modal of Array.from(modals)) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
        return false;
      });

      if (hasPopup) {
        logger.info('Popup detected, attempting to close');
        
        const closed = await page.evaluate(() => {
          const closeSelectors = [
            'button.close', '.modal .close', '[data-dismiss="modal"]',
            'button[aria-label="Close"]', '.btn-close', '.swal2-confirm'
          ];
          
          for (const sel of closeSelectors) {
            const btn = document.querySelector(sel);
            if (btn) {
              (btn as HTMLElement).click();
              return true;
            }
          }
          
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const text = btn.textContent?.toLowerCase() || '';
            if (text.includes('close') || text.includes('ok') || text.includes('accept')) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (closed) {
          await this.sleep(500);
        } else {
          await page.keyboard.press('Escape');
          await this.sleep(300);
        }
      }
    } catch (error: any) {
      logger.warn('Error handling popup', { error: error.message });
    }
  }

  private async performVerification(
    page: Page,
    portalUrl: string,
    data: NECOQueryData,
    selectors: Record<string, string>
  ): Promise<NECOResult> {
    logger.info('Navigating to NECO portal', { url: portalUrl });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await this.sleep(2000);
    await this.closePrivacyPopup(page);

    try {
      await page.waitForSelector('form, input, select', { timeout: 10000 });
    } catch {
      throw new Error('Could not find form on NECO portal. The page may have changed.');
    }

    logger.info('Filling NECO form fields');

    try {
      const yearStr = data.examYear ? data.examYear.toString() : '';
      if (yearStr) {
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
        logger.info('Selected exam year', { year: data.examYear });
      }
    } catch (e: any) {
      logger.warn('Could not select exam year', { error: e.message });
    }

    const examTypeToSelect = data.examType || 'school_candidate';
    logger.info('Attempting to select exam type', { requestedType: examTypeToSelect });
    
    try {
      await page.evaluate((examType) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const target = examType.toLowerCase();
        
        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));
          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const optText = (option.textContent || '').toLowerCase().trim();
            const optValue = (option.value || '').toLowerCase().trim();
            
            let isMatch = false;
            if (target === 'school_candidate' || target.includes('internal')) {
              isMatch = optText.includes('internal') || optText.includes('school') || 
                        optValue.includes('int') || optValue.includes('ssce_int') ||
                        optText.includes('ssce (internal)');
            } else if (target === 'private_candidate' || target.includes('private') || target.includes('gce')) {
              isMatch = optText.includes('private') || optText.includes('gce') || 
                        optText.includes('external') || optValue.includes('ext') ||
                        optText.includes('ssce (external)');
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
      }, examTypeToSelect);
    } catch (e: any) {
      logger.warn('Error selecting exam type', { error: e.message });
    }
    
    await this.sleep(500);

    let regNumberEntered = false;
    const regSelectors = selectors.examNumberInput.split(', ');
    for (const selector of regSelectors) {
      try {
        const input = await page.$(selector);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(data.registrationNumber);
          regNumberEntered = true;
          logger.info('Entered registration number', { selector });
          break;
        }
      } catch { continue; }
    }
    
    if (!regNumberEntered) {
      const textInputs = await page.$$('input[type="text"]');
      if (textInputs.length > 0) {
        await textInputs[0].type(data.registrationNumber);
        regNumberEntered = true;
      } else {
        throw new Error('Could not find registration number input field');
      }
    }

    if (data.cardPin) {
      let tokenEntered = false;
      const tokenSelectors = selectors.tokenInput.split(', ');
      for (const selector of tokenSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.click({ clickCount: 3 });
            await input.type(data.cardPin);
            tokenEntered = true;
            logger.info('Entered token', { selector });
            break;
          }
        } catch { continue; }
      }
      
      if (!tokenEntered) {
        const allInputs = await page.$$('input[type="text"], input[type="password"]');
        for (const input of allInputs) {
          const placeholder = await input.evaluate(el => (el as HTMLInputElement).placeholder?.toLowerCase() || '');
          const name = await input.evaluate(el => (el as HTMLInputElement).name?.toLowerCase() || '');
          if (placeholder.includes('token') || name.includes('token') || placeholder.includes('pin') || name.includes('pin')) {
            await input.type(data.cardPin);
            tokenEntered = true;
            break;
          }
        }
      }
    }

    await this.sleep(1000);
    logger.info('Submitting NECO form');
    
    page.on('dialog', async (dialog) => {
      logger.info('Dialog appeared', { message: dialog.message() });
      await dialog.accept();
    });

    const urlBeforeSubmit = page.url();
    
    let submitButton = null;
    const submitSelectors = [
      'button#btnSubmit', 'input#btnSubmit', 
      'input[value*="Check"]', 'button[type="submit"]', 'input[type="submit"]',
      '.btn-success', '.btn-primary'
    ];
    
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }

    if (!submitButton) {
      submitButton = await page.evaluate(() => {
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
      
      if (!submitButton) {
        throw new Error('Could not find submit button on NECO portal');
      }
    } else {
      await submitButton.click();
    }

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch {}
    
    await this.sleep(3000);

    const resultUrl = page.url();
    const isStillOnFormPage = resultUrl === urlBeforeSubmit || 
                              resultUrl.includes('results.neco.gov.ng') && (resultUrl.endsWith('/') || resultUrl.includes('home'));

    if (isStillOnFormPage) {
      const pageError = await page.evaluate(() => {
        const errSelectors = ['.alert-danger', '.error', '.text-danger', '#lblError', '.errorMessage'];
        for (const sel of errSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent?.trim()) return el.textContent.trim();
        }
        return null;
      });
      
      if (pageError) {
        throw new Error(pageError);
      }
      throw new Error('Could not submit form to NECO portal. Please verify your details and try again.');
    }

    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    const hasResults = pageContent.includes('Subject') || pageContent.includes('Grade') || 
                       pageContent.includes('RESULT') || pageContent.includes('ENGLISH') || 
                       pageContent.includes('MATHEMATICS');

    if (!hasResults) {
      const errorOnPage = await page.evaluate(() => {
        const text = document.body.innerText;
        if (text.includes('Invalid') || text.includes('not found') || text.includes('Expired') || text.includes('Used')) {
          return text.substring(0, 300);
        }
        return null;
      });
      
      if (errorOnPage) {
        throw new Error(errorOnPage);
      }
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
      message: subjects.length > 0 ? 'NECO result retrieved successfully' : 'No results found for this candidate',
      screenshotBase64,
    };
  }

  private async extractSubjects(page: Page): Promise<NECOSubject[]> {
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

export const necoWorker = new NECOWorker();
