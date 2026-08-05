import PDFDocument from "pdfkit";
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
  firstname_top?: string;
  firstname_left?: string;
  firstname_size?: string;
  middlename_top?: string;
  middlename_left?: string;
  middlename_size?: string;
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
  [key: string]: string | undefined;
}

export interface SlipFieldConfig {
  font_family?: string;
  font_weight?: string;
  font_style?: string;
  text_transform?: string;
  letter_spacing?: string;
  color?: string;
}

export interface SlipSettings {
  positions: SlipPositions;
  hidden_fields: string[];
  field_configs: Record<string, SlipFieldConfig>;
  global_font_family?: string;
  global_font_weight?: string;
  global_color?: string;
}

const defaultPositions: Record<
  "standard" | "premium" | "long" | "full_info",
  SlipPositions
> = {
  standard: {
    photo_top: "30%",
    photo_left: "31%",
    photo_width: "11%",
    surname_top: "31.3%",
    surname_left: "44%",
    surname_size: "14px",
    names_top: "34.5%",
    names_left: "44%",
    names_size: "14px",
    dob_top: "37.5%",
    dob_left: "44%",
    dob_size: "14px",
    nin_top: "42.6%",
    nin_left: "38%",
    nin_size: "34px",
    qr_top: "31.5%",
    qr_right: "30%",
    qr_width: "10%",
    hidden_fields: [],
    field_configs: {},
    global_font_family: "'Roboto', Arial, sans-serif",
    global_font_weight: "700",
    global_color: "#000000",
  },
  premium: {
    photo_top: "36%",
    photo_left: "30.7%",
    photo_width: "9%",
    surname_top: "37.2%",
    surname_left: "40.7%",
    surname_size: "15px",
    names_top: "40%",
    names_left: "40.7%",
    names_size: "15px",
    dob_top: "42.7%",
    dob_left: "40.8%",
    dob_size: "15px",
    nin_top: "47.2%",
    nin_left: "37.5%",
    nin_size: "38px",
    qr_top: "33%",
    qr_right: "31%",
    qr_width: "10%",
    sex_top: "42.7%",
    sex_left: "51.8%",
    sex_size: "15px",
    issue_top: "44.7%",
    issue_right: "32.8%",
    issue_size: "14px",
    hidden_fields: [],
    field_configs: {},
    global_font_family: "'Roboto', Arial, sans-serif",
    global_font_weight: "700",
    global_color: "#000000",
  },
  long: {
    photo_top: "10%",
    photo_left: "82%",
    photo_width: "14.1%",
    surname_top: "11.6%",
    surname_left: "36.5%",
    surname_size: "17px",
    names_top: "",
    names_left: "",
    names_size: "",
    firstname_top: "15.2%",
    firstname_left: "38.5%",
    firstname_size: "17px",
    middlename_top: "18.3%",
    middlename_left: "38.5%",
    middlename_size: "15px",
    dob_top: "",
    dob_left: "",
    dob_size: "",
    nin_top: "14.9%",
    nin_left: "9.4%",
    nin_size: "17px",
    qr_top: "21.5%",
    qr_right: "5%",
    qr_width: "8.5%",
    sex_top: "21.1%",
    sex_left: "35.5%",
    sex_size: "17px",
    tracking_top: "11.4%",
    tracking_left: "13.2%",
    tracking_size: "17px",
    address_top: "11%",
    address_left: "63.8%",
    address_size: "17px",
    hidden_fields: ["qr_code"],
    field_configs: {
      middlename: { font_family: "'Times-Roman', serif", font_weight: "400" },
    },
    global_font_family: "'Times New Roman', serif",
    global_font_weight: "700",
    global_color: "#000000",
  },
  full_info: {
    photo_top: "12%",
    photo_left: "31%",
    photo_width: "18%",
    surname_top: "20.4%",
    surname_left: "14%",
    surname_size: "16px",
    names_top: "13.5%",
    names_left: "14.2%",
    names_size: "16px",
    dob_top: "24.4%",
    dob_left: "11%",
    dob_size: "16px",
    nin_top: "29.9%",
    nin_left: "24%",
    nin_size: "36px",
    qr_top: "18%",
    qr_right: "8%",
    qr_width: "15%",
    sex_top: "27.4%",
    sex_left: "12%",
    sex_size: "16px",
    issue_top: "39%",
    issue_left: "32%",
    issue_size: "14px",
    tracking_top: "34%",
    tracking_left: "14%",
    tracking_size: "16px",
    address_top: "43.7%",
    address_left: "12%",
    address_size: "16px",
    phone_top: "34%",
    phone_left: "42%",
    phone_size: "16px",
    state_top: "38.7%",
    state_left: "11%",
    state_size: "16px",
    lga_top: "40.7%",
    lga_left: "38.5%",
    lga_size: "16px",
    birth_state_top: "40.7%",
    birth_state_left: "14%",
    birth_state_size: "16px",
    birth_lga_top: "38.5%",
    birth_lga_left: "39%",
    birth_lga_size: "16px",
    nationality_top: "75%",
    nationality_left: "32%",
    nationality_size: "14px",
    hidden_fields: ["issue_date", "nationality"],
    field_configs: {},
    global_font_family: "'Roboto', Arial, sans-serif",
    global_font_weight: "400",
    global_color: "#000000",
  },
};

