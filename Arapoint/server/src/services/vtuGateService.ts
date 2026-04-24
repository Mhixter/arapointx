import axios from 'axios';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { adminSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://vtugate.com';

interface VTUGateResponse {
  status: boolean | string | number;
  message?: string;
  data?: any;
  balance?: number | string;
  reference?: string;
  transactionId?: string;
  transaction_id?: string;
  [key: string]: any;
}

class VTUGateService {
  private cachedApiKey: string | null = null;

  private getApiKeySync(): string | null {
    return this.cachedApiKey || process.env.VTUGATE_API_KEY || null;
  }

  private async getApiKeyAsync(): Promise<string | null> {
    if (process.env.VTUGATE_API_KEY) return process.env.VTUGATE_API_KEY;
    if (this.cachedApiKey) return this.cachedApiKey;
    try {
      const [row] = await db.select({ settingValue: adminSettings.settingValue })
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'vtugate_api_key'))
        .limit(1);
      if (row?.settingValue) {
        this.cachedApiKey = row.settingValue;
        process.env.VTUGATE_API_KEY = row.settingValue;
        return row.settingValue;
      }
    } catch {
      // ignore DB errors
    }
    return null;
  }

  isConfigured(): boolean {
    return !!this.getApiKeySync();
  }

  async isConfiguredAsync(): Promise<boolean> {
    return !!(await this.getApiKeyAsync());
  }

  invalidateCache() {
    this.cachedApiKey = null;
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const key = await this.getApiKeyAsync();
    return {
      'Authorization': `Bearer ${key || ''}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };
  }

  private toFormBody(params: Record<string, any>): string {
    return new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v ?? '')])
      )
    ).toString();
  }

  private isOk(status: any): boolean {
    if (typeof status === 'boolean') return status === true;
    if (typeof status === 'number') return status === 1 || status === 200;
    const s = String(status).toLowerCase();
    return s === 'success' || s === 'true' || s === '1' || s === 'ok';
  }

  async fetchServices(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/fetchservices`,
        this.toFormBody({}),
        { headers, timeout: 15000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        return { success: true, data: d.data || d };
      }
      return { success: false, error: d.message || 'Failed to fetch services' };
    } catch (err: any) {
      logger.error('VTUGate fetchServices error', { error: err.message });
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async fetchDataPlans(network: string): Promise<{ success: boolean; plans?: any[]; rawResponse?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      // VTUGate accepts: mtn, airtel, glo, etisalat (for 9mobile)
      const networkMap: Record<string, string> = {
        '9mobile': 'etisalat',
        'etisalat': 'etisalat',
        'mtn': 'mtn',
        'airtel': 'airtel',
        'glo': 'glo',
      };
      const net = networkMap[network.toLowerCase()] || network.toLowerCase();
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/fetchdataplans`,
        this.toFormBody({ network: net }),
        { headers, timeout: 15000 }
      );
      const d = res.data;
      logger.info('VTUGate fetchDataPlans raw response', { network: net, status: d.status, keys: Object.keys(d || {}) });
      if (this.isOk(d.status)) {
        // Handle multiple response shapes
        let plans: any[] = [];
        if (Array.isArray(d.data)) {
          plans = d.data;
        } else if (d.data && Array.isArray(d.data.plans)) {
          plans = d.data.plans;
        } else if (Array.isArray(d.plans)) {
          plans = d.plans;
        } else if (d.data && typeof d.data === 'object') {
          // Data may be an object keyed by plan type
          plans = Object.values(d.data).flat().filter(Array.isArray) as any[];
          if (plans.length === 0) {
            // Try direct object values if they look like plans
            const vals = Object.values(d.data);
            if (vals.every((v: any) => v && typeof v === 'object' && ('amount' in v || 'price' in v || 'plan' in v))) {
              plans = vals as any[];
            }
          }
        }
        return { success: true, plans, rawResponse: d };
      }
      return { success: false, error: d.message || 'Failed to fetch data plans', rawResponse: d };
    } catch (err: any) {
      logger.error('VTUGate fetchDataPlans error', { network, error: err.message, responseData: err.response?.data });
      return { success: false, error: err.response?.data?.message || err.message, rawResponse: err.response?.data };
    }
  }

  async purchaseAirtime(params: {
    network: string;
    phone: string;
    amount: number;
    reference?: string;
  }): Promise<{ success: boolean; reference?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const net = params.network.toLowerCase().replace('9mobile', 'etisalat');
      const ref = params.reference || `vg_air_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const body = this.toFormBody({
        network: net,
        phone: params.phone,
        amount: params.amount,
        reference: ref,
      });
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/buyairtime`,
        body,
        { headers, timeout: 30000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        return {
          success: true,
          reference: d.reference || d.transaction_id || d.transactionId || ref,
          data: d.data || d,
        };
      }
      return { success: false, error: d.message || 'Airtime purchase failed', reference: ref };
    } catch (err: any) {
      logger.error('VTUGate purchaseAirtime error', { error: err.message, params });
      return { success: false, error: err.response?.data?.message || err.message || 'Airtime purchase failed' };
    }
  }

  async purchaseData(params: {
    network: string;
    phone: string;
    planId: string;
    amount: number;
    reference?: string;
  }): Promise<{ success: boolean; reference?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const net = params.network.toLowerCase().replace('9mobile', 'etisalat');
      const ref = params.reference || `vg_dat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const body = this.toFormBody({
        network: net,
        phone: params.phone,
        plan_id: params.planId,
        amount: params.amount,
        reference: ref,
      });
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/buydata`,
        body,
        { headers, timeout: 30000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        return {
          success: true,
          reference: d.reference || d.transaction_id || d.transactionId || ref,
          data: d.data || d,
        };
      }
      return { success: false, error: d.message || 'Data purchase failed', reference: ref };
    } catch (err: any) {
      logger.error('VTUGate purchaseData error', { error: err.message, params });
      return { success: false, error: err.response?.data?.message || err.message || 'Data purchase failed' };
    }
  }

  async verifyElectricity(params: {
    disco: string;
    meterNumber: string;
    meterType: 'prepaid' | 'postpaid';
  }): Promise<{ success: boolean; customerName?: string; address?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const body = this.toFormBody({
        disco: params.disco.toLowerCase(),
        meter_number: params.meterNumber,
        meter_type: params.meterType,
      });
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/verifyelectricity`,
        body,
        { headers, timeout: 15000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        return {
          success: true,
          customerName: d.data?.customer_name || d.data?.name || d.customer_name,
          address: d.data?.address || d.address,
          data: d.data || d,
        };
      }
      return { success: false, error: d.message || 'Meter verification failed' };
    } catch (err: any) {
      logger.error('VTUGate verifyElectricity error', { error: err.message });
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async purchaseElectricity(params: {
    disco: string;
    meterNumber: string;
    meterType: 'prepaid' | 'postpaid';
    amount: number;
    phone?: string;
    reference?: string;
  }): Promise<{ success: boolean; reference?: string; token?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const ref = params.reference || `vg_elec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const body = this.toFormBody({
        disco: params.disco.toLowerCase(),
        meter_number: params.meterNumber,
        meter_type: params.meterType,
        amount: params.amount,
        phone: params.phone || '',
        reference: ref,
      });
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/verifyelectricity`,
        body,
        { headers, timeout: 30000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        const token = d.data?.token || d.data?.units || d.data?.meter_token || d.token;
        return {
          success: true,
          reference: d.reference || d.transaction_id || ref,
          token,
          data: d.data || d,
        };
      }
      return { success: false, error: d.message || 'Electricity purchase failed', reference: ref };
    } catch (err: any) {
      logger.error('VTUGate purchaseElectricity error', { error: err.message });
      return { success: false, error: err.response?.data?.message || err.message || 'Electricity purchase failed' };
    }
  }

  async verifyCableTV(params: {
    provider: string;
    smartcard: string;
  }): Promise<{ success: boolean; customerName?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const body = this.toFormBody({
        provider: params.provider.toLowerCase(),
        smartcard_number: params.smartcard,
      });
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/verifycabletv`,
        body,
        { headers, timeout: 15000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        return {
          success: true,
          customerName: d.data?.customer_name || d.data?.name || d.customer_name,
          data: d.data || d,
        };
      }
      return { success: false, error: d.message || 'Smartcard verification failed' };
    } catch (err: any) {
      logger.error('VTUGate verifyCableTV error', { error: err.message });
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async purchaseCable(params: {
    provider: string;
    smartcard: string;
    planId: string;
    amount: number;
    phone?: string;
    reference?: string;
  }): Promise<{ success: boolean; reference?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const ref = params.reference || `vg_cable_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const body = this.toFormBody({
        provider: params.provider.toLowerCase(),
        smartcard_number: params.smartcard,
        plan_id: params.planId,
        amount: params.amount,
        phone: params.phone || '',
        reference: ref,
      });
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/buycabletv`,
        body,
        { headers, timeout: 30000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        return {
          success: true,
          reference: d.reference || d.transaction_id || ref,
          data: d.data || d,
        };
      }
      return { success: false, error: d.message || 'Cable subscription failed', reference: ref };
    } catch (err: any) {
      logger.error('VTUGate purchaseCable error', { error: err.message });
      return { success: false, error: err.response?.data?.message || err.message || 'Cable subscription failed' };
    }
  }

  async testConnection(): Promise<{ success: boolean; data?: any; message: string }> {
    const result = await this.fetchServices();
    if (result.success) {
      return { success: true, data: result.data, message: 'VTUGate connected successfully. Services fetched.' };
    }
    return { success: false, message: result.error || 'Connection failed' };
  }
}

export const vtuGateService = new VTUGateService();
