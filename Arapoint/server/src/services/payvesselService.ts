import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const getPayvesselConfig = () => ({
  apiKey: process.env.PAYVESSEL_API_KEY,
  secretKey: process.env.PAYVESSEL_SECRET_KEY,
  businessId: process.env.PAYVESSEL_BUSINESS_ID,
  baseUrl: 'https://ap.payvessel.com/pms/api/external',
});

interface PayvesselVirtualAccountRequest {
  email: string;
  name: string;
  phoneNumber: string;
  bvn?: string;
  nin?: string;
  bankcode?: string[];
}

interface PayvesselVirtualAccountResponse {
  status: boolean;
  banks: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    account_type: string;
    trackingReference: string;
  }>;
}

interface PayvesselWebhookPayload {
  transactionReference: string;
  settlementId: string;
  paymentReference: string;
  amount: number;
  transactionDate: string;
  transactionDescription: string;
  destinationAccountNumber: string;
  destinationAccountName: string;
  destinationBankCode: string;
  destinationBankName: string;
  sourceAccountNumber: string;
  sourceAccountName: string;
  sourceBankCode: string;
  sourceBankName: string;
  sessionId: string;
  fee: number;
  vat: number;
  currency: string;
  status: string;
}

export const payvesselService = {
  isConfigured(): boolean {
    const config = getPayvesselConfig();
    return !!(config.apiKey && config.secretKey && config.businessId);
  },

  getHeaders() {
    const config = getPayvesselConfig();
    return {
      'api-key': config.apiKey,
      'api-secret': `Bearer ${config.secretKey}`,
      'Content-Type': 'application/json',
    };
  },

  async createVirtualAccount(data: PayvesselVirtualAccountRequest): Promise<{
    success: boolean;
    account?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      trackingReference: string;
    };
    error?: string;
  }> {
    const config = getPayvesselConfig();

    if (!this.isConfigured()) {
      logger.warn('Payvessel not configured');
      return { success: false, error: 'Payment gateway not configured' };
    }

    try {
      const requestBody = {
        email: data.email,
        name: data.name,
        phoneNumber: data.phoneNumber,
        bankcode: data.bankcode || ['120001'],
        account_type: 'STATIC',
        businessid: config.businessId,
        ...(data.bvn && { bvn: data.bvn }),
        ...(data.nin && { nin: data.nin }),
      };

      logger.info('Creating Payvessel virtual account', { email: data.email, name: data.name });

      const response = await axios.post<PayvesselVirtualAccountResponse>(
        `${config.baseUrl}/request/customerReservedAccount/`,
        requestBody,
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.banks && response.data.banks.length > 0) {
        const bank = response.data.banks[0];
        logger.info('Payvessel virtual account created', { 
          accountNumber: bank.accountNumber,
          bankName: bank.bankName 
        });

        return {
          success: true,
          account: {
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            accountName: bank.accountName,
            trackingReference: bank.trackingReference,
          },
        };
      }

      logger.error('Payvessel API returned unsuccessful response', { response: response.data });
      return { success: false, error: 'Failed to create virtual account' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error('Payvessel virtual account creation failed', {
        error: errorMessage,
        data: error.response?.data,
      });
      return { success: false, error: errorMessage };
    }
  },

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const config = getPayvesselConfig();
    if (!config.secretKey) {
      logger.warn('Payvessel secret key not configured for webhook verification');
      return false;
    }

    try {
      const hash = crypto
        .createHmac('sha512', config.secretKey)
        .update(payload)
        .digest('hex');
      return hash === signature;
    } catch (error) {
      logger.error('Error verifying Payvessel webhook signature', { error });
      return false;
    }
  },

  parseWebhookPayload(payload: any): PayvesselWebhookPayload | null {
    try {
      return {
        transactionReference: payload.transactionReference || '',
        settlementId: payload.settlementId || '',
        paymentReference: payload.paymentReference || '',
        amount: parseFloat(payload.amount) || 0,
        transactionDate: payload.transactionDate || '',
        transactionDescription: payload.transactionDescription || '',
        destinationAccountNumber: payload.destinationAccountNumber || '',
        destinationAccountName: payload.destinationAccountName || '',
        destinationBankCode: payload.destinationBankCode || '',
        destinationBankName: payload.destinationBankName || '',
        sourceAccountNumber: payload.sourceAccountNumber || '',
        sourceAccountName: payload.sourceAccountName || '',
        sourceBankCode: payload.sourceBankCode || '',
        sourceBankName: payload.sourceBankName || '',
        sessionId: payload.sessionId || '',
        fee: parseFloat(payload.fee) || 0,
        vat: parseFloat(payload.vat) || 0,
        currency: payload.currency || 'NGN',
        status: payload.status || '',
      };
    } catch (error) {
      logger.error('Error parsing Payvessel webhook payload', { error, payload });
      return null;
    }
  },
};
