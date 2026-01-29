import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface SlipCaptureData {
  provider: string;
  slipHtml: string;
  rawResponse?: any;
  nin: string;
  reference: string;
}

interface SlipAnalysis {
  capturedAt: string;
  provider: string;
  reference: string;
  layout: {
    type: string;
    hasHeader: boolean;
    hasFooter: boolean;
    hasPhoto: boolean;
    hasQrCode: boolean;
    hasCoatOfArms: boolean;
  };
  colors: string[];
  fonts: string[];
  sections: string[];
  ninDisplay: {
    formatted: boolean;
    position: string;
    fontSize: string;
  };
  dimensions: {
    width: string;
    height: string;
  };
}

const CAPTURES_DIR = '/tmp/slip_captures';

const ensureCapturesDir = () => {
  if (!fs.existsSync(CAPTURES_DIR)) {
    fs.mkdirSync(CAPTURES_DIR, { recursive: true });
  }
};

export const captureSlipDesign = async (data: SlipCaptureData): Promise<SlipAnalysis | null> => {
  try {
    ensureCapturesDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${data.provider}_${timestamp}_${data.reference}.html`;
    const filepath = path.join(CAPTURES_DIR, filename);

    fs.writeFileSync(filepath, data.slipHtml);
    logger.info('Slip HTML captured', { filepath, provider: data.provider });

    const analysis = analyzeSlipHtml(data.slipHtml, data.provider, data.reference);

    const analysisFilename = `${data.provider}_${timestamp}_${data.reference}_analysis.json`;
    const analysisFilepath = path.join(CAPTURES_DIR, analysisFilename);
    fs.writeFileSync(analysisFilepath, JSON.stringify(analysis, null, 2));

    if (data.rawResponse) {
      const rawFilename = `${data.provider}_${timestamp}_${data.reference}_raw.json`;
      const rawFilepath = path.join(CAPTURES_DIR, rawFilename);
      fs.writeFileSync(rawFilepath, JSON.stringify(data.rawResponse, null, 2));
    }

    logger.info('Slip analysis completed', { 
      provider: data.provider, 
      reference: data.reference,
      layout: analysis.layout.type,
      colorsFound: analysis.colors.length,
    });

    return analysis;
  } catch (error: any) {
    logger.error('Failed to capture slip design', { error: error.message });
    return null;
  }
};

const analyzeSlipHtml = (html: string, provider: string, reference: string): SlipAnalysis => {
  const analysis: SlipAnalysis = {
    capturedAt: new Date().toISOString(),
    provider,
    reference,
    layout: {
      type: detectLayoutType(html),
      hasHeader: hasElement(html, ['header', 'Header', '.header', '#header']),
      hasFooter: hasElement(html, ['footer', 'Footer', '.footer', '#footer']),
      hasPhoto: hasElement(html, ['photo', 'image', 'picture', 'img', '.photo']),
      hasQrCode: hasElement(html, ['qr', 'QR', 'qrcode', 'qr-code', 'barcode']),
      hasCoatOfArms: hasElement(html, ['coat-of-arms', 'coat_of_arms', 'coatOfArms', 'coa', 'emblem', 'nigeria-coa']),
    },
    colors: extractColors(html),
    fonts: extractFonts(html),
    sections: extractSections(html),
    ninDisplay: analyzeNinDisplay(html),
    dimensions: extractDimensions(html),
  };

  return analysis;
};

const detectLayoutType = (html: string): string => {
  if (html.includes('display: grid') || html.includes('display:grid')) return 'grid';
  if (html.includes('display: flex') || html.includes('display:flex')) return 'flexbox';
  if (html.includes('<table')) return 'table';
  if (html.includes('card') || html.includes('rounded')) return 'card';
  return 'standard';
};

const hasElement = (html: string, patterns: string[]): boolean => {
  const lowerHtml = html.toLowerCase();
  return patterns.some(p => lowerHtml.includes(p.toLowerCase()));
};

const extractColors = (html: string): string[] => {
  const colors: string[] = [];
  const colorPatterns = [
    /#[0-9a-fA-F]{3,6}/g,
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
  ];

  for (const pattern of colorPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      matches.forEach(c => {
        if (!colors.includes(c)) {
          colors.push(c);
        }
      });
    }
  }

  return colors.slice(0, 30);
};

const extractFonts = (html: string): string[] => {
  const fonts: string[] = [];
  const fontPattern = /font-family:\s*['"]?([^;}"']+)['"]?/gi;
  let match;

  while ((match = fontPattern.exec(html)) !== null) {
    const font = match[1].trim();
    if (!fonts.includes(font)) {
      fonts.push(font);
    }
  }

  return fonts;
};

const extractSections = (html: string): string[] => {
  const sections: string[] = [];
  const patterns = [
    /class="([^"]*(?:header|footer|content|main|body|photo|qr|info|data|field|label|value)[^"]*)"/gi,
    /id="([^"]*(?:header|footer|content|main|body|photo|qr|info|data|field|label|value)[^"]*)"/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (!sections.includes(match[1])) {
        sections.push(match[1]);
      }
    }
  }

  return sections.slice(0, 50);
};

const analyzeNinDisplay = (html: string): { formatted: boolean; position: string; fontSize: string } => {
  const lowerHtml = html.toLowerCase();
  
  let formatted = false;
  if (html.includes(' ') && /\d{4}\s+\d{3}\s+\d{4}/.test(html)) {
    formatted = true;
  }

  let position = 'unknown';
  if (lowerHtml.includes('bottom') || lowerHtml.includes('footer')) {
    position = 'bottom';
  } else if (lowerHtml.includes('center') || lowerHtml.includes('middle')) {
    position = 'center';
  } else if (lowerHtml.includes('top') || lowerHtml.includes('header')) {
    position = 'top';
  }

  let fontSize = 'unknown';
  const fontSizeMatch = html.match(/font-size:\s*(\d+(?:px|em|rem|pt))/i);
  if (fontSizeMatch) {
    fontSize = fontSizeMatch[1];
  }

  return { formatted, position, fontSize };
};

const extractDimensions = (html: string): { width: string; height: string } => {
  let width = 'auto';
  let height = 'auto';

  const widthMatch = html.match(/width:\s*(\d+(?:px|%|em|rem))/i);
  if (widthMatch) {
    width = widthMatch[1];
  }

  const heightMatch = html.match(/height:\s*(\d+(?:px|%|em|rem))/i);
  if (heightMatch) {
    height = heightMatch[1];
  }

  return { width, height };
};

export const getCapturedSlips = async (provider?: string): Promise<string[]> => {
  ensureCapturesDir();
  
  try {
    const files = fs.readdirSync(CAPTURES_DIR);
    let htmlFiles = files.filter(f => f.endsWith('.html'));
    
    if (provider) {
      htmlFiles = htmlFiles.filter(f => f.startsWith(provider));
    }
    
    return htmlFiles.map(f => path.join(CAPTURES_DIR, f));
  } catch (error) {
    return [];
  }
};

export const getLatestAnalysis = async (provider?: string): Promise<SlipAnalysis | null> => {
  ensureCapturesDir();
  
  try {
    const files = fs.readdirSync(CAPTURES_DIR);
    let analysisFiles = files.filter(f => f.endsWith('_analysis.json'));
    
    if (provider) {
      analysisFiles = analysisFiles.filter(f => f.startsWith(provider));
    }
    
    if (analysisFiles.length === 0) return null;
    
    analysisFiles.sort().reverse();
    const latestFile = path.join(CAPTURES_DIR, analysisFiles[0]);
    const content = fs.readFileSync(latestFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

export const getLatestSlipHtml = async (provider?: string): Promise<string | null> => {
  ensureCapturesDir();
  
  try {
    const files = fs.readdirSync(CAPTURES_DIR);
    let htmlFiles = files.filter(f => f.endsWith('.html'));
    
    if (provider) {
      htmlFiles = htmlFiles.filter(f => f.startsWith(provider));
    }
    
    if (htmlFiles.length === 0) return null;
    
    htmlFiles.sort().reverse();
    const latestFile = path.join(CAPTURES_DIR, htmlFiles[0]);
    return fs.readFileSync(latestFile, 'utf-8');
  } catch (error) {
    return null;
  }
};
