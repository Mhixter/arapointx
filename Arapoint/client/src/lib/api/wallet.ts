import { apiClient, ApiResponse } from './client';

export interface WalletBalance {
  balance: string;
  currency: string;
}

export interface Transaction {
  id: string;
  transactionType: string;
  amount: string;
  paymentMethod: string;
  referenceId: string;
  status: string;
  createdAt: string;
}

export interface FundWalletRequest {
  amount: number;
  email?: string;
}

export interface PaystackInitResponse {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
}

export interface PalmPayInitResponse {
  success: boolean;
  data?: {
    reference: string;
    paymentUrl: string;
    amount: number;
  };
  error?: string;
}

export interface PaymentGatewaysResponse {
  gateways: string[];
  paystackConfigured: boolean;
  palmpayConfigured: boolean;
}

export interface VerifyPaymentResponse {
  success: boolean;
  amount: number;
  reference: string;
  email?: string;
  message?: string;
}

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  providerSlug?: string;
}

export interface VirtualAccountResponse {
  configured: boolean;
  account?: VirtualAccount;
  requiresKyc?: boolean;
}

export interface VirtualAccountStatusResponse {
  gatewayConfigured: boolean;
}

export const walletApi = {
  getBalance: async (): Promise<WalletBalance> => {
    const response = await apiClient.get<ApiResponse<WalletBalance>>('/wallet/balance');
    return response.data.data;
  },

  getTransactions: async (page = 1, limit = 20): Promise<{ transactions: Transaction[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ transactions: Transaction[]; pagination: any }>>('/wallet/transactions', {
      params: { page, limit },
    });
    return response.data.data;
  },

  getPaymentGateways: async (): Promise<PaymentGatewaysResponse> => {
    const response = await apiClient.get<ApiResponse<PaymentGatewaysResponse>>('/payment/gateways');
    return response.data.data;
  },

  initializePaystack: async (data: FundWalletRequest): Promise<PaystackInitResponse> => {
    const response = await apiClient.post<ApiResponse<PaystackInitResponse>>('/payment/paystack/init', data);
    return response.data.data;
  },

  initializePalmpay: async (data: FundWalletRequest): Promise<PalmPayInitResponse> => {
    const response = await apiClient.post<ApiResponse<PalmPayInitResponse>>('/payment/palmpay/init', data);
    return response.data.data;
  },

  verifyPaystack: async (reference: string): Promise<VerifyPaymentResponse> => {
    const response = await apiClient.post<ApiResponse<VerifyPaymentResponse>>('/payment/paystack/verify', { reference });
    return response.data.data;
  },

  verifyPalmpay: async (reference: string): Promise<VerifyPaymentResponse> => {
    const response = await apiClient.post<ApiResponse<VerifyPaymentResponse>>('/payment/palmpay/verify', { reference });
    return response.data.data;
  },

  getVirtualAccount: async (): Promise<VirtualAccountResponse> => {
    const response = await apiClient.get<ApiResponse<VirtualAccountResponse>>('/wallet/virtual-account');
    return response.data.data;
  },

  generateVirtualAccount: async (): Promise<{ account: VirtualAccount }> => {
    const response = await apiClient.post<ApiResponse<{ account: VirtualAccount }>>('/wallet/virtual-account/generate');
    return response.data.data;
  },

  getVirtualAccountStatus: async (): Promise<VirtualAccountStatusResponse> => {
    const response = await apiClient.get<ApiResponse<VirtualAccountStatusResponse>>('/wallet/virtual-account/status');
    return response.data.data;
  },
};
