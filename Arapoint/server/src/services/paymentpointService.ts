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
  accounts?: PPVirtualAccount[];
  error?: string;
}

interface PPWebhookPayload {
  transactionId: string;
  amountPaid: number;
  settlementAmount: number;
  status: string;
  notificationStatus: string;
  receiverAccountNumber: string;
  receiverAccountName: string;
  receiverBank: string;
  senderName: string;
  senderAccountNumber: string;
  senderBank: string;
  customerName: string;
  customerEmail: string;
  customerId: string;
  description: string;
  timestamp: string;
}

export const paymentpointService = {
  isConfigured(): boolean {
    const config = getConfig();
    return !!(config.apiKey && config.secretKey);
  },

  getHeaders() {
    const config = getConfig();
    return {
      'Authorization': `Bearer ${config.secretKey}`,
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    };
  },

  async createVirtualAccount(data: PPCreateVARequest): Promise<PPCreateVAResponse> {
    if (!this.isConfigured()) {
      logger.warn('PaymentPoint not configured');
      return { success: false, error: 'PaymentPoint gateway not configured' };
    }

    const config = getConfig();

    const requestBody: Record<string, any> = {
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      bankCode: ['20946', '20897'],
    };

    if (config.businessId) requestBody.businessId = config.businessId;

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/createVirtualAccount`,
        requestBody,
        { headers: this.getHeaders(), timeout: 30000 }
      );

      const res = response.data;
      logger.info('PaymentPoint API response', { status: response.status, data: res });

      if (res.status === 'success' && Array.isArray(res.bankAccounts) && res.bankAccounts.length > 0) {
        const accounts: PPVirtualAccount[] = res.bankAccounts.map((acct: any) => ({
          bankName: acct.bankName || acct.bank_name || 'PaymentPoint',
          accountNumber: acct.accountNumber || acct.account_number || '',
          accountName: acct.accountName || acct.account_name || data.name,
          trackingReference: acct.Reserved_Account_Id || acct.trackingReference || data.accountReference,
        }));

        const primaryAccount = accounts[0];

        if (!primaryAccount.accountNumber) {
          logger.error('PaymentPoint API returned no account number', { res });
          return { success: false, error: 'No account number in response' };
        }

        logger.info('PaymentPoint virtual account created', {
          accountNumber: primaryAccount.accountNumber,
          bankName: primaryAccount.bankName,
          totalAccounts: accounts.length,
        });

        return { success: true, account: primaryAccount, accounts };
      }

      const errorMsg = res.message || res.error || 'Failed to create virtual account';
      logger.error('PaymentPoint API returned unsuccessful response', { fullResponse: res });
      return { success: false, error: errorMsg };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error('PaymentPoint virtual account creation FAILED', {
        error: errorMessage,
        fullResponseData: error.response?.data,
        httpStatus: error.response?.status,
        endpoint: `${BASE_URL}/api/v1/createVirtualAccount`,
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
        .createHmac('sha256', config.secretKey)
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
      return {
        transactionId: payload.transaction_id || '',
        amountPaid: parseFloat(payload.amount_paid) || 0,
        settlementAmount: parseFloat(payload.settlement_amount) || 0,
        status: payload.transaction_status || payload.status || '',
        notificationStatus: payload.notification_status || '',
        receiverAccountNumber: payload.receiver?.account_number || '',
        receiverAccountName: payload.receiver?.name || '',
        receiverBank: payload.receiver?.bank || '',
        senderName: payload.sender?.name || '',
        senderAccountNumber: payload.sender?.account_number || '',
        senderBank: payload.sender?.bank || '',
        customerName: payload.customer?.name || '',
        customerEmail: payload.customer?.email || '',
        customerId: payload.customer?.customer_id || '',
        description: payload.description || '',
        timestamp: payload.timestamp || '',
      };
    } catch (error) {
      logger.error('Error parsing PaymentPoint webhook payload', { error, payload });
      return null;
    }
  },
};
