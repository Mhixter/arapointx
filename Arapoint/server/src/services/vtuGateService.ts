import axios from 'axios';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { adminSettings, scrapedDataPlans } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const BASE_URL = 'https://api.vtugate.com';

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

  // Fetch all services of a given type (airtime, data, tv, electricity, education)
  async fetchServicesByType(serviceType: string): Promise<{ success: boolean; services?: Array<{ service_id: number; network_name: string; provider: string }>; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/fetchservices`,
        this.toFormBody({ service_type: serviceType }),
        { headers, timeout: 15000 }
      );
      const d = res.data;
      logger.info('VTUGate fetchServices response', { serviceType, status: d.status, count: Array.isArray(d.data) ? d.data.length : 0 });
      if (this.isOk(d.status)) {
        const services = Array.isArray(d.data) ? d.data : [];
        return { success: true, services };
      }
      return { success: false, error: d.message || 'Failed to fetch services' };
    } catch (err: any) {
      logger.error('VTUGate fetchServices error', { error: err.message });
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  // Fetch data plans for a specific service_id (numeric ID from fetchServices)
  async fetchDataPlansByServiceId(serviceId: number): Promise<{ success: boolean; plans?: any[]; rawResponse?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/fetchdataplans`,
        this.toFormBody({ service_id: serviceId }),
        { headers, timeout: 15000 }
      );
      const d = res.data;
      logger.info('VTUGate fetchDataPlans response', { serviceId, status: d.status, dataType: typeof d.data, isArray: Array.isArray(d.data), count: Array.isArray(d.data) ? d.data.length : 0 });
      if (this.isOk(d.status)) {
        let plans: any[] = [];
        if (d.data && Array.isArray(d.data.data_plans)) {
          plans = d.data.data_plans;
        } else if (Array.isArray(d.data)) {
          plans = d.data;
        } else if (d.data && Array.isArray(d.data.plans)) {
          plans = d.data.plans;
        } else if (Array.isArray(d.plans)) {
          plans = d.plans;
        } else if (Array.isArray(d.data_plans)) {
          plans = d.data_plans;
        }
        return { success: true, plans, rawResponse: d };
      }
      return { success: false, error: d.message || 'Failed to fetch data plans', rawResponse: d };
    } catch (err: any) {
      logger.error('VTUGate fetchDataPlansByServiceId error', { serviceId, error: err.message });
      return { success: false, error: err.response?.data?.message || err.message, rawResponse: err.response?.data };
    }
  }

  // Legacy method — kept for backward compatibility with purchase endpoints
  async fetchDataPlans(network: string): Promise<{ success: boolean; plans?: any[]; rawResponse?: any; error?: string }> {
    // For purchase-time lookups, try fetching all data services and find by network name
    try {
      const servicesResult = await this.fetchServicesByType('data');
      if (servicesResult.success && servicesResult.services) {
        const normalizedNetwork = network.toLowerCase().replace('9mobile', 'etisalat');
        const matched = servicesResult.services.filter(s =>
          s.network_name.toLowerCase().includes(normalizedNetwork) ||
          normalizedNetwork.includes(s.network_name.toLowerCase())
        );
        if (matched.length > 0) {
          const allPlans: any[] = [];
          for (const svc of matched) {
            const result = await this.fetchDataPlansByServiceId(svc.service_id);
            if (result.success && result.plans) allPlans.push(...result.plans);
          }
          return { success: true, plans: allPlans };
        }
      }
    } catch { /* fall through */ }
    return { success: false, error: 'No data services found for network: ' + network };
  }

  async purchaseAirtime(params: {
    network: string;
    phone: string;
    amount: number;
    reference?: string;
    callbackUrl?: string;
  }): Promise<{ success: boolean; reference?: string; deliveryStatus?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const ref = params.reference || `vg_air_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // VTUGate buyairtime requires numeric service_id — look up from fetchservices
      const normalizedNet = params.network.toLowerCase().replace(/\s/g, '').replace('9mobile', 'etisalat');
      const servicesResult = await this.fetchServicesByType('airtime');
      let serviceId: number | null = null;
      if (servicesResult.success && servicesResult.services) {
        const matched = servicesResult.services.find(s => {
          const sn = s.network_name.toLowerCase().replace(/\s/g, '');
          return sn.includes(normalizedNet) || normalizedNet.includes(sn);
        });
        if (matched) serviceId = matched.service_id;
      }
      if (!serviceId) {
        logger.error('VTUGate purchaseAirtime: no service_id found for network', { network: params.network });
        return { success: false, error: `Airtime service not found for network: ${params.network}` };
      }

      logger.info('VTUGate purchaseAirtime using service_id', { serviceId, network: params.network });
      const bodyParams: Record<string, any> = {
        service_id: serviceId,
        phone_number: params.phone,
        amount: params.amount,
        reference: ref,
      };
      if (params.callbackUrl) bodyParams.callback_url = params.callbackUrl;
      const body = this.toFormBody(bodyParams);
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/buyairtime`,
        body,
        { headers, timeout: 30000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        const dataObj = d.data || d;
        const deliveryStatus = (
          dataObj?.delivery_status || dataObj?.deliveryStatus ||
          dataObj?.transaction_status || dataObj?.status || ''
        ).toString().toLowerCase();
        return {
          success: true,
          reference: d.reference || d.transaction_id || d.transactionId || dataObj?.reference || ref,
          deliveryStatus,
          data: dataObj,
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
    callbackUrl?: string;
  }): Promise<{ success: boolean; reference?: string; deliveryStatus?: string; data?: any; error?: string }> {
    try {
      const headers = await this.buildHeaders();
      const ref = params.reference || `vg_dat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // VTUGate buydata requires the numeric service_id that belongs to the specific plan.
      // First look it up from the stored DB record (set during sync) — this is exact.
      // Fall back to a network-name match only if not in DB.
      let serviceId: number | null = null;

      try {
        const [planRow] = await db.select({ providerServiceId: scrapedDataPlans.providerServiceId })
          .from(scrapedDataPlans)
          .where(and(
            eq(scrapedDataPlans.planId, params.planId),
            eq(scrapedDataPlans.provider, 'vtugate'),
          ))
          .limit(1);
        if (planRow?.providerServiceId) serviceId = planRow.providerServiceId;
      } catch { /* DB lookup failed, will fall back */ }

      if (!serviceId) {
        // Fallback: match by network name across activated services
        const normalizedNet = params.network.toLowerCase().replace(/\s/g, '').replace('9mobile', 'etisalat');
        const servicesResult = await this.fetchServicesByType('data');
        if (servicesResult.success && servicesResult.services) {
          const matched = servicesResult.services.find(s => {
            const sn = s.network_name.toLowerCase().replace(/\s/g, '');
            return sn.includes(normalizedNet) || normalizedNet.includes(sn);
          });
          if (matched) serviceId = matched.service_id;
        }
      }

      if (!serviceId) {
        logger.error('VTUGate purchaseData: no service_id found', { network: params.network, planId: params.planId });
        return { success: false, error: `Data service not found for plan: ${params.planId}` };
      }

      logger.info('VTUGate purchaseData using service_id', { serviceId, network: params.network, planId: params.planId });
      const bodyParams: Record<string, any> = {
        service_id: serviceId,
        phone_number: params.phone,
        plan_code: params.planId,
        amount: params.amount,
        reference: ref,
      };
      if (params.callbackUrl) bodyParams.callback_url = params.callbackUrl;
      const body = this.toFormBody(bodyParams);
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/buydata`,
        body,
        { headers, timeout: 30000 }
      );
      const d = res.data;
      if (this.isOk(d.status)) {
        const dataObj = d.data || d;
        const deliveryStatus = (
          dataObj?.delivery_status || dataObj?.deliveryStatus ||
          dataObj?.transaction_status || dataObj?.status || ''
        ).toString().toLowerCase();
        return {
          success: true,
          reference: d.reference || d.transaction_id || d.transactionId || dataObj?.reference || ref,
          deliveryStatus,
          data: dataObj,
        };
      }
      return { success: false, error: d.message || 'Data purchase failed', reference: ref };
    } catch (err: any) {
      logger.error('VTUGate purchaseData error', { error: err.message, params });
      return { success: false, error: err.response?.data?.message || err.message || 'Data purchase failed' };
    }
  }

  async checkTransactionStatus(reference: string): Promise<{ success: boolean; status?: string; delivered?: boolean; failed?: boolean; error?: string }> {
    const DELIVERED = ['delivered', 'success', 'completed', 'successful', 'processed', 'sent', 'paid', 'confirmed'];
    const FAILED = ['failed', 'error', 'reversed', 'refunded', 'failed_delivery', 'cancelled', 'rejected'];
    try {
      const headers = await this.buildHeaders();
      const res = await axios.post<VTUGateResponse>(
        `${BASE_URL}/api/v1/querytransaction`,
        this.toFormBody({ reference }),
        { headers, timeout: 15000 }
      );
      const d = res.data;

      // Extract delivery_status from whichever field VTUGate puts it in
      const rawStatus = (
        d.data?.delivery_status || d.data?.deliveryStatus ||
        d.data?.transaction_status || d.data?.status ||
        d.delivery_status || d.deliveryStatus || ''
      ).toString().toLowerCase();

      // VTUGate returns status: true/1 at the top level when the transaction was processed.
      // If we found no specific delivery_status but the top-level API status is ok, treat as delivered.
      const apiOk = this.isOk(d.status);
      const delivered = DELIVERED.includes(rawStatus) || (apiOk && rawStatus === '' && !FAILED.includes(rawStatus));
      const failed = FAILED.includes(rawStatus);

      logger.info('VTUGate checkTransactionStatus', { reference, rawStatus, apiStatus: d.status, delivered, failed });
      return {
        success: true,
        status: rawStatus || (apiOk ? 'delivered' : 'unknown'),
        delivered,
        failed,
      };
    } catch (err: any) {
      logger.warn('VTUGate checkTransactionStatus error', { reference, error: err.message });
      return { success: false, error: err.message };
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
