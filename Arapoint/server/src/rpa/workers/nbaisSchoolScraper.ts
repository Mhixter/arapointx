import { Browser, Page } from 'puppeteer';
import { db } from '../../config/database';
import { nbaisSchools } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface SchoolRow {
  schoolName: string;
  schoolValue: string | null;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

interface SchoolData {
  state: string;
  schoolName: string;
  schoolValue: string;
}

export async function scrapeNbaisSchools(browser: Browser): Promise<{ success: boolean; message: string; count: number }> {
  let page: Page | null = null;
  const allSchools: SchoolData[] = [];

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('[NBAIS Scraper] Starting school scraping...');
    
    await page.goto('https://resultchecker.nbais.com.ng/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('select', { timeout: 10000 });

    for (const state of NIGERIAN_STATES) {
      try {
        console.log(`[NBAIS Scraper] Fetching schools for ${state}...`);
        
        const stateSelector = 'select[name="state"], select#state, select:has(option[value*="State"])';
        await page.waitForSelector(stateSelector, { timeout: 5000 });
        
        const stateFound = await page.evaluate((stateName: string, selector: string) => {
          const stateSelect = document.querySelector(selector) as HTMLSelectElement;
          if (!stateSelect) return false;
          
          for (let i = 0; i < stateSelect.options.length; i++) {
            const opt = stateSelect.options[i];
            if (opt.text.toLowerCase().includes(stateName.toLowerCase()) || 
                opt.value.toLowerCase().includes(stateName.toLowerCase())) {
              stateSelect.selectedIndex = i;
              stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        }, state, stateSelector);

        if (!stateFound) {
          console.log(`[NBAIS Scraper] State ${state} not found in dropdown`);
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        const schools = await page.evaluate(() => {
          const schoolSelect = document.querySelector('select[name="school"], select#school') as HTMLSelectElement;
          if (!schoolSelect) return [];
          
          const schoolList: { name: string; value: string }[] = [];
          for (let i = 0; i < schoolSelect.options.length; i++) {
            const opt = schoolSelect.options[i];
            if (opt.value && opt.value !== '' && !opt.text.toLowerCase().includes('select')) {
              schoolList.push({
                name: opt.text.trim(),
                value: opt.value
              });
            }
          }
          return schoolList;
        });

        for (const school of schools) {
          allSchools.push({
            state: state,
            schoolName: school.name,
            schoolValue: school.value
          });
        }

        console.log(`[NBAIS Scraper] Found ${schools.length} schools in ${state}`);
        
      } catch (stateError) {
        console.error(`[NBAIS Scraper] Error processing state ${state}:`, stateError);
      }
    }

    if (allSchools.length > 0) {
      await db.delete(nbaisSchools);
      
      const batchSize = 100;
      for (let i = 0; i < allSchools.length; i += batchSize) {
        const batch = allSchools.slice(i, i + batchSize);
        await db.insert(nbaisSchools).values(
          batch.map(s => ({
            state: s.state,
            schoolName: s.schoolName,
            schoolValue: s.schoolValue,
            isActive: true
          }))
        );
      }
      
      console.log(`[NBAIS Scraper] Saved ${allSchools.length} schools to database`);
    }

    return {
      success: true,
      message: `Successfully scraped ${allSchools.length} schools from ${NIGERIAN_STATES.length} states`,
      count: allSchools.length
    };

  } catch (error) {
    console.error('[NBAIS Scraper] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

export async function getSchoolsByState(state: string): Promise<{ schoolName: string; schoolValue: string }[]> {
  const schools: SchoolRow[] = await db
    .select({
      schoolName: nbaisSchools.schoolName,
      schoolValue: nbaisSchools.schoolValue
    })
    .from(nbaisSchools)
    .where(eq(nbaisSchools.state, state));

  return schools.map((s: SchoolRow) => ({
    schoolName: s.schoolName,
    schoolValue: s.schoolValue || s.schoolName
  }));
}

export async function getSchoolsCount(): Promise<number> {
  const result = await db.select().from(nbaisSchools);
  return result.length;
}
