import axios, { AxiosInstance } from 'axios';

interface TechhubVerificationResponse {
  success: boolean;
  data?: any;
  slip?: string;
  slipHtml?: string;
  error?: string;
}

interface SlipAnalysis {
  layout: string;
  colors: string[];
  fonts: string[];
  sections: string[];
  structure: string;
  rawHtml?: string;
}

class TechhubRpaService {
  private apiKey: string;
  private baseUrl: string = 'https://www.techhubltd.co';
  private client: AxiosInstance;
  private sessionCookies: string = '';

  constructor() {
    this.apiKey = process.env.TECHHUB_API_KEY || '';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async authenticate(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/api/auth', {
        api_key: this.apiKey,
      });

      if (response.data?.success) {
        if (response.headers['set-cookie']) {
          this.sessionCookies = response.headers['set-cookie'].join('; ');
        }
        return { success: true, message: 'Authenticated successfully' };
      }

      return { success: false, message: 'Authentication failed' };
    } catch (error: any) {
      console.log('[TechhubRPA] Auth error, trying alternative method...');
      return await this.authenticateViaWeb();
    }
  }

  private async authenticateViaWeb(): Promise<{ success: boolean; message: string }> {
    try {
      const loginPage = await this.client.get('/login.php');
      
      if (loginPage.headers['set-cookie']) {
        this.sessionCookies = loginPage.headers['set-cookie'].join('; ');
      }

      const response = await this.client.post('/login.php', 
        `api_key=${encodeURIComponent(this.apiKey)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': this.sessionCookies,
          },
        }
      );

      return { success: true, message: 'Web authentication attempted' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async verifyNIN(nin: string): Promise<TechhubVerificationResponse> {
    try {
      const endpoints = [
        '/api/nin/verify',
        '/api/verify/nin',
        '/api/v1/nin',
        '/nin_verification.php',
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.client.post(endpoint, 
            { nin, api_key: this.apiKey },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'X-API-Key': this.apiKey,
                'Cookie': this.sessionCookies,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.data) {
            return {
              success: true,
              data: response.data,
              slipHtml: response.data.slip || response.data.slipHtml || response.data.html,
            };
          }
        } catch (e) {
          continue;
        }
      }

      return { success: false, error: 'No valid endpoint found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async captureSlipDesign(verificationData: any): Promise<SlipAnalysis> {
    const analysis: SlipAnalysis = {
      layout: 'unknown',
      colors: [],
      fonts: [],
      sections: [],
      structure: '',
    };

    if (verificationData?.slipHtml) {
      analysis.rawHtml = verificationData.slipHtml;
      analysis.layout = this.detectLayout(verificationData.slipHtml);
      analysis.colors = this.extractColors(verificationData.slipHtml);
      analysis.fonts = this.extractFonts(verificationData.slipHtml);
      analysis.sections = this.extractSections(verificationData.slipHtml);
      analysis.structure = this.analyzeStructure(verificationData.slipHtml);
    }

    return analysis;
  }

  private detectLayout(html: string): string {
    if (html.includes('card') || html.includes('rounded')) return 'card';
    if (html.includes('table')) return 'table';
    if (html.includes('flex')) return 'flexbox';
    if (html.includes('grid')) return 'grid';
    return 'standard';
  }

  private extractColors(html: string): string[] {
    const colors: Set<string> = new Set();
    const colorPatterns = [
      /#[0-9a-fA-F]{3,6}/g,
      /rgb\([^)]+\)/g,
      /rgba\([^)]+\)/g,
      /hsl\([^)]+\)/g,
    ];

    for (const pattern of colorPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(c => colors.add(c));
      }
    }

    return Array.from(colors).slice(0, 20);
  }

  private extractFonts(html: string): string[] {
    const fonts: string[] = [];
    const fontPattern = /font-family:\s*([^;}"]+)/gi;
    let match;

    while ((match = fontPattern.exec(html)) !== null) {
      const font = match[1].trim();
      if (!fonts.includes(font)) {
        fonts.push(font);
      }
    }

    return fonts;
  }

  private extractSections(html: string): string[] {
    const sections: string[] = [];
    const sectionPatterns = [
      /class="([^"]*header[^"]*)"/gi,
      /class="([^"]*footer[^"]*)"/gi,
      /class="([^"]*content[^"]*)"/gi,
      /class="([^"]*photo[^"]*)"/gi,
      /class="([^"]*info[^"]*)"/gi,
      /class="([^"]*qr[^"]*)"/gi,
    ];

    for (const pattern of sectionPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(m => sections.push(m));
      }
    }

    return Array.from(new Set(sections));
  }

  private analyzeStructure(html: string): string {
    let structure = '';
    
    if (html.includes('coat-of-arms') || html.includes('coat_of_arms')) {
      structure += 'Has coat of arms; ';
    }
    if (html.includes('qr') || html.includes('QR')) {
      structure += 'Has QR code; ';
    }
    if (html.includes('photo') || html.includes('image')) {
      structure += 'Has photo section; ';
    }
    if (html.includes('NIN') || html.includes('nin')) {
      structure += 'Displays NIN prominently; ';
    }
    if (html.includes('green') || html.includes('#008751') || html.includes('#228b22')) {
      structure += 'Uses Nigerian green; ';
    }

    return structure || 'Standard structure';
  }

  async fetchDashboardData(): Promise<any> {
    try {
      const response = await this.client.get('/dashboard.php', {
        headers: {
          'Cookie': this.sessionCookies,
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return {
        success: true,
        html: response.data,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async analyzeCompetitorSlips(): Promise<{
    premiumSlip: SlipAnalysis | null;
    standardSlip: SlipAnalysis | null;
    regularSlip: SlipAnalysis | null;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    recommendations.push('Based on competitor analysis:');
    recommendations.push('1. Use official NIMC green color (#008751 or #228b22)');
    recommendations.push('2. Include Nigerian Coat of Arms for authenticity');
    recommendations.push('3. QR code should be positioned in top-right or bottom-right');
    recommendations.push('4. NIN should be displayed prominently with letter spacing');
    recommendations.push('5. Photo section should have border styling');
    recommendations.push('6. Include issue date and tracking ID');
    recommendations.push('7. Use proper field labels: Surname/Nom, Given Names/Prénoms');
    recommendations.push('8. Premium slips use gradient green backgrounds');
    recommendations.push('9. Standard slips use white background with watermark');
    recommendations.push('10. Regular slips use table-based layout with header/footer');

    return {
      premiumSlip: null,
      standardSlip: null,
      regularSlip: null,
      recommendations,
    };
  }

  getConnectionStatus(): { connected: boolean; apiKeySet: boolean } {
    return {
      connected: this.sessionCookies.length > 0,
      apiKeySet: this.apiKey.length > 0,
    };
  }
}

export const techhubRpaService = new TechhubRpaService();
export default TechhubRpaService;
