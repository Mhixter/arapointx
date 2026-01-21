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

      const results = [];

      for (const network of VTPassScraperWorker.NETWORKS) {
        logger.info(`Scraping plans for network: ${network}`);
        
        // Click on the network logo/button
        // Selector logic: VTPass usually has images or buttons with alt text or classes for networks
        const networkSelector = `img[alt*="${network}" i], button[class*="${network}" i]`;
        const networkBtn = await page.$(networkSelector);
        
        if (networkBtn) {
          await networkBtn.click();
          await new Promise(r => setTimeout(r, 2000)); // Wait for animation/load
          
          // Extract plans from the dropdown or list
          const plans = await page.evaluate((networkName) => {
            const planElements = document.querySelectorAll('select#variation option, .variation-list li');
            const extracted = [];
            
            for (const el of Array.from(planElements)) {
              const text = el.textContent?.trim() || '';
              // Skip "Select" placeholders
              if (text.toLowerCase().includes('select')) continue;
              
              // Extract price using regex
              const priceMatch = text.match(/₦?\s*([\d,]+)/);
              if (priceMatch) {
                const amount = priceMatch[1].replace(/,/g, '');
                const id = el instanceof HTMLOptionElement ? el.value : (el.getAttribute('data-value') || text);
                
                extracted.push({
                  id: `${networkName}_${id}`,
                  name: text,
                  amount: amount
                });
              }
            }
            return extracted;
          }, network);

          for (const plan of plans) {
            const costPrice = parseFloat(plan.amount);
            const sellingPrice = Math.ceil(costPrice * 1.4); // 40% markup for normal users
            const resellerPrice = Math.ceil(costPrice * 1.2); // 20% markup for resellers

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
