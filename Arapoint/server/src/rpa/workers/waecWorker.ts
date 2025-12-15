import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { browserPool } from '../browserPool';
import { config } from '../../config/env';

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
  pdfBase64?: string;
}

export class WAECWorker extends BaseWorker {
  protected serviceName = 'waec_service';

  private readonly DEFAULT_SELECTORS = {
    examYearSelect: 'select[name="ExamYear"], select[name="examYear"], select#ExamYear, select#examYear',
    examTypeSelect: 'select[name="ExamType"], select[name="examType"], select#ExamType, select#examType',
    examNumberInput: 'input[name="CandNo"], input[name="examNumber"], input#CandNo, input#examNumber',
    cardSerialInput: 'input[name="Serial"], input[name="serialNumber"], input#Serial, input#serialNumber',
    cardPinInput: 'input[name="Pin"], input[name="pin"], input#Pin, input#pin',
    submitButton: 'input[type="submit"], button[type="submit"], button.submit, input.submit, button[name="submit"], .btn-submit, #submit, button:contains("Submit"), button:contains("Check"), input[value="Submit"], input[value="Check"]',
    resultTable: 'table.resultTable, table#resultTable, .result-table, table',
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

    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 45000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const portalUrl = await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult('WAEC portal URL not configured. Please configure in admin settings.');
      }

      const customSelectors = await this.getCustomSelectors();
      const selectors = { ...this.DEFAULT_SELECTORS, ...customSelectors };

      pooledResource = await browserPool.acquire();
      if (!pooledResource) {
        return this.createErrorResult('No available browser. System is at capacity, please try again.');
      }

