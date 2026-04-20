import OpenAI from 'openai';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../utils/logger';
import { objectStorageService } from './objectStorage';
import { buildBannerHtml } from './bannerTemplate';

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1408, h: 768 },
  '4:3':  { w: 1280, h: 960 },
  '1:1':  { w: 1080, h: 1080 },
  '9:16': { w: 720,  h: 1280 },
};

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') throw new Error('OpenAI API key not configured');
  if (!_openai) {
    _openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

let _browser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
  return _browser;
}

export const SUBJECT_PRESETS: Record<string, string> = {
  'businesswoman': 'confident smiling young Nigerian businesswoman in modern navy blazer, professional studio portrait, soft office background, premium magazine quality',
  'businessman': 'confident smiling young Nigerian businessman in tailored navy suit, professional studio portrait, soft office background, premium magazine quality',
  'developer_male': 'focused young Nigerian male software developer at modern workstation, hoodie or smart casual, multi-monitor setup with code visible, contemporary tech office',
  'developer_female': 'focused smiling young Nigerian female software developer at modern workstation, casual smart attire, laptop with code visible, contemporary tech office',
  'agent': 'professional young Nigerian retail agent at service desk, dual monitors, friendly customer service environment, modern kiosk',
  'family_eid': 'joyful Nigerian Muslim family in elegant traditional Eid attire, warm celebratory mood, soft natural light, premium photography',
  'family_christmas': 'cheerful Nigerian family in Sunday best Christmas outfits, warm festive but professional tone, soft golden light',
  'family_sallah': 'joyful Nigerian Muslim family in colorful Sallah traditional attire celebrating, warm tones, premium photography',
  'independence': 'proud diverse Nigerian professionals smiling subtly with green-and-white patriotic accents, professional clean composition',
  'student': 'focused young Nigerian university student smiling at laptop, modern library or co-working space, natural light',
  'crowd_diverse': 'group of diverse smiling Nigerian professionals of different ages with subtle verified badges, social proof composition',
  'security': 'serious Nigerian compliance and security officer in formal attire reviewing shielded data dashboard, modern office',
  'ceo_portrait': 'distinguished Nigerian CEO in tailored suit, professional studio portrait, confident expression',
  'engineer_team': 'diverse Nigerian engineering team collaborating around whiteboard with system diagrams, modern tech office',
  'devops': 'confident Nigerian DevOps engineer in modern data center, glowing server racks subtle background',
  'photo_only': 'professional clean composition matching the headline context, premium magazine-quality commercial photography',
};

export interface GenerateBannerInput {
  category: string;
  audience: 'main' | 'developer';
  headline: string;
  highlightWord?: string;
  bodyText?: string;
  subjectPreset: string;
  customPhotoPrompt?: string;
  feature1Title?: string; feature1Desc?: string;
  feature2Title?: string; feature2Desc?: string;
  feature3Title?: string; feature3Desc?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
}

async function generatePhoto(prompt: string): Promise<{ buffer: Buffer; storedUrl: string | null }> {
  const openai = getOpenAI();
  const fullPrompt = `${prompt}. Photorealistic, premium commercial photography, sharp focus on subject, soft blurred background, no text or letters, no watermarks, clean composition, magazine quality.`;
  const result = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: fullPrompt,
    size: '1024x1024',
    quality: 'medium',
    n: 1,
  } as any);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI returned no image data');
  const buffer = Buffer.from(b64, 'base64');
  const storedUrl = await objectStorageService.uploadBuffer(buffer, 'image/png', 'marketing-banners/photos', '.png');
  return { buffer, storedUrl };
}

async function renderBannerHtml(html: string, w: number, h: number): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const png = await page.screenshot({ type: 'png', omitBackground: false, clip: { x: 0, y: 0, width: w, height: h } });
    return Buffer.from(png);
  } finally {
    await page.close().catch(() => {});
  }
}

