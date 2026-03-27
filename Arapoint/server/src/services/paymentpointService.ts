import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const BASE_URL = 'https://api.paymentpoint.co';

const getConfig = () => ({
  apiKey: process.env.PAYMENTPOINT_API_KEY || '',
  secretKey: process.env.PAYMENTPOINT_SECRET_KEY || '',
  businessId: process.env.PAYMENTPOINT_MERCHANT_ID || process.env.PAYMENTPOINT_BUSINESS_ID || '',
});

interface PPCreateVARequest {
  email: string;
  name: string;
  phoneNumber: string;
  bvn?: string;
  nin?: string;
  accountReference: string;
}

interface PPVirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  trackingReference: string;
}

interface PPCreateVAResponse {
  success: boolean;
  account?: PPVirtualAccount;
  error?: string;
}

interface PPWebhookPayload {
  transactionReference: string;
  paymentReference: string;
  amount: number;
  status: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationBankName: string;
  sourceAccountNumber: string;
  sourceAccountName: string;
  sourceBankName: string;
  sessionId: string;
  currency: string;
  transactionDate: string;
  narration: string;
}

export const paymentpointService = {
  isConfigured(): boolean {
    const config = getConfig();
    return !!(config.apiKey && config.secretKey);
  },

  getHeaders() {
    const config = getConfig();
    return {
      'x-api-key': config.apiKey,
      'x-secret-key': config.secretKey,
      'Content-Type': 'application/json',
    };
  },

  async createVirtualAccount(data: PPCreateVARequest): Promise<PPCreateVAResponse> {
    if (!this.isConfigured()) {
      logger.warn('PaymentPoint not configured');
      return { success: false, error: 'PaymentPoint gateway not configured' };
    }

    try {
      const config = getConfig();
      const requestBody: Record<string, any> = {
        email: data.email,
        name: data.name,
        phone: data.phoneNumber,
        account_reference: data.accountReference,
      };

      if (config.businessId) requestBody.business_id = config.businessId;
      if (data.bvn) requestBody.bvn = data.bvn;
      if (data.nin) requestBody.nin = data.nin;

      logger.info('Creating PaymentPoint virtual account', {
        email: data.email,
        name: data.name,
        reference: data.accountReference,
      });

      const response = await axios.post(
        `${BASE_URL}/v1/virtual-accounts`,
        requestBody,
        { headers: this.getHeaders(), timeout: 30000 }
      );

      const res = response.data;

      if (res.status === true || res.success === true || res.code === '00') {
        const account = res.data || res.account || res;
        const bankName = account.bank_name || account.bankName || 'PaymentPoint';
        const accountNumber = account.account_number || account.accountNumber || '';
        const accountName = account.account_name || account.accountName || data.name;
        const trackingReference = account.reference || account.trackingReference || data.accountReference;

        if (!accountNumber) {
          logger.error('PaymentPoint API returned no account number', { res });
          return { success: false, error: 'No account number in response' };
        }

        logger.info('PaymentPoint virtual account created', { accountNumber, bankName });
        return {
          success: true,
          account: { bankName, accountNumber, accountName, trackingReference },
        };
      }

      const errorMsg = res.message || res.error || 'Failed to create virtual account';
      logger.error('PaymentPoint API returned unsuccessful response', { res });
      return { success: false, error: errorMsg };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error('PaymentPoint virtual account creation failed', {
        error: errorMessage,
        data: error.response?.data,
        status: error.response?.status,
      });
      return { success: false, error: errorMessage };
    }
  },

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const config = getConfig();
    if (!config.secretKey) {
      logger.warn('PaymentPoint secret key not configured for webhook verification');
      return false;
    }
    try {
      const hash = crypto
        .createHmac('sha512', config.secretKey)
        .update(payload)
        .digest('hex');
      return hash === signature;
    } catch (error) {
      logger.error('Error verifying PaymentPoint webhook signature', { error });
      return false;
    }
  },

  parseWebhookPayload(payload: any): PPWebhookPayload | null {
    try {
      const data = payload.data || payload;
      return {
        transactionReference: data.transaction_reference || data.transactionReference || '',
        paymentReference: data.payment_reference || data.paymentReference || '',
        amount: parseFloat(data.amount) || 0,
        status: data.status || '',
        destinationAccountNumber: data.destination_account_number || data.destinationAccountNumber || data.account_number || '',
        destinationBankCode: data.destination_bank_code || data.destinationBankCode || '',
        destinationBankName: data.destination_bank_name || data.destinationBankName || '',
        sourceAccountNumber: data.source_account_number || data.sourceAccountNumber || '',
        sourceAccountName: data.source_account_name || data.sourceAccountName || '',
        sourceBankName: data.source_bank_name || data.sourceBankName || '',
        sessionId: data.session_id || data.sessionId || '',
        currency: data.currency || 'NGN',
        transactionDate: data.transaction_date || data.transactionDate || '',
        narration: data.narration || data.description || '',
      };
    } catch (error) {
      logger.error('Error parsing PaymentPoint webhook payload', { error, payload });
      return null;
    }
  },
};
