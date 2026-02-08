import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface TechhubNINData {
  id: string;
  nin: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  lga: string;
  photo: string;
  signature?: string;
  trackingId?: string;
}

interface TechhubResponse {
  success: boolean;
  data?: TechhubNINData;
  error?: string;
  reference: string;
  rawResponse?: any;
  slipHtml?: string;
}

class TechhubService {
  private apiKey: string;
  private baseUrl: string = 'https://www.techhubltd.co';
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.TECHHUB_API_KEY || '';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private generateReference(): string {
    return `TH${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  async verifyNIN(nin: string): Promise<TechhubResponse> {
    const reference = this.generateReference();

    if (!this.isConfigured()) {
      return { success: false, error: 'TechHub API key is not configured', reference };
    }

    try {
      logger.info('TechHub NIN verification started', { nin: nin.substring(0, 4) + '***' });

      const endpoints = [
        { url: '/api/nin/verify', method: 'post' as const },
        { url: '/api/v1/nin', method: 'post' as const },
        { url: '/api/verify', method: 'post' as const },
        { url: '/api/identity/nin', method: 'post' as const },
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.client.request({
            method: endpoint.method,
            url: endpoint.url,
            data: {
              nin,
              api_key: this.apiKey,
              number: nin,
            },
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'X-API-Key': this.apiKey,
              'Api-Key': this.apiKey,
            },
          });

          if (response.data) {
            const rawData = response.data;
            logger.info('TechHub API response received', { endpoint: endpoint.url, hasData: !!rawData });

            if (this.isErrorResponse(rawData)) {
              const errorMsg = rawData.message || rawData.detail || rawData.error || 'NIN not found';
              logger.warn('TechHub returned error response', { endpoint: endpoint.url, error: errorMsg });
              return { success: false, error: errorMsg, reference };
            }

            const normalizedData = this.normalizeResponse(rawData, nin);

            if (!this.hasValidData(normalizedData)) {
              logger.warn('TechHub returned empty/invalid data', { endpoint: endpoint.url });
              return { success: false, error: 'No record found for the provided NIN', reference };
            }
            
            return {
              success: true,
              data: normalizedData,
              reference,
              rawResponse: rawData,
              slipHtml: rawData.slip || rawData.slipHtml || rawData.html,
            };
          }
        } catch (endpointError: any) {
          logger.debug('TechHub endpoint failed, trying next', { 
            endpoint: endpoint.url, 
            error: endpointError.message 
          });
          continue;
        }
      }

      const formResponse = await this.tryFormBasedVerification(nin);
      if (formResponse.success) {
        return { ...formResponse, reference };
      }

      return { success: false, error: 'Unable to connect to TechHub API', reference };
    } catch (error: any) {
      logger.error('TechHub NIN verification error', { error: error.message });
      return { success: false, error: error.message, reference };
    }
  }

  private async tryFormBasedVerification(nin: string): Promise<Omit<TechhubResponse, 'reference'>> {
    try {
      const response = await this.client.post('/nin_verification.php', 
        `nin=${encodeURIComponent(nin)}&api_key=${encodeURIComponent(this.apiKey)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data) {
        if (this.isErrorResponse(response.data)) {
          return { success: false, error: response.data.message || response.data.detail || 'NIN not found' };
        }
        const normalizedData = this.normalizeResponse(response.data, nin);
        if (!this.hasValidData(normalizedData)) {
          return { success: false, error: 'No record found for the provided NIN' };
        }
        return {
          success: true,
          data: normalizedData,
          rawResponse: response.data,
          slipHtml: response.data.slip || response.data.slipHtml,
        };
      }

      return { success: false, error: 'No data returned' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private isErrorResponse(rawData: any): boolean {
    if (rawData.status === false || rawData.success === false) return true;
    if (rawData.error && !rawData.data && !rawData.result) return true;
    const msg = (rawData.message || rawData.detail || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('no record') || msg.includes('invalid') || msg.includes('does not exist')) return true;
    const code = rawData.response_code || rawData.responseCode || rawData.code;
    if (code === '01' || code === '02' || code === 404) return true;
    return false;
  }

  private isRealValue(val: any): boolean {
    if (!val || typeof val !== 'string') return false;
    const v = val.trim().toLowerCase();
    return v.length > 0 && v !== 'n/a' && v !== 'unknown' && v !== 'null' && v !== 'undefined' && v !== 'none';
  }

  private hasValidData(data: TechhubNINData): boolean {
    const hasName = this.isRealValue(data.firstName) || this.isRealValue(data.lastName);
    if (!hasName) return false;
    return this.isRealValue(data.dateOfBirth) || this.isRealValue(data.nin) || this.isRealValue(data.id);
  }

  private normalizeResponse(rawData: any, nin: string): TechhubNINData {
    const data = rawData.data || rawData.result || rawData.response || rawData;

    return {
      id: data.nin || data.NIN || nin,
      nin: data.nin || data.NIN || nin,
      firstName: data.firstName || data.first_name || data.firstname || '',
      middleName: data.middleName || data.middle_name || data.middlename || '',
      lastName: data.lastName || data.last_name || data.lastname || data.surname || '',
      dateOfBirth: data.dateOfBirth || data.date_of_birth || data.dob || data.birthdate || '',
      gender: data.gender || data.sex || '',
      phone: data.phone || data.mobile || data.telephone || data.phoneNumber || '',
      email: data.email || '',
      address: data.address || data.residential_address || data.residence_address || '',
      state: data.state || data.stateOfOrigin || data.state_of_origin || data.residence_state || '',
      lga: data.lga || data.lgaOfOrigin || data.lga_of_origin || data.residence_lga || '',
      photo: data.photo || data.image || data.picture || data.base64Image || '',
      signature: data.signature || '',
      trackingId: data.trackingId || data.tracking_id || '',
    };
  }

  async verifyNINWithPhone(nin: string, phone: string): Promise<TechhubResponse> {
    const reference = this.generateReference();

    if (!this.isConfigured()) {
      return { success: false, error: 'TechHub API key is not configured', reference };
    }

    try {
      const response = await this.client.post('/api/nin/verify-phone', {
        nin,
        phone,
        api_key: this.apiKey,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Key': this.apiKey,
        },
      });

      if (response.data) {
        if (this.isErrorResponse(response.data)) {
          const errorMsg = response.data.message || response.data.detail || response.data.error || 'NIN not found for the provided phone number';
          return { success: false, error: errorMsg, reference };
        }
        const normalizedData = this.normalizeResponse(response.data, nin);
        if (!this.hasValidData(normalizedData)) {
          return { success: false, error: 'No record found for the provided phone number', reference };
        }
        return {
          success: true,
          data: normalizedData,
          reference,
          rawResponse: response.data,
        };
      }

      return { success: false, error: 'Verification failed', reference };
    } catch (error: any) {
      const basicResult = await this.verifyNIN(nin);
      return { ...basicResult, reference };
    }
  }

  async verifyVNIN(vnin: string, validationData?: { firstName?: string; lastName?: string; dateOfBirth?: string }): Promise<TechhubResponse> {
    const reference = this.generateReference();

    if (!this.isConfigured()) {
      return { success: false, error: 'TechHub API key is not configured', reference };
    }

    try {
      const response = await this.client.post('/api/vnin/verify', {
        vnin,
        ...validationData,
        api_key: this.apiKey,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Key': this.apiKey,
        },
      });

      if (response.data) {
        if (this.isErrorResponse(response.data)) {
          const errorMsg = response.data.message || response.data.detail || response.data.error || 'vNIN not found';
          return { success: false, error: errorMsg, reference };
        }
        const normalizedData = this.normalizeResponse(response.data, vnin);
        if (!this.hasValidData(normalizedData)) {
          return { success: false, error: 'No record found for the provided vNIN', reference };
        }
        return {
          success: true,
          data: normalizedData,
          reference,
          rawResponse: response.data,
        };
      }

      return { success: false, error: 'vNIN verification failed', reference };
    } catch (error: any) {
      logger.error('TechHub vNIN verification error', { error: error.message });
      return { success: false, error: error.message, reference };
    }
  }

  getSlipFromResponse(rawResponse: any): string | null {
    if (!rawResponse) return null;
    return rawResponse.slip || rawResponse.slipHtml || rawResponse.html || rawResponse.slip_html || null;
  }
}

export const techhubService = new TechhubService();
export default TechhubService;
