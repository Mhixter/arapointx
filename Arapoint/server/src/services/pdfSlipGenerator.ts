import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { db } from '../config/database';
import { ninSlips } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface SlipPositions {
  photo_top: string;
  photo_left: string;
  photo_width: string;
  surname_top: string;
  surname_left: string;
  surname_size: string;
  names_top: string;
  names_left: string;
  names_size: string;
  dob_top: string;
  dob_left: string;
  dob_size: string;
  nin_top: string;
  nin_left: string;
  nin_size: string;
  qr_top: string;
  qr_right: string;
  qr_width: string;
  sex_top?: string;
  sex_left?: string;
  sex_size?: string;
  issue_top?: string;
  issue_right?: string;
  issue_size?: string;
  tracking_top?: string;
  tracking_left?: string;
  tracking_size?: string;
}

const defaultPositions: Record<'standard' | 'premium' | 'long', SlipPositions> = {
  standard: {
    photo_top: '33%',
    photo_left: '31%',
    photo_width: '10%',
    surname_top: '35.3%',
    surname_left: '41.5%',
    surname_size: '10px',
    names_top: '38%',
    names_left: '41.5%',
    names_size: '10px',
    dob_top: '41%',
    dob_left: '41.5%',
    dob_size: '10px',
    nin_top: '45%',
    nin_left: '39.5%',
    nin_size: '18px',
    qr_top: '34.5%',
    qr_right: '29.5%',
    qr_width: '12%'
  },
  premium: {
    photo_top: '48%',
    photo_left: '29%',
    photo_width: '10.5%',
    surname_top: '49.3%',
    surname_left: '40.1%',
    surname_size: '12px',
    names_top: '53%',
    names_left: '40.1%',
    names_size: '12px',
    dob_top: '56.7%',
    dob_left: '40.1%',
    dob_size: '12px',
    nin_top: '60.9%',
    nin_left: '38.9%',
    nin_size: '18px',
    qr_top: '43.5%',
    qr_right: '26.5%',
    qr_width: '12.5%',
    sex_top: '56.9%',
    sex_left: '55%',
    sex_size: '12px',
    issue_top: '57%',
    issue_right: '28%',
    issue_size: '11px'
  },
  long: {
    photo_top: '42%',
    photo_left: '81.5%',
    photo_width: '13.8%',
    surname_top: '43.7%',
    surname_left: '35.4%',
    surname_size: '11px',
    names_top: '47.5%',
    names_left: '37.4%',
    names_size: '11px',
    dob_top: '',
    dob_left: '',
    dob_size: '',
    nin_top: '47.3%',
    nin_left: '10%',
    nin_size: '14px',
    qr_top: '',
    qr_right: '',
    qr_width: '',
    sex_top: '54%',
    sex_left: '35%',
    sex_size: '12px',
    tracking_top: '43.7%',
    tracking_left: '13%',
    tracking_size: '11px'
  }
};

let customPositions: Record<string, SlipPositions> = {};

export const getSlipPositions = (slipType: 'standard' | 'premium' | 'long'): SlipPositions => {
  return customPositions[slipType] || defaultPositions[slipType];
};

export const setSlipPositions = (slipType: 'standard' | 'premium' | 'long', positions: Partial<SlipPositions>): SlipPositions => {
  const current = getSlipPositions(slipType);
  customPositions[slipType] = { ...current, ...positions };
  return customPositions[slipType];
};

export const getDefaultPositions = () => defaultPositions;

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
  slipType: 'standard' | 'premium' | 'long';
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

const loadTemplate = (slipType: 'standard' | 'premium' | 'long'): string => {
  const templatePath = path.join(process.cwd(), 'server/src/templates', `${slipType}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${slipType}.html`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
};

const loadTemplateImage = (slipType: 'standard' | 'premium' | 'long'): string => {
  const imagePath = path.join(process.cwd(), 'server/src/templates', `${slipType}_template-1.png`);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Template image not found: ${slipType}_template-1.png`);
  }
  const imageBuffer = fs.readFileSync(imagePath);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
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
  const templateImage = loadTemplateImage(slipType);
  const positions = getSlipPositions(slipType);
  
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
    tracking_id: data.tracking_id || '',
    photo_top: positions.photo_top,
    photo_left: positions.photo_left,
    photo_width: positions.photo_width,
    surname_top: positions.surname_top,
    surname_left: positions.surname_left,
    surname_size: positions.surname_size,
    names_top: positions.names_top,
    names_left: positions.names_left,
    names_size: positions.names_size,
    dob_top: positions.dob_top,
    dob_left: positions.dob_left,
    dob_size: positions.dob_size,
    nin_top: positions.nin_top,
    nin_left: positions.nin_left,
    nin_size: positions.nin_size,
    qr_top: positions.qr_top,
    qr_right: positions.qr_right,
    qr_width: positions.qr_width,
    sex_top: positions.sex_top || '',
    sex_left: positions.sex_left || '',
    sex_size: positions.sex_size || '',
    issue_top: positions.issue_top || '',
    issue_right: positions.issue_right || '',
    issue_size: positions.issue_size || '',
    tracking_top: positions.tracking_top || '',
    tracking_left: positions.tracking_left || '',
    tracking_size: positions.tracking_size || '',
    template_image: templateImage
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
    
    await page.setViewport({ width: 1240, height: 1754 });
    
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
