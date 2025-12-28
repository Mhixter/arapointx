import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';

const PREMBLY_BASE_URL = 'https://api.myidentitypay.com/api/v2';

interface PremblyConfig {
  apiKey: string;
  appId: string;
}

interface VerificationResult {
  success: boolean;
  data?: NINData | BVNData;
  reference: string;
  error?: string;
  errorCode?: string;
}

export interface NINData {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  town: string;
  lga: string;
  state: string;
  birthState: string;
  birthLga: string;
  birthCountry: string;
  photo: string;
  nationality?: string;
  maritalStatus?: string;
  height?: string;
  educationalLevel?: string;
  employmentStatus?: string;
}

export interface BVNData {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  gender: string;
  enrollmentBranch: string;
  enrollmentInstitution: string;
  watchListed: boolean;
  photo: string;
  lgaOfOrigin?: string;
  lgaOfResidence?: string;
  maritalStatus?: string;
  stateOfOrigin?: string;
  stateOfResidence?: string;
  registrationDate?: string;
}

class PremblyService {
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance {
    const apiKey = process.env.PREMBLY_API_KEY;
    const appId = process.env.PREMBLY_APP_ID;

    if (!apiKey || !appId) {
      throw new Error('PREMBLY_API_KEY and PREMBLY_APP_ID are not configured');
    }

    if (!this.client) {
      this.client = axios.create({
        baseURL: PREMBLY_BASE_URL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'app-id': appId,
        },
      });
    }

