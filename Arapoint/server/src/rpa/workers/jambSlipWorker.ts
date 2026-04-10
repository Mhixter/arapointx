import { createRPAEngine, RPAEngine } from '../engine';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { objectStorageService } from '../../services/objectStorage';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface JAMBSlipQueryData {
  registrationNumber: string;
  serviceRequestId?: string;
}

const SLIP_URL = 'https://slipsprinting.jamb.gov.ng/PrintExaminationSlip';

const INPUT_SELECTORS = [
  'input[name="RegNo"]',
  'input[name="regNo"]',
  'input[name="RegNumber"]',
  'input[name="registrationNumber"]',
  'input[name="reg_no"]',
  'input[placeholder*="Registration"]',
  'input[placeholder*="registration"]',
  'input[placeholder*="Reg"]',
  '#RegNo',
  '#regNo',
  '#registrationNumber',
  'input[type="text"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button.btn-primary',
  'button:contains("Print")',
  'button:contains("Submit")',
  'button:contains("Get Slip")',
  'input[value="Print"]',
  'input[value="Submit"]',
  '.btn-primary',
  'form button',
];

export class JAMBSlipWorker extends BaseWorker {
  protected serviceName = 'jamb_exam_slip';
  private engine: RPAEngine | null = null;

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as JAMBSlipQueryData;
    logger.info('JAMB Slip Worker starting', { registrationNumber: data.registrationNumber });

    try {
      const portalUrl = await this.getPortalUrl();

      this.engine = createRPAEngine({
        headless: true,
        timeout: 90000,
        defaultViewport: { width: 1280, height: 900 },
      });

      await this.engine.initialize();
      const page = this.engine.getPage()!;

      logger.info('Navigating to JAMB slip portal', { url: portalUrl });
      await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.engine.sleep(2000);

      const inputSelector = await this.findInput(page);
      if (!inputSelector) {
        const screenshot = await this.engine.takeScreenshot();
        logger.error('JAMB slip portal: input field not found', { preview: screenshot.substring(0, 80) });
        return this.createErrorResult('Could not find the registration number field on the JAMB portal. The page may have changed or is currently unavailable.');
      }

      logger.info('Typing registration number', { registrationNumber: data.registrationNumber });
      await page.click(inputSelector, { clickCount: 3 });
      await page.type(inputSelector, data.registrationNumber, { delay: 60 });
      await this.engine.sleep(500);

      const submitted = await this.submitForm(page, inputSelector);
      if (!submitted) {
        return this.createErrorResult('Could not find or click the submit button on the JAMB portal.');
      }

      logger.info('Form submitted, waiting for slip to load...');

      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 });
      } catch {
        await this.engine.sleep(5000);
      }

      await this.engine.sleep(3000);

      const pageContent = await page.content();
      const isError = this.detectError(pageContent);
      if (isError) {
        return this.createErrorResult(`JAMB portal returned an error: ${isError}`);
      }

      logger.info('Generating slip PDF...');
      const pdfRaw = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      const pdfBuffer = Buffer.from(pdfRaw);

      const slipUrl = await this.storePdf(pdfBuffer, data.registrationNumber);

      logger.info('JAMB exam slip captured successfully', { registrationNumber: data.registrationNumber, slipUrl });

      return this.createSuccessResult({
        registrationNumber: data.registrationNumber,
        slipUrl,
        message: 'JAMB examination slip retrieved and saved successfully.',
      });
    } catch (error: any) {
      logger.error('JAMB Slip Worker error', { error: error.message, stack: error.stack });
      return this.createErrorResult(error.message || 'Failed to retrieve JAMB exam slip.', true);
    } finally {
      await this.cleanup();
    }
  }

  private async getPortalUrl(): Promise<string> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'rpa_provider_url_jamb_slip'))
        .limit(1);
      return setting?.settingValue || SLIP_URL;
    } catch {
      return SLIP_URL;
    }
  }

  private async findInput(page: any): Promise<string | null> {
    for (const selector of INPUT_SELECTORS) {
      try {
        const el = await page.$(selector);
        if (el) {
          logger.info('Found registration input', { selector });
          return selector;
        }
      } catch {}
    }
    return null;
  }

  private async submitForm(page: any, inputSelector: string): Promise<boolean> {
    for (const selector of SUBMIT_SELECTORS) {
      try {
        const el = await page.$(selector);
        if (el) {
          logger.info('Found submit button', { selector });
          await el.click();
          return true;
        }
      } catch {}
    }
    try {
      await page.keyboard.press('Enter');
      logger.info('Submitted form via Enter key');
      return true;
    } catch {}
    return false;
  }

  private detectError(html: string): string | null {
    const lower = html.toLowerCase();
    const errorPhrases = [
      'invalid registration',
      'not found',
      'no record',
      'record not found',
      'registration number not found',
      'please check your registration number',
      'cannot find',
      'does not exist',
    ];
    for (const phrase of errorPhrases) {
      if (lower.includes(phrase)) {
        return `Registration number not found or invalid — "${phrase}" detected on portal page.`;
      }
    }
    return null;
  }

  private async storePdf(pdfBuffer: Buffer, registrationNumber: string): Promise<string> {
    try {
      const objectPath = await objectStorageService.uploadBuffer(
        pdfBuffer,
        'application/pdf',
        'jamb-slips',
        '.pdf'
      );

      if (objectPath) {
        return objectPath;
      }
    } catch (err: any) {
      logger.warn('Object storage upload failed, falling back to disk', { error: err.message });
    }

    const slipsDir = path.join(process.cwd(), 'uploads', 'jamb-slips');
    if (!fs.existsSync(slipsDir)) fs.mkdirSync(slipsDir, { recursive: true });

    const fileName = `${registrationNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(slipsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    return `/uploads/jamb-slips/${fileName}`;
  }

  private async cleanup(): Promise<void> {
    if (this.engine) {
      await this.engine.cleanup();
      this.engine = null;
    }
  }
}

export const jambSlipWorker = new JAMBSlipWorker();
