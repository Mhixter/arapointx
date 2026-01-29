import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { db } from '../config/database';
import { ninSlips } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface SlipData {
  nin: string;
  surname: string;
  firstname: string;
  middlename?: string;
  date_of_birth: string;
  gender?: string;
  photo?: string;
  tracking_id?: string;
  verification_reference?: string;
}

export interface GenerateSlipOptions {
  userId?: string;
  slipType: 'standard' | 'premium';
  data: SlipData;
}

export interface SlipResult {
  slipReference: string;
  pdfPath: string;
  verificationUrl: string;
}

const generateSlipReference = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SLIP-${timestamp}-${random}`.toUpperCase();
};

const formatNIN = (nin: string): string => {
  if (!nin) return '';
  const cleaned = nin.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  return cleaned;
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  } catch {
    return dateStr;
  }
};

const getBaseUrl = (): string => {
  return process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.BASE_URL || 'http://localhost:5000';
};

const loadTemplate = (slipType: 'standard' | 'premium'): string => {
  const templatePath = path.join(process.cwd(), 'server/src/templates', `${slipType}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${slipType}.html`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
};

const generateQRCode = async (data: object): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(data), {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

const injectDataIntoTemplate = (template: string, data: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
};

const ensureOutputDir = (): string => {
  const outputDir = path.join(process.cwd(), 'server/generated-slips');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
};

export const generatePdfSlip = async (options: GenerateSlipOptions): Promise<SlipResult> => {
  const { userId, slipType, data } = options;
  const slipReference = generateSlipReference();
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-slip/${slipReference}`;
  
  const qrCodeData = {
    slip_reference: slipReference,
    verification_status: 'verified',
    verification_url: verificationUrl,
    nin_masked: data.nin ? `***${data.nin.slice(-4)}` : ''
  };
  
  const qrCodeImage = await generateQRCode(qrCodeData);
  
  let template = loadTemplate(slipType);
  
  const photoSrc = data.photo 
    ? (data.photo.startsWith('data:') ? data.photo : `data:image/jpeg;base64,${data.photo}`)
    : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130"><rect fill="%23ddd" width="100" height="130"/><text x="50" y="70" text-anchor="middle" fill="%23999" font-size="12">Photo</text></svg>';
  
  const templateData: Record<string, string> = {
    nin: formatNIN(data.nin),
    surname: data.surname?.toUpperCase() || '',
    firstname: data.firstname?.toUpperCase() || '',
    middlename: data.middlename?.toUpperCase() || '',
    date_of_birth: formatDate(data.date_of_birth),
    gender: data.gender?.toUpperCase() || 'M',
    photo: photoSrc,
    qr_code: qrCodeImage,
    slip_reference: slipReference,
    verification_url: verificationUrl,
    issue_date: formatDate(new Date().toISOString()),
    tracking_id: data.tracking_id || ''
  };
  
  const populatedHtml = injectDataIntoTemplate(template, templateData);
  
  const outputDir = ensureOutputDir();
  const pdfFilename = `${slipReference}.pdf`;
  const pdfPath = path.join(outputDir, pdfFilename);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(populatedHtml, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  await db.insert(ninSlips).values({
    userId: userId || null,
    slipReference,
    slipType,
    nin: data.nin,
    surname: data.surname,
    firstname: data.firstname,
    middlename: data.middlename || null,
    dateOfBirth: data.date_of_birth,
    gender: data.gender || null,
    photo: data.photo || null,
    trackingId: data.tracking_id || null,
    verificationReference: data.verification_reference || null,
    verificationStatus: 'verified',
    pdfPath: pdfFilename,
    qrCodeData: JSON.stringify(qrCodeData)
  });
  
  return {
    slipReference,
    pdfPath: pdfFilename,
    verificationUrl
  };
};

export const getSlipPdf = async (slipReference: string, userId?: string): Promise<Buffer | null> => {
  const slip = await db.select().from(ninSlips).where(eq(ninSlips.slipReference, slipReference)).limit(1);
  
  if (!slip || slip.length === 0) {
    return null;
  }
  
  if (userId && slip[0].userId && slip[0].userId !== userId) {
    return null;
  }
  
  const pdfPath = path.join(process.cwd(), 'server/generated-slips', slip[0].pdfPath || '');
  
  if (!fs.existsSync(pdfPath)) {
    return null;
  }
  
  await db.update(ninSlips)
    .set({ downloadCount: (slip[0].downloadCount || 0) + 1 })
    .where(eq(ninSlips.slipReference, slipReference));
  
  return fs.readFileSync(pdfPath);
};

export const getSlipInfo = async (slipReference: string): Promise<{
  verified: boolean;
  slipType?: string;
  surname?: string;
  firstname?: string;
  ninMasked?: string;
  verificationStatus?: string;
  createdAt?: Date;
} | null> => {
  const slip = await db.select().from(ninSlips).where(eq(ninSlips.slipReference, slipReference)).limit(1);
  
  if (!slip || slip.length === 0) {
    return null;
  }
  
  const record = slip[0];
  
  return {
    verified: true,
    slipType: record.slipType,
    surname: record.surname,
    firstname: record.firstname,
    ninMasked: record.nin ? `***${record.nin.slice(-4)}` : '',
    verificationStatus: record.verificationStatus || 'verified',
    createdAt: record.createdAt || undefined
  };
};

export default {
  generatePdfSlip,
  getSlipPdf,
  getSlipInfo
};
