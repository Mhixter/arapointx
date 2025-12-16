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
    examNumberInput: 'input[name="ExamNumber"], input[name="examnumber"], input[name="CandNo"], input[name="examNumber"], input#ExamNumber, input#examnumber, input#CandNo, input#examNumber',
    cardSerialInput: 'input[name="SerialNumber"], input[name="serialNumber"], input[name="Serial"], input#SerialNumber, input#serialNumber, input#Serial',
    cardPinInput: 'input[name="Pin"], input[name="pin"], input[name="PIN"], input#Pin, input#pin, input#PIN',
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

    const examTypeToSelect = data.examType || 'WASSCE';
    logger.info('Attempting to select exam type', { requestedType: examTypeToSelect });
    
    try {
      const selected = await page.evaluate((examType) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const isSchoolCandidate = examType.toUpperCase() === 'WASSCE' || examType.toLowerCase().includes('school') || examType.toLowerCase().includes('internal');
        
        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));
          
          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const optText = option.textContent?.toLowerCase() || '';
            const optValue = option.value?.toLowerCase() || '';
            
            if (isSchoolCandidate) {
              if (optText.includes('school') || optValue.includes('school') || 
                  optText.includes('wassce') || optValue === '1' || optValue === 'sc') {
                (select as HTMLSelectElement).selectedIndex = i;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true, selectedText: option.textContent, selectedValue: option.value };
              }
            } else {
              if (optText.includes('private') || optValue.includes('private') || 
                  optText.includes('gce') || optValue === '2' || optValue === 'pc') {
                (select as HTMLSelectElement).selectedIndex = i;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true, selectedText: option.textContent, selectedValue: option.value };
              }
            }
          }
        }
        
        const allSelects = document.querySelectorAll('select');
        const selectInfo = Array.from(allSelects).map(s => ({
          name: s.getAttribute('name'),
          id: s.id,
          options: Array.from(s.querySelectorAll('option')).map(o => ({ text: o.textContent, value: o.value }))
        }));
        return { success: false, selectInfo };
      }, examTypeToSelect);
      
      if (selected.success) {
        logger.info('Successfully selected exam type', { selectedText: selected.selectedText, selectedValue: selected.selectedValue });
      } else {
        logger.warn('Could not find matching exam type option', { availableSelects: JSON.stringify(selected.selectInfo) });
      }
    } catch (e: any) {
      logger.warn('Error selecting exam type', { error: e.message });
    }
    
    await this.sleep(500);

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
      let serialEntered = false;
      const serialSelectors = [
        'input[name="SerialNumber"]',
        'input[name="serialNumber"]', 
        'input[name="Serial"]',
        'input#SerialNumber',
        'input#serialNumber',
        'input#Serial'
      ];
      
      for (const selector of serialSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.type(data.cardSerialNumber);
            logger.info('Entered card serial number', { selector });
            serialEntered = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!serialEntered) {
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 2) {
          await textInputs[1].type(data.cardSerialNumber);
          logger.info('Used fallback for card serial number (2nd text input)');
          serialEntered = true;
        }
      }
      
      if (!serialEntered) {
        logger.warn('Could not enter card serial number - field not found');
      }
    }

    if (data.cardPin) {
      let pinEntered = false;
      const pinSelectors = [
        'input[name="Pin"]',
        'input[name="pin"]',
        'input[name="PIN"]',
        'input#Pin',
        'input#pin',
        'input#PIN',
        'input[type="password"]'
      ];
      
      for (const selector of pinSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.type(data.cardPin);
            logger.info('Entered card PIN', { selector });
            pinEntered = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!pinEntered) {
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 3) {
          await textInputs[2].type(data.cardPin);
          logger.info('Used fallback for card PIN (3rd text input)');
          pinEntered = true;
        }
      }
      
      if (!pinEntered) {
        logger.warn('Could not enter card PIN - field not found');
      }
    }

    await this.sleep(1000);

    logger.info('Submitting WAEC form');
    
    page.on('dialog', async (dialog) => {
      logger.info('Dialog appeared', { message: dialog.message(), type: dialog.type() });
      await dialog.accept();
    });

    const urlBeforeSubmit = page.url();
    logger.info('URL before submit', { url: urlBeforeSubmit });

    const submitSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'input[value="Submit"]',
      'input[value="Check Result"]',
      '.btn-submit',
      '#btnSubmit',
      '#Submit'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) {
        logger.info('Found submit button', { selector });
        break;
      }
    }

    if (!submitButton) {
      const allButtons = await page.$$('input, button');
      for (const btn of allButtons) {
        const props = await btn.evaluate(el => ({
          type: (el as HTMLInputElement).type,
          value: (el as HTMLInputElement).value || '',
          text: el.textContent || ''
        }));
        if (props.type === 'submit' || 
            props.value.toLowerCase().includes('submit') || 
            props.value.toLowerCase().includes('check') ||
            props.text.toLowerCase().includes('submit')) {
          submitButton = btn;
          logger.info('Found submit button via search', { props });
          break;
        }
      }
    }

    if (!submitButton) {
      throw new Error('Could not find submit button on WAEC portal');
    }

    logger.info('Clicking submit - waiting for popup or navigation...');

    const browser = page.browser();
    let resultPage: Page = page;
    let popupCaptured = false;

    const popupPromise = new Promise<Page>((resolve) => {
      const handler = async (target: any) => {
        if (target.type() === 'page') {
          const newPage = await target.page();
          if (newPage && newPage !== page) {
            logger.info('Popup window detected', { url: newPage.url() });
            browser.off('targetcreated', handler);
            resolve(newPage);
          }
        }
      };
      browser.on('targetcreated', handler);
      
      setTimeout(() => {
        browser.off('targetcreated', handler);
        resolve(page);
      }, 20000);
    });

    try {
      await submitButton.click();
      logger.info('Submit button clicked');
    } catch (e: any) {
      logger.warn('Click failed, trying JavaScript click', { error: e.message });
      await page.evaluate(() => {
        const btn = document.querySelector('input[type="submit"]') as HTMLElement;
        if (btn) btn.click();
      });
    }

    resultPage = await popupPromise;
    popupCaptured = resultPage !== page;
    
    logger.info('Result page determined', { 
      popupCaptured, 
      resultPageUrl: resultPage.url(),
      originalPageUrl: page.url()
    });

    if (popupCaptured) {
      await resultPage.waitForSelector('body', { timeout: 10000 }).catch(() => {});
      await this.sleep(3000);
    } else {
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      } catch {
        logger.info('No navigation detected on main page');
      }
      await this.sleep(3000);
    }

    const resultUrl = resultPage.url();
    logger.info('Result page URL', { url: resultUrl });

    const isStillOnFormPage = resultUrl === urlBeforeSubmit || 
                              resultUrl.includes('waecdirect.org/') && !resultUrl.includes('Result') && !resultUrl.includes('Error');

    if (isStillOnFormPage && !popupCaptured) {
      logger.error('Still on form page - form submission did not work');
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: 'error',
        message: 'Could not submit form to WAEC portal. Please try again later.',
      };
    }

    const pageContent = await resultPage.content();
    const pageText = await resultPage.evaluate(() => document.body.innerText);
    
    const hasResults = pageContent.includes('Subject') || pageContent.includes('Grade') || 
                       pageContent.includes('RESULT') || pageContent.includes('Score') ||
                       pageContent.includes('ENGLISH') || pageContent.includes('MATHEMATICS') ||
                       pageText.includes('Subject') || pageText.includes('Grade');
    const hasCardError = pageText.includes('card usage has exceeded') || 
                         pageText.includes('purchase another card') ||
                         pageText.includes('card has been used') ||
                         pageText.includes('maximum allowed');
    const hasInvalidError = pageText.toLowerCase().includes('invalid') || 
                            pageText.toLowerCase().includes('not found') ||
                            pageText.toLowerCase().includes('incorrect') ||
                            pageText.toLowerCase().includes('does not exist');
    
    logger.info('Page analysis', { hasResults, hasCardError, hasInvalidError, popupCaptured, url: resultUrl });
    
    const screenshot = await resultPage.screenshot({ encoding: 'base64', fullPage: true });

    if (popupCaptured) {
      try {
        await resultPage.close();
      } catch {
        logger.warn('Could not close popup');
      }
    }

    if (hasCardError) {
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: 'error',
        message: 'The scratch card has been exhausted or invalid. Please purchase a new card.',
      };
    }

    if (hasInvalidError) {
      const errorMatch = pageText.match(/(?:invalid|not found|incorrect|does not exist)[^.]*\.?/i);
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: 'not_found',
        message: errorMatch ? errorMatch[0].trim() : 'The registration number or card details are invalid.',
      };
    }

    if (!hasResults) {
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: 'error',
        message: 'Could not find results on WAEC response page. The portal may be experiencing issues.',
      };
    }

    const result = await this.extractResultsFromPage(resultPage, data, screenshot as string);
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

  private async extractResultsFromPage(page: Page, data: WAECQueryData, screenshotBase64: string): Promise<WAECResult> {
    logger.info('Extracting WAEC results from result page');

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
      logger.info('Extracted candidate name', { candidateName });
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
    try {
      logger.info('Generating PDF from result page');
      const pdfBuffer = await (page as any).pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      logger.info('PDF generated', { size: pdfBase64.length });
    } catch (pdfError: any) {
      logger.warn('PDF generation failed, using screenshot', { error: pdfError.message });
    }

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType || 'WASSCE',
      examYear: data.examYear,
      subjects,
      verificationStatus: 'verified',
      message: 'WAEC result verification completed successfully',
      pdfBase64,
      screenshotBase64,
    };
  }

}

export const waecWorker = new WAECWorker();
