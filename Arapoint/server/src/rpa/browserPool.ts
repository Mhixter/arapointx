import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';

interface PooledBrowser {
  browser: Browser;
  page: Page;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
}

/** Shared puppeteer launch args — keeps memory low on constrained hosts (Render, etc.) */
export const PUPPETEER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--no-zygote',
  '--single-process',          // reduces per-browser overhead on Linux
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--disable-translate',
  '--mute-audio',
  '--no-first-run',
];

export const PUPPETEER_EXECUTABLE =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROMIUM_PATH ||
  '/usr/bin/google-chrome-stable';

class BrowserPool {
  private pool: PooledBrowser[] = [];
  private maxPoolSize: number = 3;
  private maxBrowserAge: number = 300_000; // 5 min
  private initPromise: Promise<void> | null = null;

  /** Tracks browsers being created right now — prevents concurrent over-creation races. */
  private _pendingCreations = 0;

  async initialize(poolSize: number = 3): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doInitialize(poolSize);
    return this.initPromise;
  }

  private async doInitialize(poolSize: number): Promise<void> {
    this.maxPoolSize = poolSize;
    logger.info(`Initializing browser pool with ${poolSize} browsers`);

    // Create browsers one at a time to avoid OOM spikes at startup
    for (let i = 0; i < poolSize; i++) {
      await this.createPooledBrowser();
      logger.info(`Browser pool progress: ${this.pool.length}/${poolSize} browsers created`);
    }

    logger.info(`Browser pool initialized with ${this.pool.length} browsers`);
  }

  private async createPooledBrowser(): Promise<PooledBrowser | null> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: PUPPETEER_EXECUTABLE,
        args: PUPPETEER_LAUNCH_ARGS,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setDefaultTimeout(30_000);

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

  async acquire(maxWaitMs: number = 30_000): Promise<{ browser: Browser; page: Page; release: () => Promise<void> } | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      // ── 1. Find an idle browser ───────────────────────────────────────────
      let pooledBrowser: PooledBrowser | undefined = this.pool.find(pb => !pb.inUse);

      // ── 2. Expand pool if below capacity (race-safe via _pendingCreations) ─
      if (!pooledBrowser && (this.pool.length + this._pendingCreations) < this.maxPoolSize) {
        this._pendingCreations++;
        const newBrowser = await this.createPooledBrowser();
        this._pendingCreations--;
        if (newBrowser) {
          pooledBrowser = newBrowser;
        }
        // Re-check in case something became free while we were creating
        if (!pooledBrowser) {
          pooledBrowser = this.pool.find(pb => !pb.inUse);
        }
      }

      if (pooledBrowser) {
        const now = Date.now();

        // ── 3. Recycle stale browsers ────────────────────────────────────────
        if (now - pooledBrowser.createdAt > this.maxBrowserAge) {
          await this.recycleBrowser(pooledBrowser);
          // recycleBrowser schedules async replenishment; wait one tick then retry
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }

        pooledBrowser.inUse = true;
        pooledBrowser.lastUsed = now;

        const release = async () => {
          let timeoutHandle: NodeJS.Timeout | null = null;
          try {
            const resetTimeout = new Promise<'timeout'>((resolve) => {
              timeoutHandle = setTimeout(() => resolve('timeout'), 5_000);
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

        return { browser: pooledBrowser.browser, page: pooledBrowser.page, release };
      }

      // Pool fully occupied — wait 200 ms then retry
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    logger.warn('Timed out waiting for available browser in pool', { poolStats: this.getStats() });
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

    // ── Auto-replenish: replace the recycled slot in the background ──────────
    const shouldReplenish = (this.pool.length + this._pendingCreations) < this.maxPoolSize;
    if (shouldReplenish) {
      this._pendingCreations++;
      this.createPooledBrowser()
        .then(() => { this._pendingCreations = Math.max(0, this._pendingCreations - 1); })
        .catch(() => { this._pendingCreations = Math.max(0, this._pendingCreations - 1); });
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
    this._pendingCreations = 0;
  }

  getStats() {
    return {
      total: this.pool.length,
      available: this.pool.filter(pb => !pb.inUse).length,
      inUse: this.pool.filter(pb => pb.inUse).length,
      maxSize: this.maxPoolSize,
      pendingCreations: this._pendingCreations,
    };
  }
}

export const browserPool = new BrowserPool();
