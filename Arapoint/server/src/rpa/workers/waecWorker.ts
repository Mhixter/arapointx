import { RPAEngine, createRPAEngine } from '../engine';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface WAECQueryData {
  registrationNumber: string;
  examYear: number;
  examType?: string;
  cardSerialNumber?: string;
  cardPin?: string;
}

interface WAECSubject {
  subject: string;
  grade: string;
}

interface WAECResult {
  registrationNumber: string;
  candidateName?: string;
  examType?: string;
  examYear?: number;
  subjects: WAECSubject[];
  verificationStatus: 'verified' | 'not_found' | 'error';
  message: string;
  screenshotBase64?: string;
}

export class WAECWorker extends BaseWorker {
  protected serviceName = 'waec_service';
  private engine: RPAEngine | null = null;

  private readonly DEFAULT_SELECTORS = {
    examYearSelect: 'select[name="ExamYear"]',
    examTypeSelect: 'select[name="ExamType"]',
    examNumberInput: 'input[name="CandNo"]',
    cardSerialInput: 'input[name="Serial"]',
    cardPinInput: 'input[name="Pin"]',
    submitButton: 'input[type="submit"], button[type="submit"]',
    resultTable: 'table.resultTable, table#resultTable, .result-table',
    candidateName: '.candidate-name, .name, td:contains("Name")+td',
    errorMessage: '.error, .alert-danger, .error-message',
    subjectRow: 'tr.subject-row, tbody tr',
  };

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as WAECQueryData;
    logger.info('WAEC Worker starting job', { 
      registrationNumber: data.registrationNumber,
      examYear: data.examYear 
    });

    try {
      const portalUrl = await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult('WAEC portal URL not configured. Please configure in admin settings.');
      }

      const customSelectors = await this.getCustomSelectors();
      const selectors = { ...this.DEFAULT_SELECTORS, ...customSelectors };

      this.engine = createRPAEngine({
        headless: true,
        timeout: 90000,
        slowMo: 100,
      });

      await this.engine.initialize();
      logger.info('WAEC RPA Engine initialized');

      const result = await this.performVerification(portalUrl, data, selectors);

