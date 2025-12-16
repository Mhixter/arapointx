import { apiClient, ApiResponse } from './client';

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingJobs: number;
  completedJobs: number;
  bvnServices: number;
  educationServices: number;
  vtuServices: number;
  chartData?: Array<{ name: string; services: number }>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  walletBalance: string;
  kycStatus: string;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  userId: string;
  transactionType: string;
  amount: string;
  paymentMethod: string;
  referenceId: string;
  status: string;
  createdAt: string;
}

export interface BVNServiceRecord {
  id: string;
  userId: string;
  bvn: string;
  phone: string;
  serviceType: string;
  requestId: string;
  status: string;
  responseData: any;
  createdAt: string;
  user?: { name: string; email: string };
}

export interface EducationServiceRecord {
  id: string;
  userId: string;
  serviceType: string;
  examYear: number;
  registrationNumber: string;
  status: string;
  resultData: any;
  createdAt: string;
  user?: { name: string; email: string };
}

export interface VTUServiceRecord {
  id: string;
  userId: string;
  serviceType: string;
  provider: string;
  amount: string;
  status: string;
  reference: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export interface ServicePricing {
  id: string;
  serviceType: string;
  serviceName: string;
  price: string;
  description: string;
  isActive: boolean;
}

export interface RpaJob {
  id: string;
  userId: string;
  serviceType: string;
  queryData: any;
  status: string;
  result: any;
  errorMessage: string;
  retryCount: number;
  createdAt: string;
  completedAt: string;
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get<ApiResponse<AdminStats>>('/admin/stats');
    return response.data.data;
  },

  getUsers: async (page = 1, limit = 20): Promise<{ users: AdminUser[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ users: AdminUser[]; pagination: any }>>('/admin/users', {
      params: { page, limit },
    });
    return response.data.data;
  },

  getUser: async (id: string): Promise<{ user: AdminUser; recentTransactions: AdminTransaction[] }> => {
    const response = await apiClient.get<ApiResponse<{ user: AdminUser; recentTransactions: AdminTransaction[] }>>(`/admin/users/${id}`);
    return response.data.data;
  },

  updateUserStatus: async (id: string, kycStatus: string): Promise<void> => {
    await apiClient.put(`/admin/users/${id}/status`, { kycStatus });
  },

  createUser: async (data: { name: string; email: string; phone?: string; password: string }): Promise<{ user: AdminUser }> => {
    const response = await apiClient.post<ApiResponse<{ user: AdminUser }>>('/admin/users', data);
    return response.data.data;
  },

  updateUser: async (id: string, data: { name?: string; email?: string; phone?: string }): Promise<{ user: AdminUser }> => {
    const response = await apiClient.put<ApiResponse<{ user: AdminUser }>>(`/admin/users/${id}`, data);
    return response.data.data;
  },

  fundUserWallet: async (id: string, amount: number, description?: string): Promise<{ userId: string; amount: number; newBalance: number; reference: string }> => {
    const response = await apiClient.post<ApiResponse<{ userId: string; amount: number; newBalance: number; reference: string }>>(`/admin/users/${id}/fund`, { amount, description });
    return response.data.data;
  },

  debitUserWallet: async (id: string, amount: number, description?: string): Promise<{ userId: string; amount: number; newBalance: number; reference: string }> => {
    const response = await apiClient.post<ApiResponse<{ userId: string; amount: number; newBalance: number; reference: string }>>(`/admin/users/${id}/debit`, { amount, description });
    return response.data.data;
  },

  getTransactions: async (page = 1, limit = 20): Promise<{ transactions: AdminTransaction[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ transactions: AdminTransaction[]; pagination: any }>>('/admin/transactions', {
      params: { page, limit },
    });
    return response.data.data;
  },

  getBVNServices: async (page = 1, limit = 20): Promise<{ services: BVNServiceRecord[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ services: BVNServiceRecord[]; pagination: any }>>('/admin/bvn-services', {
      params: { page, limit },
    });
    return response.data.data;
  },

  getEducationServices: async (page = 1, limit = 20): Promise<{ services: EducationServiceRecord[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ services: EducationServiceRecord[]; pagination: any }>>('/admin/education-services', {
      params: { page, limit },
    });
    return response.data.data;
  },

  getVTUServices: async (page = 1, limit = 20): Promise<{ services: VTUServiceRecord[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ services: VTUServiceRecord[]; pagination: any }>>('/admin/vtu-services', {
      params: { page, limit },
    });
    return response.data.data;
  },

  getPricing: async (): Promise<ServicePricing[]> => {
    const response = await apiClient.get<ApiResponse<{ pricing: ServicePricing[] }>>('/admin/pricing');
    return response.data.data.pricing;
  },

  updatePricing: async (id: string, data: Partial<ServicePricing>): Promise<void> => {
    await apiClient.put(`/admin/pricing/${id}`, data);
  },

  getRpaJobs: async (page = 1, limit = 20, status?: string): Promise<{ jobs: RpaJob[]; pagination: any }> => {
    const response = await apiClient.get<ApiResponse<{ jobs: RpaJob[]; pagination: any }>>('/admin/rpa/jobs', {
      params: { page, limit, status },
    });
    return response.data.data;
  },

  retryRpaJob: async (jobId: string): Promise<void> => {
    await apiClient.post(`/admin/rpa/retry/${jobId}`);
  },
};
