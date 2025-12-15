import { RPAEngine, createRPAEngine } from '../engine';
import { logger } from '../../utils/logger';
import { BaseWorker, WorkerResult } from './baseWorker';
import { db } from '../../config/database';
import { adminSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface JAMBQueryData {
  registrationNumber: string;
  examYear?: string;
  examType?: string;
}

interface JAMBResult {
  registrationNumber: string;
  candidateName?: string;
  examType?: string;
  examYear?: string;
  subjects?: Array<{
    subject: string;
    score: number;
  }>;
  totalScore?: number;
  courseAllocation?: string;
  institutionChoice?: string;
  verificationStatus: 'verified' | 'not_found' | 'error';
  message: string;
}

export class JAMBWorker extends BaseWorker {
  protected serviceName = 'jamb_service';
  private engine: RPAEngine | null = null;

  private readonly DEFAULT_SELECTORS = {
    registrationInput: '#registration-number, input[name="regNumber"], input[name="registrationNumber"]',
    yearSelect: '#exam-year, select[name="examYear"], select[name="year"]',
    searchButton: '#search-btn, button[type="submit"], input[type="submit"]',
    resultTable: '.result-table, table.results, #result-container table',
    candidateName: '.candidate-name, #candidate-name, .name',
    errorMessage: '.error-message, .alert-danger, .error',
    totalScore: '.total-score, #total-score, .aggregate-score',
  };

  async execute(queryData: Record<string, unknown>): Promise<WorkerResult> {
    const data = queryData as unknown as JAMBQueryData;
    logger.info('JAMB Worker starting job', { registrationNumber: data.registrationNumber });

    try {
      const portalUrl = await this.getPortalUrl();
      if (!portalUrl) {
        return this.createErrorResult('JAMB portal URL not configured. Please configure in admin settings.');
      }

      const customSelectors = await this.getCustomSelectors();
      const selectors = { ...this.DEFAULT_SELECTORS, ...customSelectors };

      this.engine = createRPAEngine({
        headless: true,
        timeout: 60000,
      });

      await this.engine.initialize();

      const result = await this.performVerification(portalUrl, data, selectors);

      return this.createSuccessResult(result as unknown as Record<string, unknown>);
    } catch (error: any) {
      logger.error('JAMB Worker error', { error: error.message });
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
        .where(eq(adminSettings.settingKey, 'rpa_provider_url_jamb'))
        .limit(1);

      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error('Failed to get JAMB portal URL', { error: error.message });
      return null;
    }
  }

  private async getCustomSelectors(): Promise<Record<string, string>> {
    try {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'rpa_selectors_jamb'))
        .limit(1);

      if (setting?.settingValue) {
        return JSON.parse(setting.settingValue);
      }
      return {};
    } catch (error: any) {
      logger.warn('Failed to get custom JAMB selectors', { error: error.message });
      return {};
    }
  }

  private async performVerification(
    portalUrl: string,
    data: JAMBQueryData,
    selectors: Record<string, string>
  ): Promise<JAMBResult> {
    if (!this.engine) {
      throw new Error('RPA Engine not initialized');
    }

    logger.info('Navigating to JAMB portal', { url: portalUrl });
    await this.engine.navigateTo(portalUrl);
    await this.engine.sleep(2000);

    try {
      await this.engine.waitForSelector(selectors.registrationInput, 10000);
    } catch {
      const screenshot = await this.engine.takeScreenshot();
      logger.error('Registration input not found', { screenshot: screenshot.substring(0, 100) });
      throw new Error('Could not find registration input on JAMB portal. The page structure may have changed.');
    }

    logger.info('Entering registration number', { registrationNumber: data.registrationNumber });
    await this.engine.type(selectors.registrationInput, data.registrationNumber);

    if (data.examYear && selectors.yearSelect) {
      try {
        await this.engine.select(selectors.yearSelect, data.examYear);
      } catch {
        logger.warn('Could not select exam year, continuing without it');
      }
    }

    logger.info('Clicking search button');
    await this.engine.click(selectors.searchButton);
    
    await this.engine.sleep(3000);

    const errorElement = await this.checkForError(selectors.errorMessage);
    if (errorElement) {
      return {
        registrationNumber: data.registrationNumber,
        verificationStatus: 'not_found',
        message: errorElement,
      };
    }

    const result = await this.extractResults(data, selectors);
    return result;
  }

  private async checkForError(errorSelector: string): Promise<string | null> {
    if (!this.engine) return null;

    try {
      const page = this.engine.getPage();
      if (!page) return null;

      const errorElement = await page.$(errorSelector);
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        return errorText?.trim() || 'Unknown error';
      }
    } catch {
    }
    return null;
  }

  private async extractResults(
    data: JAMBQueryData,
    selectors: Record<string, string>
  ): Promise<JAMBResult> {
    if (!this.engine) {
      throw new Error('RPA Engine not initialized');
    }

    const page = this.engine.getPage();
    if (!page) {
      throw new Error('Page not available');
    }

    let candidateName: string | undefined;
    try {
      candidateName = await this.engine.getText(selectors.candidateName);
    } catch {
      logger.warn('Could not extract candidate name');
    }

    let totalScore: number | undefined;
    try {
      const scoreText = await this.engine.getText(selectors.totalScore);
      totalScore = parseInt(scoreText.replace(/\D/g, ''), 10);
      if (isNaN(totalScore)) totalScore = undefined;
    } catch {
      logger.warn('Could not extract total score');
    }

    let subjects: Array<{ subject: string; score: number }> = [];
    try {
      const tableData = await this.engine.extractTableData(selectors.resultTable);
      subjects = tableData.map(row => ({
        subject: row['Subject'] || row['subject'] || row['Course'] || '',
        score: parseInt(row['Score'] || row['score'] || row['Mark'] || '0', 10),
      })).filter(s => s.subject && !isNaN(s.score));
    } catch {
      logger.warn('Could not extract subjects table');
    }

    const screenshot = await this.engine.takeScreenshot();
    logger.info('Verification completed, screenshot taken');

    return {
      registrationNumber: data.registrationNumber,
      candidateName,
      examType: data.examType || 'UTME',
      examYear: data.examYear,
      subjects,
      totalScore,
      verificationStatus: 'verified',
      message: 'JAMB result verification completed successfully',
    };
  }

  private async cleanup(): Promise<void> {
    if (this.engine) {
      await this.engine.cleanup();
      this.engine = null;
    }
  }
}

export const jambWorker = new JAMBWorker();
