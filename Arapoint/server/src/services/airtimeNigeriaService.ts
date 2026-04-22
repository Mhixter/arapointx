import axios from 'axios';
import { logger } from '../utils/logger';

const BASE_URL = 'https://www.airtimenigeria.com/api/v1';

interface DataPlan {
  id: number;
  package_code: string;
  name: string;
  amount: number;
  network: string;
  validity?: string;
  data_size?: string;
}

interface DataPlansResponse {
  success: boolean;
  data?: DataPlan[];
  message?: string;
}

interface WalletBalanceResponse {
  success: boolean;
  data?: { balance: number; currency: string };
  message?: string;
}

class AirtimeNigeriaService {
  private getToken(): string | null {
    return process.env.AIRTIMENIGERIA_API_TOKEN || null;
  }

  isConfigured(): boolean {
    return !!this.getToken();
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.getToken()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async fetchDataPlans(): Promise<{ success: boolean; plans?: DataPlan[]; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'AirtimeNigeria API token is not configured. Set it in Admin → Settings → Gateways.' };
    }

    try {
      logger.info('Fetching data plans from AirtimeNigeria');
      const response = await axios.get<DataPlansResponse>(`${BASE_URL}/data/plans`, {
        headers: this.getHeaders(),
        timeout: 30000,
      });

      const { data } = response;

      if (!data.success) {
        return { success: false, error: data.message || 'Failed to fetch data plans' };
      }

      const plans: DataPlan[] = Array.isArray(data.data) ? data.data : [];
      logger.info('AirtimeNigeria data plans fetched', { count: plans.length });
      return { success: true, plans };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      logger.error('AirtimeNigeria fetchDataPlans error', { error: msg });
      return { success: false, error: msg };
    }
  }

  async getWalletBalance(): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'AirtimeNigeria API token is not configured' };
    }

    try {
      const response = await axios.get<WalletBalanceResponse>(`${BASE_URL}/wallet/balance`, {
        headers: this.getHeaders(),
        timeout: 15000,
      });

      const { data } = response;
      if (!data.success) {
        return { success: false, error: data.message || 'Failed to fetch balance' };
      }

      return { success: true, balance: data.data?.balance, currency: data.data?.currency || 'NGN' };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      logger.error('AirtimeNigeria getWalletBalance error', { error: msg });
      return { success: false, error: msg };
    }
  }

  async purchaseAirtime(params: {
    network: string;
    phone: string;
    amount: number;
    maxAmount: number;
    customerReference?: string;
    callbackUrl?: string;
  }): Promise<{ success: boolean; reference?: string; data?: any; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'AirtimeNigeria API token is not configured' };

    try {
      const response = await axios.post(`${BASE_URL}/airtime`, {
        network_operator: params.network.toLowerCase(),
        phone: params.phone,
        amount: params.amount,
        max_amount: params.maxAmount,
        customer_reference: params.customerReference,
        callback_url: params.callbackUrl,
      }, { headers: this.getHeaders(), timeout: 60000 });

      const { data } = response;
      if (!data.success) {
        return { success: false, error: data.message };
      }
      return { success: true, reference: data.details?.reference, data: data.details };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      logger.error('AirtimeNigeria purchaseAirtime error', { error: msg });
      return { success: false, error: msg };
    }
  }

  async purchaseData(params: {
    phone: string;
    packageCode: string;
    maxAmount?: number;
    customerReference?: string;
    callbackUrl?: string;
  }): Promise<{ success: boolean; reference?: string; data?: any; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'AirtimeNigeria API token is not configured' };

    try {
      const response = await axios.post(`${BASE_URL}/data`, {
        phone: params.phone,
        package_code: params.packageCode,
        max_amount: params.maxAmount,
        customer_reference: params.customerReference,
        callback_url: params.callbackUrl,
      }, { headers: this.getHeaders(), timeout: 60000 });

      const { data } = response;
      if (!data.success) {
        return { success: false, error: data.message };
      }
      return { success: true, reference: data.details?.reference, data: data.details };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      logger.error('AirtimeNigeria purchaseData error', { error: msg });
      return { success: false, error: msg };
    }
  }
}

export const airtimeNigeriaService = new AirtimeNigeriaService();
