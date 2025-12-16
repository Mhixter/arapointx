import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';

const VTPASS_LIVE_URL = 'https://vtpass.com/api';
const VTPASS_SANDBOX_URL = 'https://sandbox.vtpass.com/api';

interface VTpassConfig {
  apiKey: string;
  secretKey: string;
  useSandbox?: boolean;
}

interface TransactionResult {
  success: boolean;
  data?: TransactionData;
  reference: string;
  error?: string;
  errorCode?: string;
}

interface TransactionData {
  transactionId: string;
  status: string;
  productName: string;
  amount: number;
  commission: number;
  phone?: string;
  token?: string;
  units?: string;
  customerName?: string;
}

interface DataPlan {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

interface DataPlansResult {
  success: boolean;
  plans?: DataPlan[];
  error?: string;
}

interface MeterVerificationResult {
  success: boolean;
  data?: {
    customerName: string;
    address: string;
    meterNumber: string;
    meterType: string;
    canVend: boolean;
  };
  error?: string;
}

class VTpassService {
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance {
    const apiKey = process.env.VTPASS_API_KEY;
    const secretKey = process.env.VTPASS_SECRET_KEY;
    const publicKey = process.env.VTPASS_PUBLIC_KEY;
    const useSandbox = process.env.VTPASS_SANDBOX === 'true';

    if (!apiKey || !secretKey) {
      throw new Error('VTPASS_API_KEY and VTPASS_SECRET_KEY are not configured');
    }

    if (!this.client) {
      const baseURL = useSandbox ? VTPASS_SANDBOX_URL : VTPASS_LIVE_URL;
      
      this.client = axios.create({
        baseURL,
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'secret-key': secretKey,
          ...(publicKey && { 'public-key': publicKey }),
        },
      });
    }

    return this.client;
  }

  async purchaseAirtime(
    phone: string,
    amount: number,
    network: 'mtn' | 'airtel' | 'glo' | 'etisalat'
  ): Promise<TransactionResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('VTpass airtime purchase started', { phone: phone.substring(0, 4) + '***', amount, network, reference });

      const response = await this.getClient().post('/pay', {
        request_id: reference,
        serviceID: network,
        amount: amount,
        phone: phone,
      });

