import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";
import { db } from "../config/database";
import { ninSlips } from "../db/schema";
import { eq } from "drizzle-orm";

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
  issue_left?: string;
  issue_size?: string;
  tracking_top?: string;
  tracking_left?: string;
  tracking_size?: string;
  address_top?: string;
  address_left?: string;
  address_size?: string;
  phone_top?: string;
  phone_left?: string;
  phone_size?: string;
  state_top?: string;
  state_left?: string;
  state_size?: string;
  lga_top?: string;
  lga_left?: string;
  lga_size?: string;
  birth_state_top?: string;
  birth_state_left?: string;
  birth_state_size?: string;
  birth_lga_top?: string;
  birth_lga_left?: string;
  birth_lga_size?: string;
  nationality_top?: string;
  nationality_left?: string;
  nationality_size?: string;
}

const defaultPositions: Record<"standard" | "premium" | "long" | "full_info", SlipPositions> =
  {
    standard: {
      photo_top: "33%",
      photo_left: "31%",
      photo_width: "10%",
      surname_top: "35.3%",
      surname_left: "41.5%",
      surname_size: "12px",
      names_top: "38%",
      names_left: "41.5%",
      names_size: "12px",
      dob_top: "41%",
      dob_left: "41.5%",
      dob_size: "12px",
      nin_top: "45%",
      nin_left: "36%",
      nin_size: "40px",
      qr_top: "34.5%",
      qr_right: "29.5%",
      qr_width: "12%",
    },
    premium: {
      photo_top: "48%",
      photo_left: "29%",
      photo_width: "10.5%",
      surname_top: "49.3%",
      surname_left: "40.1%",
      surname_size: "15px",
      names_top: "53%",
      names_left: "40.1%",
      names_size: "15px",
      dob_top: "56.7%",
      dob_left: "40.1%",
      dob_size: "15px",
      nin_top: "60.9%",
      nin_left: "35.5%",
      nin_size: "40px",
      qr_top: "43.5%",
      qr_right: "26.5%",
      qr_width: "12.5%",
      sex_top: "56.9%",
      sex_left: "55%",
      sex_size: "15px",
      issue_top: "57%",
      issue_right: "28%",
      issue_size: "15px",
    },
    long: {
      photo_top: "42%",
      photo_left: "81.5%",
      photo_width: "13.8%",
      surname_top: "44%",
      surname_left: "35.4%",
      surname_size: "16px",
      names_top: "47.5%",
      names_left: "37.4%",
      names_size: "16px",
      dob_top: "",
      dob_left: "",
      dob_size: "",
      nin_top: "47.3%",
      nin_left: "10%",
      nin_size: "16px",
      qr_top: "",
      qr_right: "",
      qr_width: "",
      sex_top: "54.1%",
      sex_left: "35%",
      sex_size: "16px",
      tracking_top: "43.7%",
      tracking_left: "13%",
      tracking_size: "16px",
      address_top: "58%",
      address_left: "10%",
      address_size: "14px",
    },
    full_info: {
      photo_top: "18%",
      photo_left: "10%",
      photo_width: "18%",
      surname_top: "19%",
      surname_left: "32%",
      surname_size: "14px",
      names_top: "23%",
      names_left: "32%",
      names_size: "14px",
      dob_top: "27%",
      dob_left: "32%",
      dob_size: "14px",
      nin_top: "35%",
      nin_left: "32%",
      nin_size: "16px",
      qr_top: "18%",
      qr_right: "8%",
      qr_width: "15%",
      sex_top: "31%",
      sex_left: "32%",
      sex_size: "14px",
      issue_top: "39%",
      issue_left: "32%",
      issue_size: "14px",
      tracking_top: "43%",
      tracking_left: "32%",
      tracking_size: "14px",
      address_top: "51%",
      address_left: "32%",
      address_size: "13px",
      phone_top: "55%",
      phone_left: "32%",
      phone_size: "14px",
      state_top: "59%",
      state_left: "32%",
      state_size: "14px",
      lga_top: "63%",
      lga_left: "32%",
      lga_size: "14px",
      birth_state_top: "67%",
      birth_state_left: "32%",
      birth_state_size: "14px",
      birth_lga_top: "71%",
      birth_lga_left: "32%",
      birth_lga_size: "14px",
      nationality_top: "75%",
      nationality_left: "32%",
      nationality_size: "14px",
    },
  };

