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

            const normalizedData = this.normalizeResponse(rawData, nin);
            
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
        const normalizedData = this.normalizeResponse(response.data, nin);
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
        const normalizedData = this.normalizeResponse(response.data, nin);
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
        const normalizedData = this.normalizeResponse(response.data, vnin);
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
