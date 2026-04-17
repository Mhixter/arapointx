import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from '../config/database';
import { providerHealth, adminSettings } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FAILURE_THRESHOLD = 3;
const NAV_TIMEOUT = 25000;

export type ProviderName = 'waec' | 'neco' | 'nabteb' | 'nbais';

interface CheckResult {
  ok: boolean;
  error?: string;
  preview?: string;
}

const PROVIDER_CONFIGS: Record<ProviderName, { defaultUrl: string; settingKey: string }> = {
  waec: { defaultUrl: 'https://waecdirect.org/', settingKey: 'waec_portal_url' },
  neco: { defaultUrl: 'https://results.neco.gov.ng/', settingKey: 'neco_portal_url' },
  nabteb: { defaultUrl: 'https://eworld.nabteb.gov.ng/', settingKey: 'nabteb_portal_url' },
  nbais: { defaultUrl: 'https://result.nbais.gov.ng/', settingKey: 'nbais_portal_url' },
};

async function getPortalUrl(provider: ProviderName): Promise<string> {
  try {
    const cfg = PROVIDER_CONFIGS[provider];
    const setting = await db.select().from(adminSettings).where(eq(adminSettings.key, cfg.settingKey)).limit(1);
    return setting[0]?.value || cfg.defaultUrl;
  } catch {
    return PROVIDER_CONFIGS[provider].defaultUrl;
  }
}

async function checkWaec(page: Page, url: string): Promise<CheckResult> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  const ok = await page.evaluate(() => {
    return !!(document.querySelector('input[name="ExamNo"]') || document.querySelector('#ExamNo') ||
              document.querySelector('input[name="CardSN"]') || document.querySelector('#CardSN'));
  });
  if (!ok) {
    const preview = (await page.evaluate(() => document.body.innerText)).slice(0, 200);
    return { ok: false, error: 'WAEC form fields not found (selectors may have changed)', preview };
  }
  return { ok: true };
}

async function checkNeco(page: Page, url: string): Promise<CheckResult> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  const ok = await page.evaluate(() => {
    return !!(document.querySelector('input[name="token"]') || document.querySelector('#token') ||
              document.querySelector('input[name="examNo"]') || document.querySelector('input[name="examnumber"]'));
  });
  if (!ok) {
    const preview = (await page.evaluate(() => document.body.innerText)).slice(0, 200);
    return { ok: false, error: 'NECO form fields not found (selectors may have changed)', preview };
  }
  return { ok: true };
}

async function checkNabteb(page: Page, url: string): Promise<CheckResult> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  const fields = await page.evaluate(() => {
    return {
      candid: !!document.querySelector('#candid'),
      pin: !!document.querySelector('#pin'),
      serial: !!document.querySelector('#serial'),
      examtype: !!document.querySelector('#examtype'),
      submit: !!document.querySelector('input[name="Submit"]'),
    };
  });
  const missing = Object.entries(fields).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    const preview = (await page.evaluate(() => document.body.innerText)).slice(0, 200);
    return { ok: false, error: `NABTEB missing fields: ${missing.join(', ')}`, preview };
  }
  return { ok: true };
}

async function checkNbais(page: Page, url: string): Promise<CheckResult> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT });
  const ok = await page.evaluate(() => {
    return !!(document.querySelector('#parent_cat') && document.querySelector('input[name="exam_no"]'));
  });
  if (!ok) {
    const preview = (await page.evaluate(() => document.body.innerText)).slice(0, 200);
    return { ok: false, error: 'NBAIS form fields not found (selectors may have changed)', preview };
  }
  return { ok: true };
}

const CHECKERS: Record<ProviderName, (page: Page, url: string) => Promise<CheckResult>> = {
  waec: checkWaec,
  neco: checkNeco,
  nabteb: checkNabteb,
  nbais: checkNbais,
};

async function runOneCheck(provider: ProviderName): Promise<CheckResult> {
  let browser: Browser | null = null;
  try {
    const url = await getPortalUrl(provider);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    return await CHECKERS[provider](page, url);
  } catch (e: any) {
    return { ok: false, error: `Health check error: ${e.message}` };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function recordResult(provider: ProviderName, result: CheckResult): Promise<void> {
  const existing = await db.select().from(providerHealth).where(eq(providerHealth.provider, provider)).limit(1);

  if (!existing[0]) {
    await db.insert(providerHealth).values({
      provider,
      status: result.ok ? 'healthy' : 'broken',
      lastCheckedAt: new Date(),
      lastSuccessAt: result.ok ? new Date() : null,
      consecutiveFailures: result.ok ? 0 : 1,
      lastError: result.ok ? null : result.error,
      lastResponsePreview: result.preview ?? null,
      isAutoDisabled: false,
      totalChecks: 1,
      totalFailures: result.ok ? 0 : 1,
    });
    return;
  }

  const row = existing[0];
  const newConsecutive = result.ok ? 0 : (row.consecutiveFailures + 1);
  const shouldAutoDisable = !result.ok && newConsecutive >= FAILURE_THRESHOLD && !row.isAutoDisabled;

  await db.update(providerHealth).set({
    status: result.ok ? 'healthy' : (newConsecutive >= FAILURE_THRESHOLD ? 'broken' : 'degraded'),
    lastCheckedAt: new Date(),
    lastSuccessAt: result.ok ? new Date() : row.lastSuccessAt,
    consecutiveFailures: newConsecutive,
    lastError: result.ok ? null : result.error,
    lastResponsePreview: result.preview ?? null,
    isAutoDisabled: shouldAutoDisable ? true : row.isAutoDisabled,
    autoDisabledAt: shouldAutoDisable ? new Date() : row.autoDisabledAt,
    totalChecks: row.totalChecks + 1,
    totalFailures: row.totalFailures + (result.ok ? 0 : 1),
    updatedAt: new Date(),
  }).where(eq(providerHealth.provider, provider));

  if (shouldAutoDisable) {
    logger.warn(`Provider ${provider} auto-disabled after ${newConsecutive} consecutive failures`, { error: result.error });
    await db.insert(adminSettings).values({
      key: `${provider}_enabled`,
      value: 'false',
    }).onConflictDoUpdate({
      target: adminSettings.key,
      set: { value: 'false', updatedAt: new Date() },
    });
  }
}

export async function runHealthCheck(provider: ProviderName): Promise<CheckResult> {
  logger.info(`Health check starting: ${provider}`);
  const result = await runOneCheck(provider);
  await recordResult(provider, result);
  logger.info(`Health check complete: ${provider}`, { ok: result.ok, error: result.error });
  return result;
}

export async function runAllHealthChecks(): Promise<void> {
  const providers: ProviderName[] = ['waec', 'neco', 'nabteb', 'nbais'];
  for (const p of providers) {
    try {
      await runHealthCheck(p);
    } catch (e: any) {
      logger.error(`Health check failed for ${p}`, { error: e.message });
    }
  }
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startHealthMonitor(): void {
  if (intervalHandle) return;
  logger.info(`Health monitor starting (interval: ${CHECK_INTERVAL_MS / 1000 / 60} min)`);
  setTimeout(() => { runAllHealthChecks().catch((e) => logger.error('Initial health check error', { error: e.message })); }, 60 * 1000);
  intervalHandle = setInterval(() => {
    runAllHealthChecks().catch((e) => logger.error('Scheduled health check error', { error: e.message }));
  }, CHECK_INTERVAL_MS);
}

export function stopHealthMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
