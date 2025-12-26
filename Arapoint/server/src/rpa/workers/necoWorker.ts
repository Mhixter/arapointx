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
  errorMessage?: string;
  screenshotBase64?: string;
  pdfBase64?: string;
}

export class WAECWorker extends BaseWorker {
  protected serviceName = 'waec_service';

  private readonly DEFAULT_SELECTORS = {
    examYearSelect: 'select[name="ExamYear"], select[name="examYear"], select#ExamYear, select#examYear, select[name="exam_year"]',
    examTypeSelect: 'select[name="ExamType"], select[name="examType"], select#ExamType, select#examType, select[name="exam_type"]',
    examNumberInput: 'input[name="ExamNumber"], input[name="examnumber"], input[name="CandNo"], input[name="examNumber"], input#ExamNumber, input#examnumber, input#CandNo, input#examNumber, input[name="exam_no"], input[name="registrationNumber"], input[name="exam_year_no"], input[placeholder*="Registration"], input[placeholder*="Examination Number"], input[name="reg_no"], input[name="regNumber"], input[name="exam_no"]',
    cardSerialInput: "input[name=\"token\"], input[name=\"cardToken\"], input#token, input#cardToken, input[name=\"SerialNumber\"], input[name=\"serialNumber\"], input[name=\"Serial\"], input#SerialNumber, input#serialNumber, input#Serial",
    cardPinInput: 'input[name="Pin"], input[name="pin"], input[name="PIN"], input#Pin, input#pin, input#PIN, input[name="pin_no"], input[name="pin"], input[name="cardPin"]',
    tokenInput: "input[name=\"token\"], input[name=\"cardToken\"], input#token, input#cardToken",
    submitButton: "button:not([value*=\"Purchase\"]):not([id*=\"purchase\"]):not([class*=\"purchase\"]):contains(\"Check\"), button:not([value*=\"Purchase\"]):not([id*=\"purchase\"]):not([class*=\"purchase\"]):contains(\"Result\"), input[type=\"submit\"]:not([value*=\"Purchase\"]), button[type=\"submit\"]:not([value*=\"Purchase\"])",
    resultTable: 'table.resultTable, table#resultTable, .result-table, table',
    candidateName: '.candidate-name, .name, td:contains("Name")+td',
    errorMessage: '.error, .alert-danger, .error-message',
    subjectRow: 'tr.subject-row, tbody tr',
  };

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as WAECQueryData & { portalUrl?: string; provider?: string };
    const provider = data.provider || 'waec';
    logger.info(`${provider.toUpperCase()} Worker starting job`, { 
      registrationNumber: data.registrationNumber,
      examYear: data.examYear 
    });

    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    const requestTimeout = config.RPA_REQUEST_TIMEOUT || 45000;
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const portalUrl = data.portalUrl || await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult(`${provider.toUpperCase()} portal URL not configured. Please configure in admin settings.`);
      }

      const customSelectors = await this.getCustomSelectors(provider);
      const selectors = { ...this.DEFAULT_SELECTORS, ...customSelectors };

      pooledResource = await browserPool.acquire();
      if (!pooledResource) {
        return this.createErrorResult('No available browser. System is at capacity, please try again.');
      }

      const { page } = pooledResource;
      logger.info(`${provider.toUpperCase()} Worker acquired browser from pool`);

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Request timeout exceeded')), requestTimeout);
      });

      const result = await Promise.race([
        this.performVerification(page, portalUrl, data, selectors, provider),
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

  private async getCustomSelectors(provider: string = 'waec'): Promise<Record<string, string>> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, `rpa_selectors_${provider}`))
        .limit(1);

      if (setting?.settingValue) {
        return JSON.parse(setting.settingValue);
      }
      return {};
    } catch (error: any) {
      logger.warn(`Failed to get custom ${provider.toUpperCase()} selectors`, { error: error.message });
      return {};
    }
  }

  private async closePrivacyPopup(page: Page, provider: string = 'waec'): Promise<void> {
    logger.info(`Checking for ${provider.toUpperCase()} privacy/data instruction popup`);
    
    try {
      const closeButtonSelectors = [
        'button.close', '.modal .close', '.modal-header .close', '[data-dismiss="modal"]',
        'button[aria-label="Close"]', '.btn-close', 'button:contains("Close")', 'button:contains("OK")',
        'button:contains("Accept")', 'button:contains("I Agree")', 'button:contains("Continue")',
        'button:contains("Proceed")', 'a:contains("Close")', 'a:contains("OK")', '.modal-footer button',
        '.modal button.btn-primary', '.modal button.btn-secondary', '.close-btn', '.closeBtn',
        '[class*="close"]', '.swal-button', '.swal2-confirm', '.swal2-close',
      ];

      await this.sleep(1000);

      const hasPopup = await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, .popup, .overlay, [role="dialog"], .swal2-container, .swal-overlay');
        for (const modal of Array.from(modals)) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
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
        for (const selector of closeButtonSelectors) {
          try {
            const clicked = await page.evaluate((sel) => {
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
        try {
          await page.keyboard.press('Escape');
          await this.sleep(300);
        } catch {}
        try {
          await page.evaluate(() => {
            const backdrop = document.querySelector('.modal-backdrop, .overlay, .fade');
            if (backdrop) (backdrop as HTMLElement).click();
          });
        } catch {}
        await this.sleep(500);
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
    selectors: Record<string, string>,
    provider: string = 'waec'
  ): Promise<WAECResult> {
    logger.info(`Navigating to ${provider.toUpperCase()} portal`, { url: portalUrl });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await this.sleep(1500);
    await this.closePrivacyPopup(page, provider);

    try {
      await page.waitForSelector('form, input, select', { timeout: 10000 });
    } catch {
      throw new Error(`Could not find form on ${provider.toUpperCase()} portal. The page may have changed.`);
    }

    logger.info(`Filling ${provider.toUpperCase()} form fields`);

    try {
      const yearStr = data.examYear ? data.examYear.toString() : '';
      if (!yearStr) {
        logger.warn('Exam year is missing or invalid');
      } else {
        await page.select(selectors.examYearSelect, yearStr);
        logger.info('Selected exam year', { year: data.examYear });
      }
    } catch (e: any) {
      logger.warn('Could not select exam year dropdown, trying alternative', { error: e.message });
      try {
        await page.evaluate((year) => {
          if (!year) return;
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
        }, data.examYear ? data.examYear.toString() : '');
      } catch {
        logger.warn('Year selection fallback also failed, continuing');
      }
    }

    const examTypeToSelect = data.examType || (provider === 'neco' ? 'school_candidate' : 'WASSCE');
    logger.info('Attempting to select exam type', { requestedType: examTypeToSelect, provider });
    
    try {
      const selected = await page.evaluate((examType, prov) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const isNeco = prov === 'neco';
        
        // Better matching for NECO
        const necoTypeMatch = (text: string, value: string) => {
          const t = text.toLowerCase().trim();
          const v = value.toLowerCase().trim();
          const target = examType.toLowerCase();

          if (target === 'school_candidate' || target.includes('internal')) {
            return t.includes('internal') || t.includes('school') || v.includes('int') || v.includes('ssce_int') || v === 'ssce (internal)';
          }
          if (target === 'private_candidate' || target.includes('private') || target.includes('gce')) {
            return t.includes('private') || t.includes('gce') || v.includes('ext') || v.includes('ssce_ext') || v === 'ssce (external)';
          }
          return false;
        };

        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));
          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const optText = option.textContent || '';
            const optValue = option.value || '';
            
            if (isNeco) {
              if (necoTypeMatch(optText, optValue)) {
                (select as HTMLSelectElement).selectedIndex = i;
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
                
                // Native event trigger
                if ('createEvent' in document) {
                  const evt = document.createEvent('HTMLEvents');
                  evt.initEvent('change', true, true);
                  select.dispatchEvent(evt);
                }
                
                // Extra layer for React/Angular/Vue components
                select.dispatchEvent(new Event('input', { bubbles: true }));
                return { success: true, selectedText: option.textContent, selectedValue: option.value };
              }
            } else {
              const isSchoolCandidate = examType.toUpperCase() === 'WASSCE' || examType.toLowerCase().includes('school') || examType.toLowerCase().includes('internal');
              if (isSchoolCandidate) {
                if (optText.includes('school') || optValue.includes('school') || optText.includes('wassce') || optValue === '1' || optValue === 'sc') {
                  (select as HTMLSelectElement).selectedIndex = i;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                  return { success: true, selectedText: option.textContent, selectedValue: option.value };
                }
              } else {
                if (optText.includes('private') || optValue.includes('private') || optText.includes('gce') || optValue === '2' || optValue === 'pc') {
                  (select as HTMLSelectElement).selectedIndex = i;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                  return { success: true, selectedText: option.textContent, selectedValue: option.value };
                }
              }
            }
          }
        }
        return { success: false, selectedText: null, selectedValue: '' };
      }, examTypeToSelect, provider);
      
      if (selected.success) {
        logger.info('Successfully selected exam type', { selectedText: selected.selectedText, selectedValue: selected.selectedValue });
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
      const serialSelectors = ['input[name="SerialNumber"]', 'input[name="serialNumber"]', 'input[name="Serial"]', 'input#SerialNumber', 'input#serialNumber', 'input#Serial'];
      for (const selector of serialSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.type(data.cardSerialNumber);
            serialEntered = true;
            break;
          }
        } catch { continue; }
      }
      if (!serialEntered) {
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 2) {
          await textInputs[1].type(data.cardSerialNumber);
          serialEntered = true;
        }
      }
    }

    if (data.cardPin) {
      let pinEntered = false;
      const pinSelectors = [
        'input[name="Pin"]', 'input[name="pin"]', 'input[name="PIN"]', 
        'input#Pin', 'input#pin', 'input#PIN', 
        'input[name="token"]', 'input#token', 'input[name="cardToken"]',
        'input[type="password"]', 'input[type="text"][placeholder*="Token"]', 
        'input[type="text"][placeholder*="PIN"]', 'input#tokenCode'
      ];
      for (const selector of pinSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            await input.type(data.cardPin);
            pinEntered = true;
            break;
          }
        } catch { continue; }
      }
      if (!pinEntered) {
        const textInputs = await page.$$('input[type="text"]');
        if (textInputs.length >= 3) {
          await textInputs[2].type(data.cardPin);
          pinEntered = true;
        }
      }
    }

    await this.sleep(1000);
    logger.info('Submitting WAEC form');
    
    page.on('dialog', async (dialog) => {
      logger.info('Dialog appeared', { message: dialog.message(), type: dialog.type() });
      await dialog.accept();
    });

    const urlBeforeSubmit = page.url();
    const submitSelectors = [
      'button#btnSubmit', 'input#btnSubmit', 'button:contains("Check Result")', 
      'input[value="Check Result"]', 'button[type="submit"]', 'input[type="submit"]',
      '.btn-success', '.btn-primary', 'button.submit', 'input.submit'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) break;
    }

    if (!submitButton) {
      const allButtons = await page.$$('input, button');
      for (const btn of allButtons) {
        const props = await btn.evaluate(el => ({
          type: (el as HTMLInputElement).type,
          value: (el as HTMLInputElement).value || '',
          text: el.textContent || ''
        }));
        if (props.type === 'submit' || props.value.toLowerCase().includes('submit') || props.value.toLowerCase().includes('check') || props.text.toLowerCase().includes('submit')) {
          submitButton = btn;
          break;
        }
      }
    }

    if (!submitButton) throw new Error('Could not find submit button on WAEC portal');

    const browser = page.browser();
    let resultPage: Page = page;
    let popupCaptured = false;

    const popupPromise = new Promise<Page>((resolve) => {
      const handler = async (target: any) => {
        if (target.type() === 'page') {
          const newPage = await target.page();
          if (newPage && newPage !== page) {
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
    } catch (e: any) {
      await page.evaluate(() => {
        const btn = (document.querySelector('input[type="submit"]') || document.querySelector('button[type="submit"]')) as HTMLElement;
        if (btn) btn.click();
      });
    }

    resultPage = await popupPromise;
    popupCaptured = resultPage !== page;
    
    if (popupCaptured) {
      await resultPage.waitForSelector('body', { timeout: 10000 }).catch(() => {});
      await this.sleep(3000);
    } else {
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      } catch {}
      await this.sleep(3000);
    }

    const resultUrl = resultPage.url();
    const isStillOnFormPage = resultUrl === urlBeforeSubmit || 
                              (provider === 'waec' && resultUrl.includes('waecdirect.org/') && !resultUrl.includes('Result') && !resultUrl.includes('Error')) ||
                              (provider === 'neco' && (resultUrl.includes('results.neco.gov.ng') && (resultUrl.endsWith('/') || resultUrl.endsWith('/home') || resultUrl.endsWith('/dashboard') || resultUrl.includes('token'))));

    if (isStillOnFormPage && !popupCaptured) {
      const pageError = await resultPage.evaluate(() => {
        const errSelectors = [
          '.alert-danger', '.error', '.text-danger', '.err-msg', '#lblError', 
          '.validation-summary-errors', '.errorMessage', '[id*="Error"]', 
          '[class*="error"]', '.toast-error', '.notification-error',
          '.alert-warning', '#message'
        ];
        for (const sel of errSelectors) {
          const elements = document.querySelectorAll(sel);
          for (const el of Array.from(elements)) {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && el.textContent?.trim()) return el.textContent.trim();
          }
        }
        const bodyText = document.body.innerText;
        const errorKeywords = ['Invalid', 'Incorrect', 'Expired', 'Used', 'Wrong', 'Not Found'];
        for (const kw of errorKeywords) {
           if (bodyText.includes(kw) && bodyText.length < 500) return bodyText.trim();
        }
        return null;
      });

      if (!pageError) {
        try {
           await resultPage.click(selectors.submitButton);
           await this.sleep(5000);
        } catch {}
      }
      
      const finalError = pageError || `Could not submit form to ${provider.toUpperCase()} portal. Please verify your details and try again.`;
      throw new Error(finalError);
    }

    const pageContent = await resultPage.content();
    const pageText = await resultPage.evaluate(() => document.body.innerText);
    
    const hasResults = pageContent.includes('Subject') || pageContent.includes('Grade') || pageContent.includes('RESULT') || pageContent.includes('Score') || pageContent.includes('ENGLISH') || pageContent.includes('MATHEMATICS') || pageText.includes('Subject') || pageText.includes('Grade');
    const hasCardError = pageText.includes('card usage has exceeded') || pageText.includes('purchase another card') || pageText.includes('card has been used') || pageText.includes('maximum allowed');
    const hasInvalidError = pageText.toLowerCase().includes('invalid') || pageText.toLowerCase().includes('not found') || pageText.toLowerCase().includes('incorrect') || pageText.toLowerCase().includes('does not exist');
    
    const screenshot = await resultPage.screenshot({ encoding: 'base64', fullPage: true });

    if (popupCaptured) {
      try { await resultPage.close(); } catch {}
    }

    const extractWaecError = (): string => {
      try {
        const url = new URL(resultUrl);
        const errTitle = url.searchParams.get('errTitle');
        const errMsg = url.searchParams.get('errMsg');
        if (errTitle) return decodeURIComponent(errTitle).replace(/&amp;/g, '&');
        if (errMsg) return decodeURIComponent(errMsg).replace(/&amp;/g, '&');
      } catch {}
      const errorLines = pageText.split('\n').filter(line => line.toLowerCase().includes('error') || line.toLowerCase().includes('invalid') || line.toLowerCase().includes('exceeded') || line.toLowerCase().includes('purchase'));
      return errorLines.length > 0 ? errorLines[0].trim() : pageText.substring(0, 200).trim();
    };

    if (hasCardError || hasInvalidError) {
      const waecError = extractWaecError();
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: hasCardError ? 'error' : 'not_found',
        message: waecError,
        errorMessage: waecError,
      };
    }

    if (!hasResults) {
      const waecError = extractWaecError();
      const errorMsg = waecError || 'Could not find results on response page.';
      return {
        registrationNumber: data.registrationNumber,
        examYear: data.examYear,
        examType: data.examType,
        subjects: [],
        verificationStatus: 'error' as any,
        message: errorMsg,
        errorMessage: errorMsg,
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
      if (pageText.toLowerCase().includes("not found") || pageText.toLowerCase().includes("invalid") || pageText.toLowerCase().includes("error")) {
        const errorMatch = pageText.match(/(not found|invalid|error)[^.]*\\./i);
        if (errorMatch) return errorMatch[0];
      }
    } catch {}
    return null;
  }

  private async extractResultsFromPage(page: Page, data: WAECQueryData, screenshotBase64: string): Promise<WAECResult> {
    let candidateName: string | undefined;
    try {
      candidateName = await page.evaluate(() => {
        const nameLabels = ['Name', 'Candidate Name', 'CANDIDATE NAME'];
        for (const label of nameLabels) {
          const cells = document.querySelectorAll('td, th');
          for (let i = 0; i < cells.length; i++) {
            if (cells[i].textContent?.includes(label) && cells[i + 1]) return cells[i + 1].textContent?.trim();
          }
        }
        return (document.querySelector('.candidate-name, .name') as HTMLElement)?.textContent?.trim();
      });
    } catch {}

    let subjects: WAECSubject[] = [];
    try {
      subjects = await page.evaluate(() => {
        const results: WAECSubject[] = [];
        const rows = document.querySelectorAll('tr');
        for (const row of Array.from(rows)) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const subject = cells[0]?.textContent?.trim();
            const grade = cells[cells.length - 1]?.textContent?.trim();
            if (subject && grade && !subject.toLowerCase().includes('subject') && subject.length > 1 && grade.length <= 3) {
              results.push({ subject, grade });
            }
          }
        }
        return results;
      });
    } catch {}

    let pdfBase64: string | undefined;
    try {
      const pdfBuffer = await (page as any).pdf({ format: 'A4', printBackground: true });
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    } catch {}

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType || 'WASSCE',
      examYear: data.examYear,
      subjects,
      verificationStatus: 'verified',
      message: 'Verification completed successfully',
      pdfBase64,
      screenshotBase64,
    };
  }
}

export const waecWorker = new WAECWorker();
