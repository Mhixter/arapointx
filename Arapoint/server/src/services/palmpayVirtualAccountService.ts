import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const PALMPAY_PROD_BASE = 'https://open-gw-prod.palmpay-inc.com';

const getPalmpayConfig = () => ({
  appId: process.env.PALMPAY_APP_ID || '',
  privateKey: process.env.PALMPAY_PRIVATE_KEY || '',
});

const generateNonceStr = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateSignature = (params: Record<string, any>, privateKeyBase64: string): string => {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      filtered[key] = String(value).trim();
    }
  }

  const sortedKeys = Object.keys(filtered).sort();
  const strA = sortedKeys.map(k => `${k}=${filtered[k]}`).join('&');

  const md5Str = crypto.createHash('md5').update(strA, 'utf8').digest('hex').toUpperCase();

  let privateKeyPem: string;
  if (privateKeyBase64.includes('-----BEGIN')) {
    privateKeyPem = privateKeyBase64;
  } else {
    const cleaned = privateKeyBase64.replace(/\s+/g, '');
    const formatted = cleaned.match(/.{1,64}/g)?.join('\n') || cleaned;
    privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
  }

  try {
    const sign = crypto.createSign('SHA1');
    sign.update(md5Str);
    sign.end();
    return sign.sign(privateKeyPem, 'base64');
  } catch (err) {
    try {
      const rsaKeyPem = privateKeyPem.replace('PRIVATE KEY', 'RSA PRIVATE KEY');
      const sign = crypto.createSign('SHA1');
      sign.update(md5Str);
      sign.end();
      return sign.sign(rsaKeyPem, 'base64');
    } catch (err2) {
      logger.error('PalmPay RSA signing failed', { error: (err2 as Error).message });
      throw new Error('Failed to sign request - invalid private key format');
    }
  }
};

interface PalmpayVACreateRequest {
  virtualAccountName: string;
  customerName: string;
  identityType: 'personal' | 'personal_nin' | 'company';
  licenseNumber: string;
  email?: string;
  accountReference?: string;
}

interface PalmpayVAResponse {
  success: boolean;
  account?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    trackingReference: string;
  };
  error?: string;
}

export const verifyPalmpayCallbackSignature = (
  body: Record<string, any>,
  platformPublicKey: string
): boolean => {
  try {
    const { sign, ...params } = body;
    if (!sign) return false;

    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        filtered[key] = String(value).trim();
      }
    }

    const sortedKeys = Object.keys(filtered).sort();
    const strA = sortedKeys.map(k => `${k}=${filtered[k]}`).join('&');
    const md5Str = crypto.createHash('md5').update(strA, 'utf8').digest('hex').toUpperCase();

    const decodedSign = decodeURIComponent(sign);
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${platformPublicKey}\n-----END PUBLIC KEY-----`;
    const verifier = crypto.createVerify('SHA1');
    verifier.update(md5Str);
    verifier.end();
    return verifier.verify(publicKeyPem, decodedSign, 'base64');
  } catch (error) {
    logger.error('PalmPay signature verification failed', { error: (error as Error).message });
    return false;
  }
};

export const palmpayVirtualAccountService = {
  isConfigured(): boolean {
    const config = getPalmpayConfig();
    return !!(config.appId && config.privateKey);
  },

  async createVirtualAccount(data: PalmpayVACreateRequest): Promise<PalmpayVAResponse> {
    const config = getPalmpayConfig();

    if (!this.isConfigured()) {
      logger.warn('PalmPay VA not configured');
      return { success: false, error: 'PalmPay virtual account service not configured' };
    }

    try {
      const bodyParams: Record<string, any> = {
        requestTime: Date.now(),
        version: 'V2.0',
        nonceStr: generateNonceStr(),
        virtualAccountName: data.virtualAccountName,
        identityType: data.identityType,
        licenseNumber: data.licenseNumber,
        customerName: data.customerName,
      };

      if (data.email) bodyParams.email = data.email;
      if (data.accountReference) bodyParams.accountReference = data.accountReference;

      const signature = generateSignature(bodyParams, config.privateKey);

      const response = await axios.post(
        `${PALMPAY_PROD_BASE}/api/v2/virtual/account/label/create`,
        bodyParams,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.appId}`,
            'Signature': signature,
            'CountryCode': 'NG',
          },
          timeout: 30000,
        }
      );

      const respData = response.data;

      if (respData.status === true && respData.respCode === '00000000') {
        const account = respData.data;
        logger.info('PalmPay virtual account created', {
          accountNumber: account.virtualAccountNo,
          accountName: account.virtualAccountName,
          status: account.status,
        });

        return {
          success: true,
          account: {
            bankName: 'PalmPay',
            accountNumber: account.virtualAccountNo,
            accountName: account.virtualAccountName || data.customerName,
            trackingReference: account.accountReference || account.virtualAccountNo,
          },
        };
      }

      logger.warn('PalmPay VA creation failed', {
        respCode: respData.respCode,
        respMsg: respData.respMsg,
      });

      return {
        success: false,
        error: respData.respMsg || 'Failed to create PalmPay virtual account',
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.respMsg || error.message;
      logger.error('PalmPay VA creation error', {
        error: errMsg,
        status: error.response?.status,
        respCode: error.response?.data?.respCode,
      });

      return {
        success: false,
        error: `PalmPay virtual account creation failed: ${errMsg}`,
      };
    }
  },

  async queryVirtualAccount(virtualAccountNo: string): Promise<PalmpayVAResponse> {
    const config = getPalmpayConfig();

    if (!this.isConfigured()) {
      return { success: false, error: 'PalmPay VA not configured' };
    }

    try {
      const bodyParams: Record<string, any> = {
        requestTime: Date.now(),
        version: 'V2.0',
        nonceStr: generateNonceStr(),
        virtualAccountNo,
      };

      const signature = generateSignature(bodyParams, config.privateKey);

      const response = await axios.post(
        `${PALMPAY_PROD_BASE}/api/v2/virtual/account/label/query`,
        bodyParams,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.appId}`,
            'Signature': signature,
            'CountryCode': 'NG',
          },
          timeout: 30000,
        }
      );

      const respData = response.data;

      if (respData.status === true && respData.respCode === '00000000') {
        const account = respData.data;
        return {
          success: true,
          account: {
            bankName: 'PalmPay',
            accountNumber: account.virtualAccountNo,
            accountName: account.virtualAccountName,
            trackingReference: account.accountReference || account.virtualAccountNo,
          },
        };
      }

      return {
        success: false,
        error: respData.respMsg || 'Account query failed',
      };
    } catch (error: any) {
      logger.error('PalmPay VA query error', { error: error.message });
      return { success: false, error: 'Failed to query virtual account' };
    }
  },
};
