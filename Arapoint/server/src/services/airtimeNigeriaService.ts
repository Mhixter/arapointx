import axios from 'axios';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { adminSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

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
  private cachedToken: string | null = null;

  private getTokenSync(): string | null {
    return this.cachedToken || process.env.AIRTIMENIGERIA_API_TOKEN || null;
  }

  private async getTokenAsync(): Promise<string | null> {
    if (process.env.AIRTIMENIGERIA_API_TOKEN) return process.env.AIRTIMENIGERIA_API_TOKEN;
    if (this.cachedToken) return this.cachedToken;
    try {
      const [row] = await db.select({ settingValue: adminSettings.settingValue })
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'airtimenigeria_api_token'))
        .limit(1);
      if (row?.settingValue) {
        this.cachedToken = row.settingValue;
        process.env.AIRTIMENIGERIA_API_TOKEN = row.settingValue;
        return row.settingValue;
      }
    } catch {
      // ignore DB errors — fall through to null
    }
    return null;
  }

  isConfigured(): boolean {
    return !!this.getTokenSync();
  }

  async isConfiguredAsync(): Promise<boolean> {
    return !!(await this.getTokenAsync());
  }

  invalidateCache() {
    this.cachedToken = null;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getTokenAsync();
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async fetchDataPlans(): Promise<{ success: boolean; plans?: DataPlan[]; rawResponse?: any; error?: string }> {
    const token = await this.getTokenAsync();
    if (!token) {
      return { success: false, error: 'AirtimeNigeria API token is not configured. Set it in Admin → Settings → Gateways.' };
    }

    try {
      logger.info('Fetching data plans from AirtimeNigeria');
      const response = await axios.get(`${BASE_URL}/data/plans`, {
        headers: await this.getHeaders(),
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
    const token = await this.getTokenAsync();
    if (!token) {
      return { success: false, error: 'AirtimeNigeria API token is not configured' };
    }

    try {
      const response = await axios.get<WalletBalanceResponse>(`${BASE_URL}/wallet/balance`, {
        headers: await this.getHeaders(),
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
    const token = await this.getTokenAsync();
    if (!token) return { success: false, error: 'AirtimeNigeria API token is not configured' };

    try {
      const response = await axios.post(`${BASE_URL}/airtime`, {
        network_operator: params.network.toLowerCase(),
        phone: params.phone,
        amount: params.amount,
        max_amount: params.maxAmount,
        customer_reference: params.customerReference,
        callback_url: params.callbackUrl,
      }, { headers: await this.getHeaders(), timeout: 60000 });

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
    const token = await this.getTokenAsync();
    if (!token) return { success: false, error: 'AirtimeNigeria API token is not configured' };

    try {
      const response = await axios.post(`${BASE_URL}/data`, {
        phone: params.phone,
        package_code: params.packageCode,
        max_amount: params.maxAmount,
        customer_reference: params.customerReference,
        callback_url: params.callbackUrl,
      }, { headers: await this.getHeaders(), timeout: 60000 });

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
  async checkTransactionStatus(reference: string): Promise<{ success: boolean; status?: string; delivered?: boolean; error?: string }> {
    const token = await this.getTokenAsync();
    if (!token) return { success: false, error: 'Not configured' };

    const DELIVERED = ['delivered', 'success', 'completed', 'successful', 'processed'];

    // Try common AirtimeNigeria transaction status endpoints
    const endpoints = [
      `${BASE_URL}/transaction/${reference}`,
      `${BASE_URL}/transactions/${reference}`,
      `${BASE_URL}/status/${reference}`,
    ];

    for (const url of endpoints) {
      try {
        const response = await axios.get(url, { headers: await this.getHeaders(), timeout: 15000 });
        const raw = response.data;
        console.log(`[VTU StatusCheck] ${url} → HTTP ${response.status} body:`, JSON.stringify(raw));
        const rawStatus = (raw?.details?.status || raw?.data?.status || raw?.status || '').toString().toLowerCase();
        if (rawStatus) {
          return { success: true, status: rawStatus, delivered: DELIVERED.includes(rawStatus) };
        }
      } catch (err: any) {
        const httpStatus = err.response?.status;
        const httpBody = err.response?.data;
        // Log every error — we need to see what AirtimeNigeria actually returns
        console.log(`[VTU StatusCheck] ${url} → HTTP ${httpStatus ?? 'ERR'} error: ${err.message}`, httpBody ? JSON.stringify(httpBody) : '');
        // 404 means endpoint doesn't exist; try next
      }
    }

    return { success: false, error: 'Status check not available' };
  }
}

export const airtimeNigeriaService = new AirtimeNigeriaService();