let customPositions: Record<string, SlipPositions> = {};

export const getSlipPositions = (
  slipType: "standard" | "premium" | "long" | "full_info",
): SlipPositions => {
  return customPositions[slipType] || defaultPositions[slipType];
};

export const setSlipPositions = (
  slipType: "standard" | "premium" | "long" | "full_info",
  positions: Partial<SlipPositions>,
): SlipPositions => {
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
  address?: string;
  phone?: string;
  state?: string;
  lga?: string;
  birthState?: string;
  birthLga?: string;
  town?: string;
  nationality?: string;
  maritalStatus?: string;
  email?: string;
}

export interface GenerateSlipOptions {
  userId?: string;
  slipType: "standard" | "premium" | "long" | "full_info";
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
  if (!nin) return "";
  const cleaned = nin.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return cleaned;
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  } catch {
    return dateStr;
  }
};

const getBaseUrl = (): string => {
  return process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.BASE_URL || "http://localhost:5000";
};

const loadTemplate = (slipType: "standard" | "premium" | "long" | "full_info"): string => {
  const templatePath = path.join(
    process.cwd(),
    "server/src/templates",
    `${slipType}.html`,
  );
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${slipType}.html`);
  }
  return fs.readFileSync(templatePath, "utf-8");
};

const loadTemplateImage = (
  slipType: "standard" | "premium" | "long" | "full_info",
): string => {
  const imagePath = path.join(
    process.cwd(),
    "server/src/templates",
    `${slipType}_template.png`,
  );
  if (!fs.existsSync(imagePath)) {
    const altPath = path.join(
      process.cwd(),
      "server/src/templates",
      `${slipType}_template-1.png`,
    );
    if (!fs.existsSync(altPath)) {
      throw new Error(`Template image not found: ${slipType}_template.png`);
    }
    const imageBuffer = fs.readFileSync(altPath);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  }
  const imageBuffer = fs.readFileSync(imagePath);
  return `data:image/png;base64,${imageBuffer.toString("base64")}`;
};

const generateQRCode = async (data: object): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(data), {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw error;
  }
};

const injectDataIntoTemplate = (
  template: string,
  data: Record<string, string>,
): string => {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
};

const ensureOutputDir = (): string => {
  const outputDir = path.join(process.cwd(), "server/generated-slips");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
};

export const generatePdfSlip = async (
  options: GenerateSlipOptions,
): Promise<SlipResult> => {
  const { userId, slipType, data } = options;
  const slipReference = generateSlipReference();
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-slip/${slipReference}`;

  const qrCodeData = {
    slip_reference: slipReference,
    verification_status: "verified",
    verification_url: verificationUrl,
    nin_masked: data.nin ? `***${data.nin.slice(-4)}` : "",
  };

  const qrCodeImage = await generateQRCode(qrCodeData);

  let template = loadTemplate(slipType);
  const templateImage = loadTemplateImage(slipType);
  const positions = getSlipPositions(slipType);

  const photoSrc = data.photo
    ? data.photo.startsWith("data:")
      ? data.photo
      : `data:image/jpeg;base64,${data.photo}`
    : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130"><rect fill="%23ddd" width="100" height="130"/><text x="50" y="70" text-anchor="middle" fill="%23999" font-size="12">Photo</text></svg>';

  const templateData: Record<string, string> = {
    nin: formatNIN(data.nin),
    surname: data.surname?.toUpperCase() || "",
    firstname: data.firstname?.toUpperCase() || "",
    middlename: data.middlename?.toUpperCase() || "",
    date_of_birth: formatDate(data.date_of_birth),
    gender: data.gender?.toUpperCase() || "M",
    photo: photoSrc,
    qr_code: qrCodeImage,
    slip_reference: slipReference,
    verification_url: verificationUrl,
    issue_date: formatDate(new Date().toISOString()),
    tracking_id: data.tracking_id || "",
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
    sex_top: positions.sex_top || "",
    sex_left: positions.sex_left || "",
    sex_size: positions.sex_size || "",
    issue_top: positions.issue_top || "",
    issue_right: positions.issue_right || "",
    issue_size: positions.issue_size || "",
    tracking_top: positions.tracking_top || "",
    tracking_left: positions.tracking_left || "",
    tracking_size: positions.tracking_size || "",
    address: data.address?.toUpperCase() || "",
    address_top: positions.address_top || "",
    address_left: positions.address_left || "",
    address_size: positions.address_size || "",
    phone: data.phone || "",
    phone_top: positions.phone_top || "",
    phone_left: positions.phone_left || "",
    phone_size: positions.phone_size || "",
    state: data.state?.toUpperCase() || "",
    state_top: positions.state_top || "",
    state_left: positions.state_left || "",
    state_size: positions.state_size || "",
    lga: data.lga?.toUpperCase() || "",
    lga_top: positions.lga_top || "",
    lga_left: positions.lga_left || "",
    lga_size: positions.lga_size || "",
    birth_state: data.birthState?.toUpperCase() || "",
    birth_state_top: positions.birth_state_top || "",
    birth_state_left: positions.birth_state_left || "",
    birth_state_size: positions.birth_state_size || "",
    birth_lga: data.birthLga?.toUpperCase() || "",
    birth_lga_top: positions.birth_lga_top || "",
    birth_lga_left: positions.birth_lga_left || "",
    birth_lga_size: positions.birth_lga_size || "",
    nationality: data.nationality?.toUpperCase() || "NIGERIAN",
    nationality_top: positions.nationality_top || "",
    nationality_left: positions.nationality_left || "",
    nationality_size: positions.nationality_size || "",
    issue_left: positions.issue_left || "",
    template_image: templateImage,
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
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });

    const page = await browser.newPage();

    const dimensions = slipType === 'full_info' 
      ? { width: 1162, height: 1758 }
      : { width: 1267, height: 1652 };

    await page.setViewport(dimensions);

    await page.setContent(populatedHtml, { waitUntil: "networkidle0" });

    await page.pdf({
      path: pdfPath,
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
    verificationStatus: "verified",
    pdfPath: pdfFilename,
    qrCodeData: JSON.stringify(qrCodeData),
  });

  return {
    slipReference,
    pdfPath: pdfFilename,
    verificationUrl,
  };
};