      return this.createSuccessResult(result as unknown as Record<string, unknown>);
    } catch (error: any) {
      logger.error('WAEC Worker error', { error: error.message });
      
      if (this.engine) {
        try {
          const screenshot = await this.engine.takeScreenshot();
          logger.info('Error screenshot captured');
          return this.createErrorResult(`${error.message}. Screenshot captured for debugging.`, true);
        } catch {
        }
      }
      
      return this.createErrorResult(error.message, true);
    } finally {
      await this.cleanup();
    }
  }

  private async getPortalUrl(): Promise<string | null> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'rpa_provider_url_waec'))
        .limit(1);

      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error('Failed to get WAEC portal URL', { error: error.message });
      return null;
    }
  }

  private async getCustomSelectors(): Promise<Record<string, string>> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'rpa_selectors_waec'))
        .limit(1);

      if (setting?.settingValue) {
        return JSON.parse(setting.settingValue);
      }
      return {};
    } catch (error: any) {
      logger.warn('Failed to get custom WAEC selectors', { error: error.message });
      return {};
    }
  }

  private async performVerification(
    portalUrl: string,
    data: WAECQueryData,
    selectors: Record<string, string>
  ): Promise<WAECResult> {
    if (!this.engine) {
      throw new Error('RPA Engine not initialized');
    }

    logger.info('Navigating to WAEC Direct portal', { url: portalUrl });
    await this.engine.navigateTo(portalUrl);
    await this.engine.sleep(3000);

    const page = this.engine.getPage();
    if (!page) {
      throw new Error('Browser page not available');
    }

    try {
      await page.waitForSelector('form, input, select', { timeout: 15000 });
    } catch {
      const screenshot = await this.engine.takeScreenshot();
      logger.error('Form not found on WAEC page', { screenshot: screenshot.substring(0, 100) });
      throw new Error('Could not find form on WAEC portal. The page may have changed.');
    }

    logger.info('Filling WAEC form fields');

    try {
      await this.engine.select(selectors.examYearSelect, data.examYear.toString());
      logger.info('Selected exam year', { year: data.examYear });
    } catch (e: any) {
      logger.warn('Could not select exam year dropdown, trying alternative', { error: e.message });
      try {
        await page.evaluate((year) => {
          const selects = Array.from(document.querySelectorAll('select'));
          for (const select of selects) {
            const options = Array.from(select.querySelectorAll('option'));
            for (const option of options) {
              if (option.value === year || option.textContent?.includes(year)) {
                (select as HTMLSelectElement).value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }
        }, data.examYear.toString());
      } catch {
        logger.warn('Year selection fallback also failed, continuing');
      }
    }

    if (data.examType) {
      try {
        await this.engine.select(selectors.examTypeSelect, data.examType);
        logger.info('Selected exam type', { type: data.examType });
      } catch {
        logger.warn('Could not select exam type');
      }
    }

    try {
      await this.engine.type(selectors.examNumberInput, data.registrationNumber);
      logger.info('Entered examination number');
    } catch {
      const inputs = await page.$$('input[type="text"]');
      if (inputs.length > 0) {
        await inputs[0].type(data.registrationNumber);
        logger.info('Used fallback to enter examination number');
      } else {
        throw new Error('Could not find examination number input field');
      }
    }

    if (data.cardSerialNumber) {
      try {
        await this.engine.type(selectors.cardSerialInput, data.cardSerialNumber);
        logger.info('Entered card serial number');
      } catch {
        logger.warn('Could not enter card serial number');
      }
    }

    if (data.cardPin) {
      try {
        await this.engine.type(selectors.cardPinInput, data.cardPin);
        logger.info('Entered card PIN');
      } catch {
        logger.warn('Could not enter card PIN');
      }
    }

    await this.engine.sleep(1000);

    logger.info('Submitting WAEC form');
    try {
      await this.engine.click(selectors.submitButton);
    } catch {
      const submitBtn = await page.$('input[type="submit"], button[type="submit"], button:contains("Submit"), input[value="Submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        throw new Error('Could not find submit button');
      }
    }

    logger.info('Waiting for results page');
    await this.engine.sleep(5000);

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch {
      logger.warn('Navigation timeout, checking for results on current page');
    }

    const errorText = await this.checkForError(page, selectors.errorMessage);
    if (errorText) {
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: 'not_found',
        message: errorText,
      };
    }

    const result = await this.extractResults(page, data, selectors);
    
    const screenshot = await this.engine.takeScreenshot();
    result.screenshotBase64 = screenshot;
    
    return result;
  }

  private async checkForError(page: any, errorSelector: string): Promise<string | null> {
    try {
      const errorElement = await page.$(errorSelector);
      if (errorElement) {
        const errorText = await page.evaluate((el: Element) => el.textContent, errorElement);
        return errorText?.trim() || null;
      }

      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.toLowerCase().includes('not found') || 
          pageText.toLowerCase().includes('invalid') ||
          pageText.toLowerCase().includes('error')) {
        const errorMatch = pageText.match(/(not found|invalid|error)[^.]*\./i);
        if (errorMatch) {
          return errorMatch[0];
        }
      }
    } catch {
    }
    return null;
  }

  private async extractResults(
    page: any,
    data: WAECQueryData,
    selectors: Record<string, string>
  ): Promise<WAECResult> {
    logger.info('Extracting WAEC results');

    let candidateName: string | undefined;
    try {
      candidateName = await page.evaluate(() => {
        const nameLabels = ['Name', 'Candidate Name', 'CANDIDATE NAME'];
        for (const label of nameLabels) {
          const cells = document.querySelectorAll('td, th');
          for (let i = 0; i < cells.length; i++) {
            if (cells[i].textContent?.includes(label) && cells[i + 1]) {
              return cells[i + 1].textContent?.trim();
            }
          }
        }
        const nameEl = document.querySelector('.candidate-name, .name');
        return nameEl?.textContent?.trim();
      });
    } catch {
      logger.warn('Could not extract candidate name');
    }

    let subjects: WAECSubject[] = [];
    try {
      subjects = await page.evaluate(() => {
        const results: { subject: string; grade: string }[] = [];
        const tables = Array.from(document.querySelectorAll('table'));
        
        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const subject = cells[0]?.textContent?.trim();
              const grade = cells[cells.length - 1]?.textContent?.trim();
              
              if (subject && grade && 
                  !subject.toLowerCase().includes('subject') &&
                  subject.length > 1 && grade.length <= 3) {
                results.push({ subject, grade });
              }
            }
          }
        }
        return results;
      });
      logger.info('Extracted subjects', { count: subjects.length });
    } catch {
      logger.warn('Could not extract subjects');
    }

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType || 'WASSCE',
      examYear: data.examYear,
      subjects,
      verificationStatus: subjects.length > 0 ? 'verified' : 'not_found',
      message: subjects.length > 0 
        ? 'WAEC result verification completed successfully' 
        : 'Could not extract results from page',
    };
  }

  private async cleanup(): Promise<void> {
    if (this.engine) {
      await this.engine.cleanup();
      this.engine = null;
    }
  }
}

export const waecWorker = new WAECWorker();
