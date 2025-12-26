import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { browserPool } from '../browserPool';
import { config } from '../../config/env';

interface NBAISQueryData {
  registrationNumber: string;
  examYear: number;
  examType?: string;
  cardSerialNumber?: string;
  cardPin?: string;
}

interface NBAISSubject {
  subject: string;
  grade: string;
}

interface NBAISResult {
  registrationNumber: string;
  candidateName?: string;
  examType?: string;
  examYear?: number;
  subjects: NBAISSubject[];
  verificationStatus: 'verified' | 'not_found' | 'error';
  message: string;
  errorMessage?: string;
  screenshotBase64?: string;
}

export class NBAISWorker extends BaseWorker {
  protected serviceName = 'nbais_service';

  private readonly DEFAULT_SELECTORS = {
    examYearSelect: 'select[name="ExamYear"], select#ExamYear, select[name="exam_year"], select#year',
    examTypeSelect: 'select[name="ExamType"], select#ExamType',
    examNumberInput: 'input[name="ExamNumber"], input#ExamNumber, input[name="CandNo"], input#CandNo, input[name="registrationNumber"], input[placeholder*="Registration"]',
    cardSerialInput: 'input[name="SerialNumber"], input#SerialNumber, input[name="Serial"]',
    cardPinInput: 'input[name="Pin"], input#Pin, input[name="PIN"], input[type="password"]',
    resultTable: 'table, .result-table',
    candidateName: '.candidate-name, .name',
    errorMessage: '.alert-danger, .error-message, #lblError',
    subjectRow: 'tbody tr',
  };

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as NBAISQueryData & { portalUrl?: string };
    logger.info('NBAIS/MBAIS Worker starting job', { 
      registrationNumber: data.registrationNumber,
      examYear: data.examYear 
    });

    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 45000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const portalUrl = data.portalUrl || await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult('NBAIS/MBAIS portal URL not configured. Please configure in admin settings.');
      }

      const customSelectors = await this.getCustomSelectors();
      const selectors = { ...this.DEFAULT_SELECTORS, ...customSelectors };

      pooledResource = await browserPool.acquire();
      if (!pooledResource) {
        return this.createErrorResult('No available browser. System is at capacity, please try again.');
      }

      const { page } = pooledResource;
      logger.info('NBAIS Worker acquired browser from pool');

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
      logger.error('NBAIS Worker error', { error: error.message });
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
        .where(eq(adminSettings.settingKey, 'rpa_provider_url_mbais'))
        .limit(1);

      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error('Failed to get NBAIS portal URL', { error: error.message });
      return null;
    }
  }

  private async getCustomSelectors(): Promise<Record<string, string>> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'rpa_selectors_nbais'))
        .limit(1);

      if (setting?.settingValue) {
        return JSON.parse(setting.settingValue);
      }
      return {};
    } catch (error: any) {
      logger.warn('Failed to get custom NBAIS selectors', { error: error.message });
      return {};
    }
  }

  private async closePrivacyPopup(page: Page): Promise<void> {
    try {
      await this.sleep(1000);

      await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, .popup, [role="dialog"]');
        for (const modal of Array.from(modals)) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none') {
            const closeBtn = modal.querySelector('button.close, [data-dismiss="modal"]');
            if (closeBtn) {
              (closeBtn as HTMLElement).click();
            }
          }
        }
      });
      
      await this.sleep(500);
    } catch {}
  }

  private async performVerification(
    page: Page,
    portalUrl: string,
    data: NBAISQueryData,
    selectors: Record<string, string>
  ): Promise<NBAISResult> {
    logger.info('Navigating to NBAIS/MBAIS portal', { url: portalUrl });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await this.sleep(2000);
    await this.closePrivacyPopup(page);

    try {
      await page.waitForSelector('form, input, select', { timeout: 10000 });
    } catch {
      throw new Error('Could not find form on NBAIS portal. The page may have changed.');
    }

    logger.info('Filling NBAIS form fields');

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
                return;
              }
            }
          }
        }, yearStr);
      }
    } catch (e: any) {
      logger.warn('Could not select exam year', { error: e.message });
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
          break;
        }
      } catch { continue; }
    }
    
    if (!regNumberEntered) {
      const textInputs = await page.$$('input[type="text"]');
      if (textInputs.length > 0) {
        await textInputs[0].type(data.registrationNumber);
      } else {
        throw new Error('Could not find registration number input field');
      }
    }

    if (data.cardSerialNumber) {
      const serialSelectors = selectors.cardSerialInput.split(', ');
      for (const selector of serialSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.type(data.cardSerialNumber);
            break;
          }
        } catch { continue; }
      }
    }

    if (data.cardPin) {
      const pinSelectors = selectors.cardPinInput.split(', ');
      for (const selector of pinSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.type(data.cardPin);
            break;
          }
        } catch { continue; }
      }
    }

    await this.sleep(1000);
    logger.info('Submitting NBAIS form');
    
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const urlBeforeSubmit = page.url();
    
    const submitSelectors = [
      'button#btnSubmit', 'input#btnSubmit', 
      'input[value*="Check"]', 'input[value*="Submit"]',
      'button[type="submit"]', 'input[type="submit"]',
      '.btn-success', '.btn-primary'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          submitted = true;
          break;
        }
      } catch { continue; }
    }

    if (!submitted) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase();
          const value = ((btn as HTMLInputElement).value || '').toLowerCase();
          if (text.includes('check') || text.includes('submit') || value.includes('check')) {
            (btn as HTMLElement).click();
            return;
          }
        }
      });
    }

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch {}
    
    await this.sleep(3000);

    const resultUrl = page.url();
    if (resultUrl === urlBeforeSubmit) {
      const pageError = await page.evaluate(() => {
        const errSelectors = ['.alert-danger', '.error', '.text-danger', '#lblError'];
        for (const sel of errSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        return null;
      });
      
      if (pageError) {
        throw new Error(pageError);
      }
      throw new Error('Could not submit form to NBAIS portal. Please verify your details.');
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
      message: subjects.length > 0 ? 'NBAIS result retrieved successfully' : 'No results found',
      screenshotBase64,
    };
  }

  private async extractSubjects(page: Page): Promise<NBAISSubject[]> {
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
        const text = document.body.innerText;
        const nameMatch = text.match(/Name[:\s]+([A-Z][A-Za-z\s]+)/);
        return nameMatch ? nameMatch[1].trim() : undefined;
      });
    } catch {
      return undefined;
    }
  }
}

export const nbaisWorker = new NBAISWorker();
