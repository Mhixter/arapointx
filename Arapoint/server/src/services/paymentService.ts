import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';
import { walletService } from './walletService';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
    };
  };
}

interface PalmPayInitResponse {
  success: boolean;
  data?: {
    reference: string;
    paymentUrl: string;
    amount: number;
  };
  error?: string;
}

const PALMPAY_API_BASE = 'https://openapi.palmmerchant.com';

export const paymentService = {
  async initializePaystack(userId: string, amount: number, email: string) {
    const reference = generateReferenceId();
    const amountInKobo = amount * 100;

    if (!config.PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack is not configured');
    }

    try {
      const callbackUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/payment/paystack/callback`
        : config.NODE_ENV === 'production' 
          ? 'https://arapoint.com.ng/api/payment/paystack/callback' 
          : 'http://localhost:5000/api/payment/paystack/callback';

      const response = await axios.post<PaystackInitResponse>(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amountInKobo,
          reference,
          callback_url: callbackUrl,
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
          metadata: {
            userId,
            custom_fields: [
              {
                display_name: 'User ID',
                variable_name: 'user_id',
                value: userId,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Paystack payment initialized', { userId, amount, reference });

      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      logger.error('Paystack initialization failed', { error: error.message, userId });
      throw new Error('Failed to initialize payment');
    }
  },

  async verifyPaystack(reference: string) {
    if (!config.PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack is not configured');
    }

    try {
      const response = await axios.get<PaystackVerifyResponse>(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const { status, data } = response.data;

      if (status && data.status === 'success') {
        logger.info('Paystack payment verified', { reference, amount: data.amount / 100 });

        return {
          success: true,
          reference: data.reference,
          amount: data.amount / 100,
          email: data.customer.email,
        };
      }

      return {
        success: false,
        reference,
        message: 'Payment not successful',
      };
    } catch (error: any) {
      logger.error('Paystack verification failed', { error: error.message, reference });
      throw new Error('Failed to verify payment');
    }
  },

  async handlePaystackWebhook(payload: any, userId: string) {
    const { event, data } = payload;

    if (event === 'charge.success') {
      const amount = data.amount / 100;
      const reference = data.reference;

      await walletService.addBalance(userId, amount, reference, 'paystack');

      logger.info('Paystack webhook processed', { userId, amount, reference });

      return {
        success: true,
        amount,
        reference,
      };
    }

    return {
      success: false,
      message: 'Event not handled',
    };
  },

  async initializePalmpay(userId: string, amount: number, email?: string): Promise<PalmPayInitResponse> {
    const reference = generateReferenceId();

    const palmpayApiKey = config.PALMPAY_API_KEY;
    const palmpaySecretKey = config.PALMPAY_SECRET_KEY;

    if (!palmpayApiKey || !palmpaySecretKey) {
      logger.warn('PalmPay not configured', { userId });
      
      return {
        success: false,
        error: 'PalmPay Direct is not yet available. Please use Paystack - it supports PalmPay as a payment option within its checkout page.',
      };
    }

    try {
      const callbackUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/payment/palmpay/callback`
        : 'https://arapoint.com.ng/api/payment/palmpay/callback';

      const response = await axios.post(
        `${PALMPAY_API_BASE}/v1/payment/initialize`,
        {
          amount: amount * 100,
          reference,
          callbackUrl,
          email: email || 'user@arapoint.com',
          metadata: { userId },
        },
        {
          headers: {
            'Authorization': `Bearer ${palmpayApiKey}`,
            'x-secret-key': palmpaySecretKey,
            'x-app-id': config.PALMPAY_APP_ID,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        logger.info('PalmPay payment initialized', { userId, amount, reference });

        return {
          success: true,
          data: {
            reference: response.data.data.reference || reference,
            paymentUrl: response.data.data.paymentUrl,
            amount,
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to initialize PalmPay payment',
      };
    } catch (error: any) {
      logger.error('PalmPay initialization failed', { error: error.message, userId });
      
      return {
        success: false,
        error: 'PalmPay service unavailable. Please try Paystack instead.',
      };
    }
  },

  async verifyPalmpay(reference: string) {
    const palmpayApiKey = config.PALMPAY_API_KEY;
    const palmpaySecretKey = config.PALMPAY_SECRET_KEY;

    if (!palmpayApiKey || !palmpaySecretKey) {
      logger.warn('PalmPay not configured for verification', { reference });
      
      return {
        success: false,
        reference,
        message: 'PalmPay integration is not configured',
      };
    }

    try {
      const response = await axios.get(
        `${PALMPAY_API_BASE}/v1/payment/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${palmpayApiKey}`,
            'x-secret-key': palmpaySecretKey,
            'x-app-id': config.PALMPAY_APP_ID,
          },
        }
      );

      if (response.data.success && response.data.data.status === 'success') {
        logger.info('PalmPay payment verified', { reference, amount: response.data.data.amount / 100 });

        return {
          success: true,
          reference,
          amount: response.data.data.amount / 100,
        };
      }

      return {
        success: false,
        reference,
        message: response.data.message || 'Payment not successful',
      };
    } catch (error: any) {
      logger.error('PalmPay verification failed', { error: error.message, reference });
      
      return {
        success: false,
        reference,
        message: 'Failed to verify payment',
      };
    }
  },

  isPaystackConfigured(): boolean {
    return !!config.PAYSTACK_SECRET_KEY;
  },

  isPalmpayConfigured(): boolean {
    return !!(config.PALMPAY_API_KEY && config.PALMPAY_SECRET_KEY);
  },

  getAvailableGateways(): string[] {
    const gateways = [];
    if (this.isPaystackConfigured()) gateways.push('paystack');
    if (this.isPalmpayConfigured()) gateways.push('palmpay');
    return gateways;
  },
};