      if (response.data.code === '000') {
        const tx = response.data.content?.transactions || {};
        
        const transactionData: TransactionData = {
          transactionId: tx.transactionId || response.data.requestId || reference,
          status: tx.status || 'delivered',
          productName: tx.product_name || `${network.toUpperCase()} Airtime`,
          amount: parseFloat(tx.amount || amount),
          commission: tx.commission || 0,
          phone: phone,
        };

        logger.info('VTpass airtime purchase successful', { reference, transactionId: transactionData.transactionId });
        return { success: true, data: transactionData, reference };
      } else {
        const errorMsg = response.data.response_description || 'Airtime purchase failed';
        logger.warn('VTpass airtime purchase failed', { error: errorMsg, reference, code: response.data.code });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.code,
        };
      }
    } catch (error: any) {
      logger.error('VTpass airtime purchase error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.response_description || 
                       error.response?.data?.message || 
                       error.message || 
                       'Airtime purchase failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.code,
      };
    }
  }

  async getDataPlans(network: 'mtn-data' | 'airtel-data' | 'glo-data' | '9mobile-sme-data'): Promise<DataPlansResult> {
    try {
      logger.info('VTpass fetching data plans', { network });

      const response = await this.getClient().get(`/service-variations?serviceID=${network}`);

      if (response.data.response_description === '000' || response.data.content?.variations) {
        const plans = response.data.content?.variations || [];
        logger.info('VTpass data plans retrieved', { network, count: plans.length });
        return { success: true, plans };
      } else {
        const errorMsg = response.data.response_description || 'Failed to get data plans';
        logger.warn('VTpass get data plans failed', { error: errorMsg, network });
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      logger.error('VTpass get data plans error', { 
        error: error.message, 
        network,
      });
      
      return { 
        success: false, 
        error: error.message || 'Failed to get data plans',
      };
    }
  }

  async purchaseData(
    phone: string,
    variationCode: string,
    amount: number,
    network: 'mtn-data' | 'airtel-data' | 'glo-data' | '9mobile-sme-data'
  ): Promise<TransactionResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('VTpass data purchase started', { phone: phone.substring(0, 4) + '***', variationCode, network, reference });

      const response = await this.getClient().post('/pay', {
        request_id: reference,
        serviceID: network,
        billersCode: phone,
        variation_code: variationCode,
        amount: amount,
        phone: phone,
      });

      if (response.data.code === '000') {
        const tx = response.data.content?.transactions || {};
        
        const transactionData: TransactionData = {
          transactionId: tx.transactionId || response.data.requestId || reference,
          status: tx.status || 'delivered',
          productName: tx.product_name || `${network.toUpperCase()} Data`,
          amount: parseFloat(tx.amount || amount),
          commission: tx.commission || 0,
          phone: phone,
        };

        logger.info('VTpass data purchase successful', { reference, transactionId: transactionData.transactionId });
        return { success: true, data: transactionData, reference };
      } else {
        const errorMsg = response.data.response_description || 'Data purchase failed';
        logger.warn('VTpass data purchase failed', { error: errorMsg, reference, code: response.data.code });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.code,
        };
      }
    } catch (error: any) {
      logger.error('VTpass data purchase error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.response_description || 
                       error.response?.data?.message || 
                       error.message || 
                       'Data purchase failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.code,
      };
    }
  }

  async verifyMeter(
    meterNumber: string,
    serviceID: string,
    meterType: 'prepaid' | 'postpaid'
  ): Promise<MeterVerificationResult> {
    try {
      logger.info('VTpass meter verification started', { meterNumber: meterNumber.substring(0, 4) + '***', serviceID, meterType });

      const response = await this.getClient().post('/merchant-verify', {
        billersCode: meterNumber,
        serviceID: serviceID,
        type: meterType,
      });

      if (response.data.code === '000' && response.data.content) {
        const content = response.data.content;
        
        logger.info('VTpass meter verification successful', { customerName: content.Customer_Name });
        return { 
          success: true, 
          data: {
            customerName: content.Customer_Name || '',
            address: content.Address || '',
            meterNumber: content.Meter_Number || meterNumber,
            meterType: content.Meter_Type || meterType.toUpperCase(),
            canVend: content.Can_Vend === 'yes',
          },
        };
      } else {
        const errorMsg = response.data.response_description || 'Meter verification failed';
        logger.warn('VTpass meter verification failed', { error: errorMsg });
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      logger.error('VTpass meter verification error', { 
        error: error.message,
      });
      
      return { 
        success: false, 
        error: error.message || 'Meter verification failed',
      };
    }
  }

  async purchaseElectricity(
    meterNumber: string,
    amount: number,
    serviceID: string,
    meterType: 'prepaid' | 'postpaid',
    phone: string
  ): Promise<TransactionResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('VTpass electricity purchase started', { meterNumber: meterNumber.substring(0, 4) + '***', amount, serviceID, reference });

      const response = await this.getClient().post('/pay', {
        request_id: reference,
        serviceID: serviceID,
        billersCode: meterNumber,
        variation_code: meterType,
        amount: amount,
        phone: phone,
      });

      if (response.data.code === '000') {
        const tx = response.data.content?.transactions || {};
        
        const transactionData: TransactionData = {
          transactionId: tx.transactionId || response.data.requestId || reference,
          status: tx.status || 'delivered',
          productName: tx.product_name || `Electricity (${serviceID})`,
          amount: parseFloat(tx.amount || amount),
          commission: tx.commission || 0,
          phone: phone,
          token: response.data.purchased_code || response.data.token || '',
          units: response.data.units || '',
          customerName: response.data.customerName || '',
        };

        logger.info('VTpass electricity purchase successful', { reference, transactionId: transactionData.transactionId, token: transactionData.token ? '***' : 'N/A' });
        return { success: true, data: transactionData, reference };
      } else {
        const errorMsg = response.data.response_description || 'Electricity purchase failed';
        logger.warn('VTpass electricity purchase failed', { error: errorMsg, reference, code: response.data.code });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.code,
        };
      }
    } catch (error: any) {
      logger.error('VTpass electricity purchase error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.response_description || 
                       error.response?.data?.message || 
                       error.message || 
                       'Electricity purchase failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.code,
      };
    }
  }

  async requeryTransaction(requestId: string): Promise<TransactionResult> {
    try {
      logger.info('VTpass transaction requery', { requestId });

      const response = await this.getClient().post('/requery', {
        request_id: requestId,
      });

      if (response.data.code === '000') {
        const tx = response.data.content?.transactions || {};
        
        const transactionData: TransactionData = {
          transactionId: tx.transactionId || requestId,
          status: tx.status || 'unknown',
          productName: tx.product_name || 'Unknown',
          amount: parseFloat(tx.amount || 0),
          commission: tx.commission || 0,
        };

        logger.info('VTpass transaction requery successful', { requestId, status: transactionData.status });
        return { success: true, data: transactionData, reference: requestId };
      } else {
        const errorMsg = response.data.response_description || 'Transaction query failed';
        logger.warn('VTpass transaction requery failed', { error: errorMsg, requestId });
        return { 
          success: false, 
          error: errorMsg, 
          reference: requestId,
          errorCode: response.data.code,
        };
      }
    } catch (error: any) {
      logger.error('VTpass transaction requery error', { 
        error: error.message, 
        requestId,
      });
      
      return { 
        success: false, 
        error: error.message || 'Transaction query failed',
        reference: requestId,
      };
    }
  }

  async verifyCableSmartcard(
    smartcardNumber: string,
    serviceID: string
  ): Promise<{
    success: boolean;
    data?: {
      customerName: string;
      currentPackage: string;
      dueDate: string;
      smartcardNumber: string;
      canRecharge: boolean;
    };
    error?: string;
  }> {
    try {
      logger.info('VTpass smartcard verification started', { smartcardNumber: smartcardNumber.substring(0, 4) + '***', serviceID });

      const response = await this.getClient().post('/merchant-verify', {
        billersCode: smartcardNumber,
        serviceID: serviceID,
      });

      if (response.data.code === '000' && response.data.content) {
        const content = response.data.content;
        
        logger.info('VTpass smartcard verification successful', { customerName: content.Customer_Name });
        return { 
          success: true, 
          data: {
            customerName: content.Customer_Name || content.customerName || '',
            currentPackage: content.Current_Bouquet || content.currentBouquet || 'N/A',
            dueDate: content.Due_Date || content.dueDate || new Date().toISOString(),
            smartcardNumber: smartcardNumber,
            canRecharge: true,
          },
        };
      } else {
        const errorMsg = response.data.response_description || 'Smartcard verification failed';
        logger.warn('VTpass smartcard verification failed', { error: errorMsg });
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      logger.error('VTpass smartcard verification error', { error: error.message });
      return { success: false, error: error.message || 'Smartcard verification failed' };
    }
  }

  async getCablePlans(serviceID: string): Promise<{
    success: boolean;
    plans?: Array<{
      variation_code: string;
      name: string;
      variation_amount: string;
      fixedPrice: string;
    }>;
    error?: string;
  }> {
    try {
      logger.info('VTpass fetching cable plans', { serviceID });

      const response = await this.getClient().get(`/service-variations?serviceID=${serviceID}`);

      if (response.data.response_description === '000' || response.data.content?.variations) {
        const plans = response.data.content?.variations || [];
        logger.info('VTpass cable plans retrieved', { serviceID, count: plans.length });
        return { success: true, plans };
      } else {
        const errorMsg = response.data.response_description || 'Failed to get cable plans';
        logger.warn('VTpass get cable plans failed', { error: errorMsg, serviceID });
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      logger.error('VTpass get cable plans error', { error: error.message, serviceID });
      return { success: false, error: error.message || 'Failed to get cable plans' };
    }
  }

  async purchaseCable(
    smartcardNumber: string,
    variationCode: string,
    amount: number,
    serviceID: string,
    phone: string,
    subscriptionType: string = 'renew'
  ): Promise<TransactionResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('VTpass cable purchase started', { 
        smartcardNumber: smartcardNumber.substring(0, 4) + '***', 
        variationCode, 
        serviceID, 
        reference 
      });

      const response = await this.getClient().post('/pay', {
        request_id: reference,
        serviceID: serviceID,
        billersCode: smartcardNumber,
        variation_code: variationCode,
        amount: amount,
        phone: phone,
        subscription_type: subscriptionType,
      });

      if (response.data.code === '000') {
        const tx = response.data.content?.transactions || {};
        
        const transactionData: TransactionData = {
          transactionId: tx.transactionId || response.data.requestId || reference,
          status: tx.status || 'delivered',
          productName: tx.product_name || `Cable TV (${serviceID})`,
          amount: parseFloat(tx.amount || amount),
          commission: tx.commission || 0,
          phone: phone,
        };

        logger.info('VTpass cable purchase successful', { reference, transactionId: transactionData.transactionId });
        return { success: true, data: transactionData, reference };
      } else {
        const errorMsg = response.data.response_description || 'Cable subscription failed';
        logger.warn('VTpass cable purchase failed', { error: errorMsg, reference, code: response.data.code });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.code,
        };
      }
    } catch (error: any) {
      logger.error('VTpass cable purchase error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.response_description || 
                       error.response?.data?.message || 
                       error.message || 
                       'Cable subscription failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.code,
      };
    }
  }

  isConfigured(): boolean {
    return !!(process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY);
  }

  isSandboxMode(): boolean {
    return process.env.VTPASS_SANDBOX === 'true';
  }

  getWebhookInfo(): { url: string; instructions: string } {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || 'your-domain.com';
    const webhookUrl = `https://${domain}/api/payment/vtpass/webhook`;
    
    return {
      url: webhookUrl,
      instructions: `Configure this URL in your VTpass dashboard under Settings > Webhook URL: ${webhookUrl}`,
    };
  }
}

export const vtpassService = new VTpassService();