export const getSlipPdf = async (
  slipReference: string,
  userId?: string,
): Promise<Buffer | null> => {
  const slip = await db
    .select()
    .from(ninSlips)
    .where(eq(ninSlips.slipReference, slipReference))
    .limit(1);

  if (!slip || slip.length === 0) {
    return null;
  }

  if (userId && slip[0].userId && slip[0].userId !== userId) {
    return null;
  }

  const pdfPath = path.join(
    process.cwd(),
    "server/generated-slips",
    slip[0].pdfPath || "",
  );

  if (!fs.existsSync(pdfPath)) {
    return null;
  }

  await db
    .update(ninSlips)
    .set({ downloadCount: (slip[0].downloadCount || 0) + 1 })
    .where(eq(ninSlips.slipReference, slipReference));

  return fs.readFileSync(pdfPath);
};

export const getSlipInfo = async (
  slipReference: string,
): Promise<{
  verified: boolean;
  slipType?: string;
  surname?: string;
  firstname?: string;
  ninMasked?: string;
  verificationStatus?: string;
  createdAt?: Date;
} | null> => {
  const slip = await db
    .select()
    .from(ninSlips)
    .where(eq(ninSlips.slipReference, slipReference))
    .limit(1);

  if (!slip || slip.length === 0) {
    return null;
  }

  const record = slip[0];

  return {
    verified: true,
    slipType: record.slipType,
    surname: record.surname,
    firstname: record.firstname,
    ninMasked: record.nin ? `***${record.nin.slice(-4)}` : "",
    verificationStatus: record.verificationStatus || "verified",
    createdAt: record.createdAt || undefined,
  };
};

export default {
  generatePdfSlip,
  getSlipPdf,
  getSlipInfo,
};