    return this.client;
  }

  async verifyNIN(nin: string): Promise<VerificationResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('Prembly NIN verification started', { nin: nin.substring(0, 4) + '***', reference });

      const response = await this.getClient().post('/biometrics/merchant/data/verification/nin', {
        number: nin,
        is_subject_consent: true,
      });

      if (response.data.status === true && response.data.response_code === '00') {
        const rawData = response.data.data;
        
        const ninData: NINData = {
          id: rawData.nin || rawData.centralID || nin,
          firstName: rawData.firstname || rawData.firstName || '',
          middleName: rawData.middlename || rawData.middleName || '',
          lastName: rawData.surname || rawData.lastName || '',
          dateOfBirth: rawData.birthdate || rawData.dateOfBirth || '',
          gender: rawData.gender || '',
          phone: rawData.telephoneno || rawData.phone || '',
          email: rawData.email || '',
          address: rawData.residence_address || rawData.residenceAddress || '',
          town: rawData.residence_town || rawData.town || rawData.residence_lga || '',
          lga: rawData.residence_lga || rawData.lgaOfResidence || '',
          state: rawData.residence_state || rawData.stateOfResidence || '',
          birthState: rawData.birth_state || rawData.birthState || rawData.state_of_origin || rawData.stateOfOrigin || '',
          birthLga: rawData.birth_lga || rawData.birthLga || rawData.lga_of_origin || rawData.lgaOfOrigin || '',
          birthCountry: rawData.birthcountry || rawData.birth_country || 'Nigeria',
          photo: rawData.photo || '',
          nationality: rawData.birthcountry || 'Nigeria',
          maritalStatus: rawData.maritalstatus || rawData.marital_status || '',
          height: rawData.height || '',
          educationalLevel: rawData.educationallevel || rawData.educational_level || '',
          employmentStatus: rawData.employmentstatus || rawData.employment_status || '',
        };

        logger.info('Prembly NIN verification successful', { reference });
        return { success: true, data: ninData, reference };
      } else {
        const errorMsg = response.data.detail || response.data.message || 'NIN verification failed';
        logger.warn('Prembly NIN verification failed', { error: errorMsg, reference });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.response_code,
        };
      }
    } catch (error: any) {
      logger.error('Prembly NIN verification error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'NIN verification failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.response_code,
      };
    }
  }

  async verifyBVN(bvn: string, premium: boolean = false): Promise<VerificationResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('Prembly BVN verification started', { bvn: bvn.substring(0, 4) + '***', reference, premium });

      const endpoint = premium 
        ? '/biometrics/merchant/data/verification/bvn_w_face'
        : '/biometrics/merchant/data/verification/bvn';

      const response = await this.getClient().post(endpoint, {
        number: bvn,
        is_subject_consent: true,
      });

      if (response.data.status === true && response.data.response_code === '00') {
        const rawData = response.data.data;
        
        const bvnData: BVNData = {
          id: rawData.bvn || bvn,
          firstName: rawData.firstName || rawData.first_name || '',
          middleName: rawData.middleName || rawData.middle_name || '',
          lastName: rawData.lastName || rawData.last_name || '',
          dateOfBirth: rawData.dateOfBirth || rawData.date_of_birth || '',
          phone: rawData.mobile || rawData.phone || rawData.phoneNumber1 || '',
          email: rawData.email || '',
          gender: rawData.gender || '',
          enrollmentBranch: rawData.enrollmentBranch || rawData.enrollment_branch || '',
          enrollmentInstitution: rawData.enrollmentBank || rawData.enrollment_bank || '',
          watchListed: rawData.watch_listed === 'YES' || rawData.watchListed === true,
          photo: rawData.image || rawData.photo || rawData.base64Image || '',
          lgaOfOrigin: rawData.lgaOfOrigin || rawData.lga_of_origin || '',
          lgaOfResidence: rawData.lgaOfResidence || rawData.lga_of_residence || '',
          maritalStatus: rawData.maritalStatus || rawData.marital_status || '',
          stateOfOrigin: rawData.stateOfOrigin || rawData.state_of_origin || '',
          stateOfResidence: rawData.stateOfResidence || rawData.state_of_residence || '',
          registrationDate: rawData.registrationDate || rawData.registration_date || '',
        };

        logger.info('Prembly BVN verification successful', { reference });
        return { success: true, data: bvnData, reference };
      } else {
        const errorMsg = response.data.detail || response.data.message || 'BVN verification failed';
        logger.warn('Prembly BVN verification failed', { error: errorMsg, reference });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.response_code,
        };
      }
    } catch (error: any) {
      logger.error('Prembly BVN verification error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'BVN verification failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.response_code,
      };
    }
  }

  async verifyVNIN(vnin: string, validationData?: { firstName?: string; lastName?: string; dateOfBirth?: string }): Promise<VerificationResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('Prembly vNIN verification started', { reference });

      const requestBody: any = {
        vnin: vnin,
        is_subject_consent: true,
      };

      if (validationData?.firstName) requestBody.firstname = validationData.firstName;
      if (validationData?.lastName) requestBody.lastname = validationData.lastName;
      if (validationData?.dateOfBirth) requestBody.dob = validationData.dateOfBirth;

      const response = await this.getClient().post('/biometrics/merchant/data/verification/vnin', requestBody);

      if (response.data.status === true && response.data.response_code === '00') {
        const rawData = response.data.data;
        
        const ninData: NINData = {
          id: rawData.nin || rawData.centralID || '',
          firstName: rawData.firstname || rawData.firstName || '',
          middleName: rawData.middlename || rawData.middleName || '',
          lastName: rawData.surname || rawData.lastName || '',
          dateOfBirth: rawData.birthdate || rawData.dateOfBirth || '',
          gender: rawData.gender || '',
          phone: rawData.telephoneno || rawData.phone || '',
          email: rawData.email || '',
          address: rawData.residence_address || rawData.residenceAddress || '',
          town: rawData.residence_town || rawData.town || rawData.residence_lga || '',
          lga: rawData.residence_lga || rawData.lgaOfResidence || '',
          state: rawData.residence_state || rawData.stateOfResidence || '',
          birthState: rawData.birth_state || rawData.birthState || rawData.state_of_origin || '',
          birthLga: rawData.birth_lga || rawData.birthLga || rawData.lga_of_origin || '',
          birthCountry: rawData.birthcountry || rawData.birth_country || 'Nigeria',
          photo: rawData.photo || '',
          nationality: rawData.birthcountry || 'Nigeria',
          maritalStatus: rawData.maritalstatus || '',
        };

        logger.info('Prembly vNIN verification successful', { reference });
        return { success: true, data: ninData, reference };
      } else {
        const errorMsg = response.data.detail || response.data.message || 'vNIN verification failed';
        logger.warn('Prembly vNIN verification failed', { error: errorMsg, reference });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.response_code,
        };
      }
    } catch (error: any) {
      logger.error('Prembly vNIN verification error', { 
        error: error.message, 
        reference,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'vNIN verification failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.response_code,
      };
    }
  }

  async verifyNINWithPhone(nin: string, phone: string): Promise<VerificationResult & { phoneMatch?: boolean }> {
    const reference = generateReferenceId();
    
    try {
      logger.info('Prembly NIN+Phone verification started', { nin: nin.substring(0, 4) + '***', reference });

      const response = await this.getClient().post('/biometrics/merchant/data/verification/nin_phone', {
        number: nin,
        phone: phone,
        is_subject_consent: true,
      });

      if (response.data.status === true && response.data.response_code === '00') {
        const rawData = response.data.data;
        
        const ninData: NINData = {
          id: rawData.nin || rawData.centralID || nin,
          firstName: rawData.firstname || rawData.firstName || '',
          middleName: rawData.middlename || rawData.middleName || '',
          lastName: rawData.surname || rawData.lastName || '',
          dateOfBirth: rawData.birthdate || rawData.dateOfBirth || '',
          gender: rawData.gender || '',
          phone: rawData.telephoneno || rawData.phone || '',
          email: rawData.email || '',
          address: rawData.residence_address || rawData.residenceAddress || '',
          town: rawData.residence_town || rawData.town || rawData.residence_lga || '',
          lga: rawData.residence_lga || rawData.lgaOfResidence || '',
          state: rawData.residence_state || rawData.stateOfResidence || '',
          birthState: rawData.birth_state || rawData.birthState || rawData.state_of_origin || '',
          birthLga: rawData.birth_lga || rawData.birthLga || rawData.lga_of_origin || '',
          birthCountry: rawData.birthcountry || rawData.birth_country || 'Nigeria',
          photo: rawData.photo || '',
          nationality: rawData.birthcountry || 'Nigeria',
        };

        const phoneMatch = rawData.phone_match === true || 
                          rawData.phoneMatch === true ||
                          ninData.phone.includes(phone.replace(/\D/g, ''));

        logger.info('Prembly NIN+Phone verification successful', { reference, phoneMatch });
        return { success: true, data: ninData, reference, phoneMatch };
      } else {
        const errorMsg = response.data.detail || response.data.message || 'NIN+Phone verification failed';
        logger.warn('Prembly NIN+Phone verification failed', { error: errorMsg, reference });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.response_code,
        };
      }
    } catch (error: any) {
      logger.error('Prembly NIN+Phone verification error', { 
        error: error.message, 
        reference,
      });
      
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'NIN+Phone verification failed';
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.response_code,
      };
    }
  }

  isConfigured(): boolean {
    return !!(process.env.PREMBLY_API_KEY && process.env.PREMBLY_APP_ID);
  }
}

export const premblyService = new PremblyService();