async function compositeLogoOverlay(bannerBuffer: Buffer): Promise<Buffer> {
  // Logo is already embedded via HTML template; this remains as a safety overlay using ImageMagick
  // for cases where the HTML logo failed to render. Skipped if logo asset missing.
  const logoCandidates = [
    path.resolve(process.cwd(), 'attached_assets/generated_images/arapoint_a_mark_transparent.png'),
    path.resolve(process.cwd(), 'Arapoint/attached_assets/generated_images/arapoint_a_mark_transparent.png'),
  ];
  const logoPath = logoCandidates.find(p => fs.existsSync(p));
  if (!logoPath) return bannerBuffer;
  return bannerBuffer; // HTML template already embeds it; no extra composite needed
}

export async function generateBanner(input: GenerateBannerInput): Promise<{
  bannerBuffer: Buffer;
  bannerUrl: string;
  photoUrl: string | null;
  finalPhotoPrompt: string;
}> {
  const dims = ASPECT_DIMS[input.aspectRatio || '16:9'] || ASPECT_DIMS['16:9'];

  const subjectDesc = input.customPhotoPrompt?.trim()
    ? input.customPhotoPrompt.trim()
    : (SUBJECT_PRESETS[input.subjectPreset] || SUBJECT_PRESETS['photo_only']);

  logger.info('Banner Studio: generating photo', { category: input.category, headline: input.headline.slice(0, 80) });
  const { buffer: photoBuf, storedUrl: photoUrl } = await generatePhoto(subjectDesc);
  const photoDataUrl = `data:image/png;base64,${photoBuf.toString('base64')}`;

  logger.info('Banner Studio: rendering HTML template');
  const html = buildBannerHtml({
    headline: input.headline,
    highlightWord: input.highlightWord,
    bodyText: input.bodyText,
    photoDataUrl,
    feature1Title: input.feature1Title,
    feature1Desc: input.feature1Desc,
    feature2Title: input.feature2Title,
    feature2Desc: input.feature2Desc,
    feature3Title: input.feature3Title,
    feature3Desc: input.feature3Desc,
    width: dims.w,
    height: dims.h,
  });

  let bannerBuffer = await renderBannerHtml(html, dims.w, dims.h);
  bannerBuffer = await compositeLogoOverlay(bannerBuffer);

  const bannerUrl = await objectStorageService.uploadBuffer(bannerBuffer, 'image/png', 'marketing-banners/final', '.png');
  if (!bannerUrl) throw new Error('Failed to upload final banner to storage');

  return {
    bannerBuffer,
    bannerUrl,
    photoUrl,
    finalPhotoPrompt: subjectDesc,
  };
}

export async function buildBannerPdf(banners: { url: string; buffer?: Buffer }[]): Promise<Buffer> {
  if (banners.length === 0) throw new Error('No banners to export');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bannerpdf-'));
  try {
    const inputFiles: string[] = [];
    for (let i = 0; i < banners.length; i++) {
      let buf = banners[i].buffer;
      if (!buf) buf = await downloadObjectToBuffer(banners[i].url) || undefined;
      if (!buf) continue;
      const inJpg = path.join(tmpDir, `${String(i).padStart(3, '0')}.jpg`);
      await runCmd('magick', ['-', '-resize', '1024x576>', '-quality', '85', inJpg], buf);
      inputFiles.push(inJpg);
    }
    if (inputFiles.length === 0) throw new Error('No banner files were prepared for PDF');
    const outPdf = path.join(tmpDir, 'banners.pdf');
    await runCmd('magick', [...inputFiles, '-density', '150', outPdf]);
    return fs.readFileSync(outPdf);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

async function downloadObjectToBuffer(objectPath: string): Promise<Buffer | null> {
  try {
    const fileKey = await objectStorageService.getObjectEntityFile(objectPath);
    // objectStorageService.downloadObject only writes to res; emulate by streaming via client
    const { Client } = await import('@replit/object-storage');
    const client = new Client();
    const result = await client.downloadAsBytes(fileKey);
    if (!result.ok) return null;
    const v = (result as any).value;
    return Buffer.isBuffer(v) ? v : Buffer.from(v);
  } catch (err: any) {
    logger.warn('downloadObjectToBuffer failed', { error: err.message, objectPath });
    return null;
  }
}

function runCmd(cmd: string, args: string[], stdin?: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = '';
    p.stderr.on('data', d => stderr += d.toString());
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr}`)));
    if (stdin) {
      p.stdin.write(stdin);
      p.stdin.end();
    }
  });
}
