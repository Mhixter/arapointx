import puppeteer, { Browser, Page, LaunchOptions } from 'puppeteer';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { adminSettings, botCredentials } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface RPAEngineConfig {
  headless?: boolean;
  timeout?: number;
  slowMo?: number;
  defaultViewport?: { width: number; height: number };
}

export interface ProviderConfig {
  name: string;
  portalUrl: string;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
  };
  selectors?: Record<string, string>;
}

export interface RPAResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  screenshot?: string;
}

const DEFAULT_CONFIG: RPAEngineConfig = {
  headless: true,
  timeout: 60000,
  slowMo: 50,
  defaultViewport: { width: 1280, height: 800 },
};

export class RPAEngine {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: RPAEngineConfig;

  constructor(config: RPAEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    try {
      const launchOptions: LaunchOptions = {
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
        ],
      };

      if (this.config.slowMo) {
        launchOptions.slowMo = this.config.slowMo;
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();
      
      if (this.config.defaultViewport) {
        await this.page.setViewport(this.config.defaultViewport);
      }

      await this.page.setDefaultTimeout(this.config.timeout || 60000);
      
      logger.info('RPA Engine initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize RPA Engine', { error: error.message });
      throw error;
    }
  }

  async getProviderUrl(providerName: string): Promise<string | null> {
    try {
      const settingKey = `rpa_provider_url_${providerName}`;
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, settingKey))
        .limit(1);

      return setting?.settingValue || null;
    } catch (error: any) {
      logger.error('Failed to get provider URL', { provider: providerName, error: error.message });
      return null;
    }
  }

  async getProviderCredentials(serviceName: string): Promise<{ username?: string; password?: string; apiKey?: string } | null> {
    try {
      const [creds] = await db
        .select()
        .from(botCredentials)
        .where(eq(botCredentials.serviceName, serviceName))
        .limit(1);

      if (!creds) return null;

      return {
        username: creds.username || undefined,
        apiKey: creds.apiKey || undefined,
      };
    } catch (error: any) {
      logger.error('Failed to get provider credentials', { service: serviceName, error: error.message });
      return null;
    }
  }

  async navigateTo(url: string): Promise<void> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    logger.info('Navigating to URL', { url });
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    await this.page.waitForSelector(selector, { timeout: timeout || this.config.timeout });
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    await this.page.waitForSelector(selector);
    await this.page.type(selector, text);
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  async select(selector: string, value: string): Promise<void> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    await this.page.waitForSelector(selector);
    await this.page.select(selector, value);
  }

  async getText(selector: string): Promise<string> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    await this.page.waitForSelector(selector);
    const element = await this.page.$(selector);
    if (!element) return '';
    
    const text = await this.page.evaluate(el => el.textContent, element);
    return text?.trim() || '';
  }

  async getPageContent(): Promise<string> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    return await this.page.content();
  }

  async takeScreenshot(): Promise<string> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    const screenshot = await this.page.screenshot({ encoding: 'base64' });
    return screenshot as string;
  }

  async extractTableData(tableSelector: string): Promise<Record<string, string>[]> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    
    await this.page.waitForSelector(tableSelector);
    
    const data = await this.page.evaluate((selector) => {
      const table = document.querySelector(selector);
      if (!table) return [];
      
      const rows = table.querySelectorAll('tr');
      const headers: string[] = [];
      const result: Record<string, string>[] = [];
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('th, td');
        if (index === 0) {
          cells.forEach(cell => headers.push(cell.textContent?.trim() || ''));
        } else {
          const rowData: Record<string, string> = {};
          cells.forEach((cell, cellIndex) => {
            const key = headers[cellIndex] || `column_${cellIndex}`;
            rowData[key] = cell.textContent?.trim() || '';
          });
          result.push(rowData);
        }
      });
      
      return result;
    }, tableSelector);
    
    return data;
  }

  async waitForNavigation(timeout?: number): Promise<void> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    await this.page.waitForNavigation({ 
      waitUntil: 'networkidle2',
      timeout: timeout || this.config.timeout 
    });
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) throw new Error('RPA Engine not initialized');
    return await this.page.evaluate(fn);
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPage(): Page | null {
    return this.page;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      logger.info('RPA Engine cleaned up');
    } catch (error: any) {
      logger.error('Error cleaning up RPA Engine', { error: error.message });
    }
  }
}

export const createRPAEngine = (config?: RPAEngineConfig) => new RPAEngine(config);
