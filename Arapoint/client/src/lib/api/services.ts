import { apiClient, ApiResponse } from './client';

export interface BVNRetrievalRequest {
  phone: string;
  dateOfBirth: string;
}

export interface BVNCardRequest {
  bvn: string;
  fullName: string;
}

export interface NINLookupRequest {
  nin: string;
}

export interface NINPhoneRequest {
  phone: string;
}

export interface EducationCheckRequest {
  registrationNumber: string;
  examYear: number;
  examType?: string;
  cardSerialNumber?: string;
  cardPin?: string;
}

export interface WAECCheckRequest {
  registrationNumber: string;
  examYear: number;
  examType?: 'WASSCE' | 'GCE';
  cardSerialNumber?: string;
  cardPin?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultData?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AirtimeRequest {
  network: string;
  phoneNumber: string;
  amount: number;
}

export interface DataRequest {
  network: string;
  phoneNumber: string;
  planCode: string;
  amount: number;
}

export interface ElectricityRequest {
  disco: string;
  meterNumber: string;
  meterType: 'prepaid' | 'postpaid';
  amount: number;
}

export interface CableRequest {
  provider: string;
  smartcardNumber: string;
  packageCode: string;
  amount: number;
}

export interface ServiceResponse {
  id: string;
  status: string;
  message: string;
  data?: any;
  reference?: string;
}

export const servicesApi = {
  bvn: {
    retrieve: async (data: BVNRetrievalRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/bvn/retrieve', data);
      return response.data.data;
    },
    requestCard: async (data: BVNCardRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/bvn/card', data);
      return response.data.data;
    },
    getHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ services: any[] }>>('/bvn/history');
      return response.data.data.services;
    },
  },

  identity: {
    lookupNIN: async (data: NINLookupRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/identity/nin-lookup', data);
      return response.data.data;
    },
    lookupByPhone: async (data: NINPhoneRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/identity/nin-phone', data);
      return response.data.data;
    },
    getHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ verifications: any[] }>>('/identity/history');
      return response.data.data.verifications;
    },
  },

  education: {
    checkJAMB: async (data: { registrationNumber: string; examYear?: number }): Promise<{ jobId: string; price: number }> => {
      const response = await apiClient.post<ApiResponse<{ jobId: string; price: number }>>('/education/jamb', data);
      return response.data.data;
    },
    checkWAEC: async (data: WAECCheckRequest): Promise<{ jobId: string; price: number }> => {
      const response = await apiClient.post<ApiResponse<{ jobId: string; price: number }>>('/education/waec', data);
      return response.data.data;
    },
    checkNECO: async (data: { registrationNumber: string; examYear?: number; examType?: string; cardPin?: string }): Promise<{ jobId: string; price: number }> => {
      const response = await apiClient.post<ApiResponse<{ jobId: string; price: number }>>('/education/neco', data);
      return response.data.data;
    },
    checkNABTEB: async (data: { registrationNumber: string; examYear?: number; examType?: string; cardSerialNumber?: string; cardPin?: string }): Promise<{ jobId: string; price: number }> => {
      const response = await apiClient.post<ApiResponse<{ jobId: string; price: number }>>('/education/nabteb', data);
      return response.data.data;
    },
    checkNBAIS: async (data: { registrationNumber: string; examYear?: number; state?: string; schoolName?: string; examMonth?: string; cardPin?: string }): Promise<{ jobId: string; price: number }> => {
      const response = await apiClient.post<ApiResponse<{ jobId: string; price: number }>>('/education/nbais', data);
      return response.data.data;
    },
    getJobStatus: async (jobId: string): Promise<JobStatusResponse> => {
      const response = await apiClient.get<ApiResponse<JobStatusResponse>>(`/education/job/${jobId}`);
      return response.data.data;
    },
    getHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ history: any[] }>>('/education/history');
      return response.data.data.history;
    },
    submitRequest: async (serviceId: string, formData: any): Promise<any> => {
      const response = await apiClient.post<ApiResponse<any>>('/education/request', { serviceId, formData });
      return response.data.data;
    },
  },

  jamb: {
    submitRequest: async (serviceId: string, formData: any): Promise<any> => {
      const response = await apiClient.post<ApiResponse<any>>('/education/jamb-request', { serviceId, formData });
      return response.data.data;
    },
    getRequests: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ requests: any[] }>>('/education/jamb-requests');
      return response.data.data.requests;
    },
    uploadDocument: async (requestId: string, fileName: string, fileType: string): Promise<any> => {
      const response = await apiClient.post<ApiResponse<any>>(`/education/jamb-request/${requestId}/upload`, { fileName, fileType });
      return response.data.data;
    },
    getDocuments: async (requestId: string): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ documents: any[] }>>(`/education/jamb-requests/${requestId}/documents`);
      return response.data.data.documents;
    },
  },

  vtu: {
    buyAirtime: async (data: AirtimeRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/airtime/buy', data);
      return response.data.data;
    },
    buyData: async (data: DataRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/data/purchase', data);
      return response.data.data;
    },
    getDataPlans: async (network: string): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ plans: any[] }>>(`/data/plans/${network}`);
      return response.data.data.plans;
    },
    getAirtimeHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ services: any[] }>>('/airtime/history');
      return response.data.data.services;
    },
    getDataHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ services: any[] }>>('/data/history');
      return response.data.data.services;
    },
  },

  utilities: {
    buyElectricity: async (data: ElectricityRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/electricity/purchase', data);
      return response.data.data;
    },
    validateMeter: async (disco: string, meterNumber: string, meterType: string): Promise<any> => {
      const response = await apiClient.post<ApiResponse<any>>('/electricity/validate', { disco, meterNumber, meterType });
      return response.data.data;
    },
    buyCable: async (data: CableRequest): Promise<ServiceResponse> => {
      const response = await apiClient.post<ApiResponse<ServiceResponse>>('/cable/purchase', data);
      return response.data.data;
    },
    validateSmartcard: async (provider: string, smartcardNumber: string): Promise<any> => {
      const response = await apiClient.post<ApiResponse<any>>('/cable/validate', { provider, smartcardNumber });
      return response.data.data;
    },
    getElectricityHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ services: any[] }>>('/electricity/history');
      return response.data.data.services;
    },
    getCableHistory: async (): Promise<any[]> => {
      const response = await apiClient.get<ApiResponse<{ services: any[] }>>('/cable/history');
      return response.data.data.services;
    },
  },

  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      return response.data.data;
    },
  },
};

export interface DashboardStats {
  user: {
    name: string;
    email: string;
    walletBalance: number;
  };
  stats: {
    totalTransactions: number;
    totalVerifications: number;
    ninVerifications: number;
    bvnVerifications: number;
    educationVerifications: number;
    airtimeTotal: number;
    airtimeSuccess: number;
    dataTotal: number;
    dataSuccess: number;
    electricityTotal: number;
    electricitySuccess: number;
    cableTotal: number;
    cableSuccess: number;
  };
}