let customPositions: Record<string, SlipPositions> = {};
let customSettings: Record<string, Partial<SlipSettings>> = {};

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

export const getSlipSettings = (
  slipType: "standard" | "premium" | "long" | "full_info",
): SlipSettings => {
  const settings = customSettings[slipType] || {};
  return {
    positions: getSlipPositions(slipType),
    hidden_fields: settings.hidden_fields || [],
    field_configs: settings.field_configs || {},
    global_font_family:
      settings.global_font_family || "'Roboto', Arial, sans-serif",
    global_font_weight: settings.global_font_weight || "700",
    global_color: settings.global_color || "#000",
  };
};

export const setSlipSettings = (
  slipType: "standard" | "premium" | "long" | "full_info",
  settings: Partial<SlipSettings>,
): SlipSettings => {
  if (settings.positions) {
    setSlipPositions(slipType, settings.positions);
  }
  const current = customSettings[slipType] || {};
  customSettings[slipType] = {
    ...current,
    ...settings,
    positions: undefined,
  };
  return getSlipSettings(slipType);
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
  if (!dateStr) return '';
  try {
    // Detect DD-MM-YYYY or D-M-YYYY (as Prembly returns e.g. "10-11-2001" = 10 Nov 2001)
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10); // Prembly: month is the second segment
      const year = parseInt(ddmmyyyy[3], 10);
      // Use UTC to avoid timezone shifts
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(date.getTime())) {
        return date
          .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
          .toUpperCase();
      }
    }
    // Handle YYYY-MM-DD (ISO 8601) safely
    const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      const date = new Date(Date.UTC(parseInt(isoDate[1]), parseInt(isoDate[2]) - 1, parseInt(isoDate[3])));
      if (!isNaN(date.getTime())) {
        return date
          .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
          .toUpperCase();
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const getBaseUrl = (): string => {
  return process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.BASE_URL || "http://localhost:5000";
};

const loadTemplate = (
  slipType: "standard" | "premium" | "long" | "full_info",
): string => {
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
      return "";
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

const wrapAddress = (text: string, maxChars: number): string => {
  if (!text || text.length <= maxChars) return text;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxChars) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
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
    slip_type: slipType,
    verification_status: "verified",
    verification_url: verificationUrl,
    nin: data.nin || "",
    full_name: `${(data.firstname || "").toUpperCase()} ${(data.middlename || "").toUpperCase()} ${(data.surname || "").toUpperCase()}`.replace(/\s+/g, " ").trim(),
    name: `${(data.firstname || "").toUpperCase()} ${(data.middlename || "").toUpperCase()} ${(data.surname || "").toUpperCase()}`.replace(/\s+/g, " ").trim(),
    surname: (data.surname || "").toUpperCase(),
    firstname: (data.firstname || "").toUpperCase(),
    middlename: (data.middlename || "").toUpperCase(),
    dob: data.date_of_birth || "",
    date_of_birth: data.date_of_birth || "",
    gender: (data.gender || "").toUpperCase(),
  };

  const settings = getSlipSettings(slipType);
  const positions = settings.positions;
  const hiddenFields = settings.hidden_fields || [];
  const fieldConfigs = settings.field_configs || {};

  const dims =
    slipType === "full_info"
      ? { width: 1162, height: 1758 }
      : slipType === "long"
        ? { width: 1245, height: 1758 }
        : { width: 1246, height: 1755 };

  const { width, height } = dims;

  const toPx = (val: string, base: number): number => {
    if (!val) return 0;
    const s = val.trim();
    if (s.endsWith("%")) return (parseFloat(s) / 100) * base;
    if (s.endsWith("px")) return parseFloat(s);
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const resolveFont = (weight?: string): string => {
    const w = weight || settings.global_font_weight || "700";
    return parseInt(w) >= 700 || w === "bold" ? "Times-Bold" : "Times-Roman";
  };

  const globalFont = resolveFont(settings.global_font_weight);
  const globalColor = settings.global_color || "#000000";

  // Generate QR code as PNG buffer — no network, fully self-contained
  const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrCodeData), {
    width: 200,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Load template PNG from disk as buffer
  const loadTemplateBuffer = (): Buffer | null => {
    const p1 = path.join(process.cwd(), "server/src/templates", `${slipType}_template.png`);
    if (fs.existsSync(p1)) return fs.readFileSync(p1);
    const p2 = path.join(process.cwd(), "server/src/templates", `${slipType}_template-1.png`);
    if (fs.existsSync(p2)) return fs.readFileSync(p2);
    return null;
  };
  const templateBuffer = loadTemplateBuffer();

  const outputDir = ensureOutputDir();
  const pdfFilename = `${slipReference}.pdf`;
  const pdfPath = path.join(outputDir, pdfFilename);

  // Build PDF with pdfkit — no Chromium required, works in any environment
  const doc = new (PDFDocument as any)({
    size: [width, height],
    margin: 0,
    autoFirstPage: true,
    compress: false,
  });

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // 1. Full-page template image background
  if (templateBuffer) {
    doc.image(templateBuffer, 0, 0, { width, height });
  }

  // Draw text at a top/left percentage position
  const drawText = (
    text: string,
    topPct: string,
    leftPct: string,
    sizePx: string,
    fieldKey?: string,
  ) => {
    if (!text || !topPct || !leftPct) return;
    const x = toPx(leftPct, width);
    const y = toPx(topPct, height);
    const sz = parseFloat(sizePx) || 14;
    const cfg = fieldKey ? fieldConfigs[fieldKey] : undefined;
    const font = cfg?.font_weight ? resolveFont(cfg.font_weight) : globalFont;
    const color = cfg?.color || globalColor;
    doc.font(font).fontSize(sz).fillColor(color).text(text, x, y, { lineBreak: false });
  };

  // Draw text right-aligned from the right edge
  const drawTextRight = (
    text: string,
    topPct: string,
    rightPct: string,
    sizePx: string,
  ) => {
    if (!text || !topPct || !rightPct) return;
    const y = toPx(topPct, height);
    const sz = parseFloat(sizePx) || 14;
    doc.font(globalFont).fontSize(sz).fillColor(globalColor);
    const textW = doc.widthOfString(text);
    const x = width - toPx(rightPct, width) - textW;
    doc.text(text, x, y, { lineBreak: false });
  };

  // 2. Photo
  if (!hiddenFields.includes("photo") && data.photo) {
    try {
      const photoBase64 = data.photo.startsWith("data:")
        ? data.photo.replace(/^data:image\/\w+;base64,/, "")
        : data.photo;
      const photoBuffer = Buffer.from(photoBase64, "base64");
      const px = toPx(positions.photo_left, width);
      const py = toPx(positions.photo_top, height);
      const pw = toPx(positions.photo_width, width);
      doc.image(photoBuffer, px, py, { width: pw });
    } catch (_) {}
  }

  // 3. QR code
  if (!hiddenFields.includes("qr_code") && (positions.qr_top || positions.qr_right)) {
    try {
      const qrW = toPx(positions.qr_width, width);
      const qrY = toPx(positions.qr_top, height);
      const qrX = positions.qr_right
        ? width - toPx(positions.qr_right, width) - qrW
        : toPx(positions.qr_top, width);
      doc.image(qrBuffer, qrX, qrY, { width: qrW });
    } catch (_) {}
  }

  // 4. All text fields — each checks hiddenFields and uses admin-configured positions
  if (!hiddenFields.includes("surname")) {
    drawText((data.surname || "").toUpperCase(), positions.surname_top, positions.surname_left, positions.surname_size, "surname");
  }

  if (!hiddenFields.includes("names") && positions.names_top) {
    const names = `${(data.firstname || "").toUpperCase()} ${(data.middlename || "").toUpperCase()}`.trim();
    drawText(names, positions.names_top, positions.names_left, positions.names_size, "names");
  }

  if (!hiddenFields.includes("firstname") && positions.firstname_top) {
    drawText((data.firstname || "").toUpperCase(), positions.firstname_top, positions.firstname_left || positions.names_left, positions.firstname_size || positions.names_size, "firstname");
  }

  if (!hiddenFields.includes("middlename") && positions.middlename_top) {
    drawText((data.middlename || "").toUpperCase(), positions.middlename_top, positions.middlename_left || positions.names_left, positions.middlename_size || positions.names_size, "middlename");
  }

  if (!hiddenFields.includes("dob") && positions.dob_top) {
    drawText(formatDate(data.date_of_birth), positions.dob_top, positions.dob_left, positions.dob_size, "dob");
  }

  if (!hiddenFields.includes("nin")) {
    drawText(formatNIN(data.nin), positions.nin_top, positions.nin_left, positions.nin_size, "nin");
  }

  if (!hiddenFields.includes("sex") && positions.sex_top) {
    drawText((data.gender || "").toUpperCase(), positions.sex_top, positions.sex_left || "", positions.sex_size || "14px", "sex");
  }

  if (!hiddenFields.includes("issue_date") && positions.issue_top) {
    const issueText = formatDate(new Date().toISOString());
    if (positions.issue_right) {
      drawTextRight(issueText, positions.issue_top, positions.issue_right, positions.issue_size || "14px");
    } else {
      drawText(issueText, positions.issue_top, positions.issue_left || "", positions.issue_size || "14px", "issue_date");
    }
  }

  if (!hiddenFields.includes("tracking_id") && positions.tracking_top) {
    drawText(data.tracking_id || "", positions.tracking_top, positions.tracking_left || "", positions.tracking_size || "14px", "tracking_id");
  }

  if (!hiddenFields.includes("address") && positions.address_top) {
    drawText((data.address || "").toUpperCase(), positions.address_top, positions.address_left || "", positions.address_size || "14px", "address");
  }

  if (!hiddenFields.includes("phone") && positions.phone_top) {
    drawText(data.phone || "", positions.phone_top, positions.phone_left || "", positions.phone_size || "14px", "phone");
  }

  if (!hiddenFields.includes("state") && positions.state_top) {
    drawText((data.state || "").toUpperCase(), positions.state_top, positions.state_left || "", positions.state_size || "14px", "state");
  }

  if (!hiddenFields.includes("lga") && positions.lga_top) {
    drawText((data.lga || "").toUpperCase(), positions.lga_top, positions.lga_left || "", positions.lga_size || "14px", "lga");
  }

  if (!hiddenFields.includes("birth_state") && positions.birth_state_top) {
    drawText((data.birthState || "").toUpperCase(), positions.birth_state_top, positions.birth_state_left || "", positions.birth_state_size || "14px", "birth_state");
  }

  if (!hiddenFields.includes("birth_lga") && positions.birth_lga_top) {
    drawText((data.birthLga || "").toUpperCase(), positions.birth_lga_top, positions.birth_lga_left || "", positions.birth_lga_size || "14px", "birth_lga");
  }

  if (!hiddenFields.includes("nationality") && positions.nationality_top) {
    drawText((data.nationality || "NIGERIAN").toUpperCase(), positions.nationality_top, positions.nationality_left || "", positions.nationality_size || "14px", "nationality");
  }

  doc.end();

  // Wait for file write to complete
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  // Read the generated PDF and store as base64 in DB for permanent persistence
  let pdfBase64: string | null = null;
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    pdfBase64 = pdfBuffer.toString("base64");
  } catch (err) {
    console.error("Failed to read PDF for DB storage:", (err as Error).message);
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
    pdfData: pdfBase64,
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

  await db
    .update(ninSlips)
    .set({ downloadCount: (slip[0].downloadCount || 0) + 1 })
    .where(eq(ninSlips.slipReference, slipReference));

  const isPdfBuffer = (buffer: Buffer) =>
    buffer.length > 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";

  // Prefer DB-stored PDF (permanent) over local file (ephemeral)
  if (slip[0].pdfData) {
    try {
      const dbBuffer = Buffer.from(slip[0].pdfData, "base64");
      if (isPdfBuffer(dbBuffer)) {
        return dbBuffer;
      }
      console.warn("[getSlipPdf] Invalid PDF payload in database, falling back", {
        slipReference,
      });
    } catch (decodeError) {
      console.warn("[getSlipPdf] Failed to decode PDF payload", {
        slipReference,
        error: (decodeError as Error).message,
      });
    }
  }

  // Fallback: try local filesystem (may not exist after server restart)
  const pdfPath = path.join(
    process.cwd(),
    "server/generated-slips",
    slip[0].pdfPath || "",
  );

  if (fs.existsSync(pdfPath)) {
    const buf = fs.readFileSync(pdfPath);
    if (!isPdfBuffer(buf)) {
      console.warn("[getSlipPdf] Invalid local PDF file, trying regeneration", {
        slipReference,
      });
    } else {
    // Backfill pdfData so future downloads are instant
      try {
        await db
          .update(ninSlips)
          .set({ pdfData: buf.toString("base64") })
          .where(eq(ninSlips.slipReference, slipReference));
      } catch (_) {}
      return buf;
    }
  }

  // Last resort: regenerate from stored slip record data
  const record = slip[0];
  if (
    record.slipType &&
    record.nin &&
    record.surname &&
    record.firstname &&
    record.dateOfBirth
  ) {
    try {
      console.log(`[getSlipPdf] Regenerating slip ${slipReference} from stored data`);
      const result = await generatePdfSlip({
        userId: record.userId || undefined,
        slipType: record.slipType as "standard" | "premium" | "long" | "full_info",
        data: {
          nin: record.nin,
          surname: record.surname,
          firstname: record.firstname,
          middlename: record.middlename || undefined,
          date_of_birth: record.dateOfBirth,
          gender: record.gender || undefined,
          photo: record.photo || undefined,
          tracking_id: record.trackingId || undefined,
          verification_reference: record.verificationReference || undefined,
        },
      });
      const regeneratedPath = path.join(
        process.cwd(),
        "server/generated-slips",
        result.pdfPath,
      );
      if (fs.existsSync(regeneratedPath)) {
        return fs.readFileSync(regeneratedPath);
      }
    } catch (regenErr) {
      console.error("[getSlipPdf] Regeneration failed:", (regenErr as Error).message);
    }
  }

  return null;
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
