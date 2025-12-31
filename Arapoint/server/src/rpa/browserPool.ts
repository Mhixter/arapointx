import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';

interface PooledBrowser {
  browser: Browser;
  page: Page;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
}

class BrowserPool {
  private pool: PooledBrowser[] = [];
  private maxPoolSize: number = 10;
  private maxBrowserAge: number = 300000;
  private initPromise: Promise<void> | null = null;

  async initialize(poolSize: number = 10): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize(poolSize);
    return this.initPromise;
  }

  private async doInitialize(poolSize: number): Promise<void> {
    this.maxPoolSize = poolSize;
    logger.info(`Initializing browser pool with ${poolSize} browsers`);

    const batchSize = 5;
    for (let i = 0; i < poolSize; i += batchSize) {
      const createPromises = [];
      const batchEnd = Math.min(i + batchSize, poolSize);
      for (let j = i; j < batchEnd; j++) {
        createPromises.push(this.createPooledBrowser());
      }
      await Promise.all(createPromises);
      logger.info(`Browser pool progress: ${this.pool.length}/${poolSize} browsers created`);
    }

    logger.info(`Browser pool initialized with ${this.pool.length} browsers`);
  }

  private async createPooledBrowser(): Promise<PooledBrowser | null> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--no-zygote',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
          '--mute-audio',
          '--no-first-run',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultTimeout(30000);

      const pooledBrowser: PooledBrowser = {
        browser,
        page,
        inUse: false,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      this.pool.push(pooledBrowser);
      return pooledBrowser;
    } catch (error: any) {
      logger.error('Failed to create pooled browser', { error: error.message });
      return null;
    }
  }

  async acquire(maxWaitMs: number = 30000): Promise<{ browser: Browser; page: Page; release: () => Promise<void> } | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      let pooledBrowser = this.pool.find(pb => !pb.inUse);

      if (!pooledBrowser && this.pool.length < this.maxPoolSize) {
        pooledBrowser = await this.createPooledBrowser();
      }

      if (!pooledBrowser) {
        pooledBrowser = this.pool.find(pb => !pb.inUse);
      }

      if (pooledBrowser) {
        const now = Date.now();
        if (now - pooledBrowser.createdAt > this.maxBrowserAge) {
          await this.recycleBrowser(pooledBrowser);
          pooledBrowser = await this.createPooledBrowser();
          if (!pooledBrowser) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
        }

        pooledBrowser.inUse = true;
        pooledBrowser.lastUsed = now;

        const release = async () => {
          let timeoutHandle: NodeJS.Timeout | null = null;
          try {
            const resetTimeout = new Promise<'timeout'>((resolve) => {
              timeoutHandle = setTimeout(() => resolve('timeout'), 5000);
            });
            const resetPage = pooledBrowser!.page.goto('about:blank').then(() => 'success' as const);
            const result = await Promise.race([resetPage, resetTimeout]);
            
            if (timeoutHandle) clearTimeout(timeoutHandle);
            
            if (result === 'timeout') {
              logger.warn('Page reset timed out, recycling browser');
              await this.recycleBrowser(pooledBrowser!);
            } else {
              pooledBrowser!.inUse = false;
              pooledBrowser!.lastUsed = Date.now();
            }
          } catch (error: any) {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            logger.warn('Error resetting page, recycling browser', { error: error.message });
            await this.recycleBrowser(pooledBrowser!);
          }
        };

        return {
          browser: pooledBrowser.browser,
          page: pooledBrowser.page,
          release,
        };
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.warn('Timed out waiting for available browser in pool');
    return null;
  }

  private async recycleBrowser(pooledBrowser: PooledBrowser): Promise<void> {
    const index = this.pool.indexOf(pooledBrowser);
    if (index > -1) {
      this.pool.splice(index, 1);
    }

    try {
      await pooledBrowser.page.close();
      await pooledBrowser.browser.close();
    } catch (error: any) {
      logger.warn('Error closing recycled browser', { error: error.message });
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up browser pool');
    for (const pooledBrowser of this.pool) {
      try {
        await pooledBrowser.page.close();
        await pooledBrowser.browser.close();
      } catch (error: any) {
        logger.warn('Error closing browser', { error: error.message });
      }
    }
    this.pool = [];
    this.initPromise = null;
  }

  getStats() {
    return {
      total: this.pool.length,
      available: this.pool.filter(pb => !pb.inUse).length,
      inUse: this.pool.filter(pb => pb.inUse).length,
      maxSize: this.maxPoolSize,
    };
  }
}

export const browserPool = new BrowserPool();
