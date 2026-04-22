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

  async fetchDataPlans(): Promise<{ success: boolean; plans?: DataPlan[]; rawResponse?: any; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'AirtimeNigeria API token is not configured. Set it in Admin → Settings → Gateways.' };
    }

    try {
      logger.info('Fetching data plans from AirtimeNigeria');
      const response = await axios.get(`${BASE_URL}/data/plans`, {
        headers: this.getHeaders(),
        timeout: 30000,
      });

      const raw = response.data;
      // Log the raw response so we can see the exact shape
      logger.info('AirtimeNigeria raw response', { keys: Object.keys(raw || {}), statusCode: response.status, rawSample: JSON.stringify(raw).slice(0, 500) });

      // Check for failure indicators (handle both success:false and status:false patterns)
      const isSuccess = raw.success === true || raw.status === true || raw.status === 'success';
      if (!isSuccess) {
        return { success: false, error: raw.message || raw.error || 'API returned failure', rawResponse: raw };
      }

      // Normalise the plans array — the API may return:
      // 1. data.data  → array of plans
      // 2. data.plans → array of plans
      // 3. data.data  → object keyed by network name, each value is an array of plans
      // 4. data       → array directly
      let rawPlans: any[] = [];
      const payload = raw.data ?? raw.plans ?? raw;

      if (Array.isArray(payload)) {
        rawPlans = payload;
      } else if (payload && typeof payload === 'object') {
        // Object keyed by network: { MTN: [...], Airtel: [...] }
        for (const [networkKey, networkPlans] of Object.entries(payload)) {
          if (Array.isArray(networkPlans)) {
            rawPlans.push(...(networkPlans as any[]).map(p => ({ ...p, _networkKey: networkKey })));
          }
        }
      }

      // Normalise each plan into our DataPlan shape, trying multiple field name variants
      const plans: DataPlan[] = rawPlans.map(p => {
        const network = (p.network || p.network_operator || p.provider || p._networkKey || '').toString().trim();
        const package_code = (p.package_code ?? p.plan_id ?? p.code ?? p.id ?? '').toString().trim();
        const name = (p.name ?? p.plan ?? p.description ?? p.data_plan ?? package_code).toString().trim();
        const amount = parseFloat(p.amount ?? p.price ?? p.cost ?? 0);
        return { id: p.id, package_code, name, amount, network, validity: p.validity ?? p.duration, data_size: p.data_size ?? p.size ?? p.volume };
      });

      logger.info('AirtimeNigeria data plans normalised', { rawCount: rawPlans.length, validCount: plans.filter(p => p.package_code && p.network).length });
      return { success: true, plans, rawResponse: raw };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      const rawResponse = error.response?.data;
      logger.error('AirtimeNigeria fetchDataPlans error', { error: msg, status: error.response?.status, raw: JSON.stringify(rawResponse || {}).slice(0, 300) });
      return { success: false, error: msg, rawResponse };
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