      const { page } = pooledResource;
      logger.info('WAEC Worker acquired browser from pool');

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Request timeout exceeded')), requestTimeout);
      });

      const result = await Promise.race([
        this.performVerification(page, portalUrl, data, selectors),
        timeoutPromise
      ]);

      return this.createSuccessResult(result as unknown as Record<string, unknown>);
    } catch (error: any) {
      logger.error('WAEC Worker error', { error: error.message });
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

  private async closePrivacyPopup(page: Page): Promise<void> {
    logger.info('Checking for WAEC privacy/data instruction popup');
    
    try {
      // Common selectors for popup close buttons on WAEC portal
      const closeButtonSelectors = [
        // Modal close buttons
        'button.close',
        '.modal .close',
        '.modal-header .close',
        '[data-dismiss="modal"]',
        'button[aria-label="Close"]',
        '.btn-close',
        // Common close/accept/OK buttons
        'button:contains("Close")',
        'button:contains("OK")',
        'button:contains("Accept")',
        'button:contains("I Agree")',
        'button:contains("Continue")',
        'button:contains("Proceed")',
        'a:contains("Close")',
        'a:contains("OK")',
        // Generic modal backdrop/overlay click
        '.modal-footer button',
        '.modal button.btn-primary',
        '.modal button.btn-secondary',
        // X button
        '.close-btn',
        '.closeBtn',
        '[class*="close"]',
        // Swal/sweetalert style
        '.swal-button',
        '.swal2-confirm',
        '.swal2-close',
      ];

      // Wait briefly for any popup to appear
      await this.sleep(1000);

      // Check if there's a modal/popup visible
      const hasPopup = await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, .popup, .overlay, [role="dialog"], .swal2-container, .swal-overlay');
        for (const modal of Array.from(modals)) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
        // Also check for any element that might be a privacy notice
        const privacyElements = document.querySelectorAll('[class*="privacy"], [class*="notice"], [class*="instruction"], [class*="disclaimer"]');
        for (const el of Array.from(privacyElements)) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && (el as HTMLElement).offsetHeight > 100) {
            return true;
          }
        }
        return false;
      });

      if (hasPopup) {
        logger.info('Popup/modal detected, attempting to close');
        
        // Try clicking close buttons
        for (const selector of closeButtonSelectors) {
          try {
            const clicked = await page.evaluate((sel) => {
              // Handle :contains pseudo-selector manually
              if (sel.includes(':contains(')) {
                const match = sel.match(/(.+):contains\("(.+)"\)/);
                if (match) {
                  const [, tagSelector, text] = match;
                  const elements = document.querySelectorAll(tagSelector);
                  for (const el of Array.from(elements)) {
                    if (el.textContent?.toLowerCase().includes(text.toLowerCase())) {
                      const style = window.getComputedStyle(el);
                      if (style.display !== 'none' && style.visibility !== 'hidden') {
                        (el as HTMLElement).click();
                        return true;
                      }
                    }
                  }
                }
                return false;
              }
              
              const btn = document.querySelector(sel);
              if (btn) {
                const style = window.getComputedStyle(btn);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                  (btn as HTMLElement).click();
                  return true;
                }
              }
              return false;
            }, selector);

            if (clicked) {
              logger.info('Successfully clicked popup close button', { selector });
              await this.sleep(500);
              break;
            }
          } catch {
            continue;
          }
        }

        // If still visible, try pressing Escape key
        try {
          await page.keyboard.press('Escape');
          logger.info('Pressed Escape key to close popup');
          await this.sleep(300);
        } catch {
          // Ignore
        }

        // Final attempt: click outside the modal (on backdrop)
        try {
          await page.evaluate(() => {
            const backdrop = document.querySelector('.modal-backdrop, .overlay, .fade');
            if (backdrop) {
              (backdrop as HTMLElement).click();
            }
          });
        } catch {
          // Ignore
        }

        await this.sleep(500);
        logger.info('Popup handling completed');
      } else {
        logger.info('No popup detected, proceeding with form');
      }
    } catch (error: any) {
      logger.warn('Error handling privacy popup, continuing anyway', { error: error.message });
    }
  }

  private async performVerification(
    page: Page,
    portalUrl: string,
    data: WAECQueryData,
    selectors: Record<string, string>
  ): Promise<WAECResult> {
    logger.info('Navigating to WAEC Direct portal', { url: portalUrl });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await this.sleep(1500);

    // Handle WAEC Data Privacy popup - close it if present
    await this.closePrivacyPopup(page);

    try {
      await page.waitForSelector('form, input, select', { timeout: 10000 });
    } catch {
      throw new Error('Could not find form on WAEC portal. The page may have changed.');
    }

    logger.info('Filling WAEC form fields');

    try {
      await page.select(selectors.examYearSelect, data.examYear.toString());
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
        await page.select(selectors.examTypeSelect, data.examType);
        logger.info('Selected exam type', { type: data.examType });
      } catch {
        logger.warn('Could not select exam type');
      }
    }

    try {
      await page.waitForSelector(selectors.examNumberInput, { timeout: 5000 });
      await page.type(selectors.examNumberInput, data.registrationNumber);
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
        await page.type(selectors.cardSerialInput, data.cardSerialNumber);
        logger.info('Entered card serial number');
      } catch {
        logger.warn('Could not enter card serial number');
      }
    }

    if (data.cardPin) {
      try {
        await page.type(selectors.cardPinInput, data.cardPin);
        logger.info('Entered card PIN');
      } catch {
        logger.warn('Could not enter card PIN');
      }
    }

    await this.sleep(500);

    logger.info('Submitting WAEC form');
    let submitClicked = false;
    
    const submitSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'button.submit',
      'input.submit',
      '.btn-submit',
      '#submit',
      'button[name="submit"]',
      'input[value="Submit"]',
      'input[value="Check"]',
      'input[value="Check Result"]',
      'button'
    ];

    for (const selector of submitSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          const isVisible = await page.evaluate((el: Element) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && (el as HTMLElement).offsetWidth > 0;
          }, btn);
          
          if (isVisible) {
            await btn.click();
            logger.info('Clicked submit button', { selector });
            submitClicked = true;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!submitClicked) {
      try {
        submitClicked = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          for (const form of forms) {
            const inputs = form.querySelectorAll('input, select');
            if (inputs.length > 0) {
              (form as HTMLFormElement).submit();
              return true;
            }
          }
          
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
          for (const btn of buttons) {
            const text = btn.textContent?.toLowerCase() || (btn as HTMLInputElement).value?.toLowerCase() || '';
            if (text.includes('submit') || text.includes('check') || text.includes('verify')) {
              (btn as HTMLElement).click();
              return true;
            }
          }
          return false;
        });
        
        if (submitClicked) {
          logger.info('Used JavaScript form submission');
        }
      } catch (e: any) {
        logger.warn('Form submission fallback failed', { error: e.message });
      }
    }

    if (!submitClicked) {
      throw new Error('Could not find submit button. The WAEC portal page structure may have changed.');
    }

    logger.info('Waiting for results page');
    await this.sleep(2000);

    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
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

    const result = await this.extractResults(page, data);
    return result;
  }

  private async checkForError(page: Page, errorSelector: string): Promise<string | null> {
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

  private async extractResults(page: Page, data: WAECQueryData): Promise<WAECResult> {
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

    let pdfBase64: string | undefined;
    let screenshotBase64: string | undefined;

    // Always capture screenshot/PDF so users can see what happened (even if no subjects found)
    try {
      logger.info('Capturing PDF of result page');
      const pdfBuffer = await (page as any).pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      logger.info('PDF captured successfully', { size: pdfBase64.length });
    } catch (pdfError: any) {
      logger.warn('Could not generate PDF, falling back to screenshot', { error: pdfError.message });
      
      try {
        const screenshotBuffer = await (page as any).screenshot({ 
          fullPage: true, 
          type: 'png',
        });
        screenshotBase64 = Buffer.from(screenshotBuffer).toString('base64');
        logger.info('Screenshot captured successfully', { size: screenshotBase64.length });
      } catch (ssError: any) {
        logger.warn('Could not capture screenshot', { error: ssError.message });
      }
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
      pdfBase64,
      screenshotBase64,
    };
  }

}

export const waecWorker = new WAECWorker();
