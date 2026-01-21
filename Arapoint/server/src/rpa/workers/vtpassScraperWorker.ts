import { Browser, Page } from 'puppeteer';
import { logger } from '../../utils/logger';
import { browserPool } from '../browserPool';
import { db } from '../../config/database';
import { scrapedDataPlans } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class VTPassScraperWorker {
  private static readonly PORTAL_URL = 'https://www.vtpass.com/data-bundles';
  private static readonly NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];

  async execute(): Promise<{ success: boolean; data?: any; error?: string }> {
    let pooledResource: { browser: Browser; page: Page; release: () => Promise<void> } | null = null;
    
    try {
      pooledResource = await browserPool.acquire();
      if (!pooledResource) {
        throw new Error('No available browser from pool');
      }
      
      const { page } = pooledResource;
      logger.info('Starting VTPass Data Scraper');
      
      await page.goto(VTPassScraperWorker.PORTAL_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });

      // Handle cookie consent if it appears
      try {
        const cookieBtn = await page.$('#accept-cookies, .cookie-accept, button:contains("Accept")');
        if (cookieBtn) await cookieBtn.click();
      } catch (e) {}

      const results = [];

      for (const network of VTPassScraperWorker.NETWORKS) {
        logger.info(`Scraping plans for network: ${network}`);
        
        try {
          // VTPass selector update: images with alt text or specific classes
          const networkSelectors = [
            `img[alt*="${network}" i]`,
            `button:contains("${network.toUpperCase()}")`,
            `a:contains("${network.toUpperCase()}")`,
            `.network-logo-${network}`,
            `[data-network="${network}"]`
          ];
          
          let networkBtn = null;
          for (const selector of networkSelectors) {
            try {
              networkBtn = await page.$(selector);
              if (networkBtn) break;
            } catch (e) {}
          }
          
          if (!networkBtn) {
            // Try to find by text content if selectors fail
            const buttons = await page.$$('button, a, div.network-item');
            for (const btn of buttons) {
              const text = await page.evaluate(el => el.textContent, btn);
              if (text?.toLowerCase().includes(network.toLowerCase())) {
                networkBtn = btn;
                break;
              }
            }
          }
          
          if (networkBtn) {
            await networkBtn.click();
            logger.info(`Clicked ${network} button`);
            await new Promise(r => setTimeout(r, 5000));
            
            // Explicitly wait for variation select to be populated
            try {
              await page.waitForSelector('select#variation option:not([value=""])', { timeout: 5000 });
            } catch (e) {
              logger.warn(`Variation select not populated for ${network} within timeout`);
            }
            
            const plans = await page.evaluate((networkName) => {
              const extracted: any[] = [];
              const seen = new Set();
              
              // Helper to extract from any element
              const processElement = (el: Element) => {
                const text = (el.textContent || el.getAttribute('data-name') || el.getAttribute('title') || '').trim();
                if (!text || text.toLowerCase().includes('select')) return;
                
                const priceMatch = text.match(/[₦N]?\s*([\d,]+)/i);
                if (priceMatch) {
                  const amount = priceMatch[1].replace(/,/g, '');
                  const val = el instanceof HTMLOptionElement ? el.value : (el.getAttribute('data-value') || el.getAttribute('id') || text);
                  const id = `${networkName}_${val}`;
                  
                  if (!seen.has(id)) {
                    extracted.push({ id, name: text, amount });
                    seen.add(id);
                  }
                }
              };

              // Check dropdowns
              document.querySelectorAll('select#variation option').forEach(processElement);
              // Check list items
              document.querySelectorAll('.variation-list li, .variation-option, .variation-item, .variation-list-item').forEach(processElement);
              // Check specialized containers
              document.querySelectorAll('[data-variation-id], [data-product-id]').forEach(processElement);
              
              return extracted;
            }, network);

            logger.info(`Found ${plans.length} plans for ${network}`);
            
            for (const plan of plans) {
              const costPrice = parseFloat(plan.amount);
              if (isNaN(costPrice)) continue;
              
              const sellingPrice = Math.ceil(costPrice * 1.4);
              const resellerPrice = Math.ceil(costPrice * 1.2);

              await db.insert(scrapedDataPlans)
                .values({
                  network: network,
                  planId: plan.id,
                  planName: plan.name,
                  costPrice: costPrice.toString(),
                  sellingPrice: sellingPrice.toString(),
                  resellerPrice: resellerPrice.toString(),
                  isActive: true,
                  lastScrapedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [scrapedDataPlans.network, scrapedDataPlans.planId],
                  set: {
                    planName: plan.name,
                    costPrice: costPrice.toString(),
                    sellingPrice: sellingPrice.toString(),
                    resellerPrice: resellerPrice.toString(),
                    lastScrapedAt: new Date(),
                  }
                });
              
              results.push({ network, ...plan, sellingPrice, resellerPrice });
            }
          } else {
            logger.warn(`Network button not found for ${network}`);
          }
        } catch (netErr: any) {
          logger.error(`Error scraping ${network}`, { error: netErr.message });
        }
      }

      return { success: true, data: { scrapedCount: results.length } };
    } catch (error: any) {
      logger.error('VTPass Scraper Error', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      if (pooledResource) {
        await pooledResource.release();
      }
    }
  }
}

export const vtpassScraperWorker = new VTPassScraperWorker();
