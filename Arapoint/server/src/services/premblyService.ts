import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';

const PREMBLY_BASE_URL = 'https://api.prembly.com/identitypass/verification';

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
    const appId = process.env.PREMBLY_PUBLIC || process.env.PREMBLY_APP_ID;

    if (!apiKey || !appId) {
      throw new Error('PREMBLY_API_KEY and PREMBLY_PUBLIC (App ID) are not configured');
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

      const response = await this.getClient().post('/nin', {
        number_nin: nin,
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
        const rawError = response.data.detail || response.data.message || 'NIN verification failed';
        const errorMsg = this.normalizeErrorMessage(rawError, response.data.response_code);
        logger.warn('Prembly NIN verification failed', { error: errorMsg, reference, responseCode: response.data.response_code });
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
      
      const rawError = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'NIN verification failed';
      const errorMsg = this.normalizeErrorMessage(rawError, error.response?.data?.response_code);
      
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
        ? '/bvn_w_face'
        : '/bvn';

      const response = await this.getClient().post(endpoint, {
        number: bvn,
        number_bvn: bvn,
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
        const rawError = response.data.detail || response.data.message || 'BVN verification failed';
        const errorMsg = this.normalizeErrorMessage(rawError, response.data.response_code);
        logger.warn('Prembly BVN verification failed', { error: errorMsg, reference, responseCode: response.data.response_code });
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
      
      const rawError = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'BVN verification failed';
      const errorMsg = this.normalizeErrorMessage(rawError, error.response?.data?.response_code);
      
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

      const response = await this.getClient().post('/vnin', requestBody);

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
        const rawError = response.data.detail || response.data.message || 'vNIN verification failed';
        const errorMsg = this.normalizeErrorMessage(rawError, response.data.response_code);
        logger.warn('Prembly vNIN verification failed', { error: errorMsg, reference, responseCode: response.data.response_code });
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
      
      const rawError = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'vNIN verification failed';
      const errorMsg = this.normalizeErrorMessage(rawError, error.response?.data?.response_code);
      
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

      const response = await this.getClient().post('/nin_phone', {
        number: nin,
        phone: phone,
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
        const rawError = response.data.detail || response.data.message || 'NIN+Phone verification failed';
        const errorMsg = this.normalizeErrorMessage(rawError, response.data.response_code);
        logger.warn('Prembly NIN+Phone verification failed', { error: errorMsg, reference, responseCode: response.data.response_code });
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
      
      const rawError = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'NIN+Phone verification failed';
      const errorMsg = this.normalizeErrorMessage(rawError, error.response?.data?.response_code);
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.response_code,
      };
    }
  }

  private normalizeErrorMessage(rawError: string, responseCode?: string): string {
    const lowerError = rawError.toLowerCase();
    
    if (
      lowerError.includes('no record') ||
      lowerError.includes('not found') ||
      lowerError.includes('does not exist') ||
      lowerError.includes('no result') ||
      lowerError.includes('no data') ||
      lowerError.includes('record not') ||
      responseCode === '01' ||
      responseCode === '02'
    ) {
      return 'No record found for the provided ID number. Please double-check and try again.';
    }

    if (
      lowerError.includes('invalid nin') ||
      lowerError.includes('invalid bvn') ||
      lowerError.includes('invalid vnin') ||
      lowerError.includes('invalid number') ||
      lowerError.includes('invalid id')
    ) {
      return 'The ID number provided is invalid. Please check the format and try again.';
    }
    
    if (lowerError.includes('invalid') || lowerError.includes('wrong format') || lowerError.includes('bad request')) {
      return 'Invalid format. Please check the input and try again.';
    }

    if (lowerError.includes('insufficient') || lowerError.includes('credit') || lowerError.includes('balance')) {
      return 'Verification service temporarily unavailable. Please try again later.';
    }

    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      return 'Verification request timed out. Please try again.';
    }
    
    return rawError;
  }

  async retrieveNINByPhone(phone: string): Promise<VerificationResult> {
    const reference = generateReferenceId();
    
    try {
      logger.info('Prembly phone-to-NIN retrieval started', { phone: phone.substring(0, 4) + '***', reference });

      const response = await this.getClient().post('/phone_number', {
        number: phone,
      });

      logger.info('Prembly phone-to-NIN raw response keys', { 
        reference,
        topKeys: Object.keys(response.data || {}),
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        hasNinNested: !!response.data?.data?.nin,
        ninType: typeof response.data?.data?.nin,
        ninNestedKeys: response.data?.data?.nin && typeof response.data.data.nin === 'object' ? Object.keys(response.data.data.nin) : [],
      });

      if (response.data.status === true && response.data.response_code === '00') {
        const outerData = response.data.data || {};
        const ninNested = (outerData.nin && typeof outerData.nin === 'object') ? outerData.nin : null;
        const rawData = ninNested || outerData;
        
        const ninNumber = ninNested?.nin || ninNested?.centralID || outerData.nin_number || outerData.nin || '';
        
        const ninData: NINData = {
          id: typeof ninNumber === 'string' ? ninNumber : (rawData.centralID || ''),
          firstName: rawData.firstname || outerData.firstName || outerData.firstname || '',
          middleName: rawData.middlename || outerData.middleName || outerData.middlename || '',
          lastName: rawData.surname || outerData.lastName || outerData.lastname || outerData.surname || '',
          dateOfBirth: rawData.birthdate || outerData.dateOfBirth || outerData.date_of_birth || '',
          gender: rawData.gender || outerData.gender || '',
          phone: rawData.telephoneno || outerData.phoneNumber || outerData.phone || rawData.phone || phone,
          email: rawData.email || outerData.email || '',
          address: rawData.residence_address || outerData.residenceAddress || outerData.address || '',
          town: rawData.residence_town || outerData.town || '',
          lga: rawData.residence_lga || outerData.lgaOfResidence || rawData.self_origin_lga || '',
          state: rawData.residence_state || outerData.stateOfResidence || rawData.self_origin_state || '',
          birthState: rawData.birthstate || rawData.birth_state || outerData.stateOfOrigin || '',
          birthLga: rawData.birthlga || rawData.birth_lga || outerData.lgaOfOrigin || '',
          birthCountry: rawData.birthcountry || rawData.birth_country || 'Nigeria',
          photo: rawData.photo || outerData.photo || outerData.base64Image || '',
          nationality: rawData.birthcountry || 'Nigeria',
          maritalStatus: rawData.maritalstatus || outerData.maritalStatus || '',
          height: rawData.heigth || rawData.height || '',
          educationalLevel: rawData.educationallevel || outerData.educationalLevel || '',
          employmentStatus: rawData.employmentstatus || outerData.employmentStatus || '',
        };

        logger.info('Prembly phone-to-NIN mapped data', { 
          reference,
          hasNin: !!ninData.id,
          hasPhoto: !!ninData.photo,
          hasDob: !!ninData.dateOfBirth,
          dobValue: ninData.dateOfBirth,
          hasAddress: !!ninData.address,
          hasGender: !!ninData.gender,
        });

        return { success: true, data: ninData, reference };
      } else {
        const rawError = response.data.detail || response.data.message || 'Phone number lookup failed';
        const errorMsg = this.normalizeErrorMessage(rawError, response.data.response_code);
        logger.warn('Prembly phone-to-NIN retrieval failed', { error: errorMsg, reference, responseCode: response.data.response_code });
        return { 
          success: false, 
          error: errorMsg, 
          reference,
          errorCode: response.data.response_code,
        };
      }
    } catch (error: any) {
      logger.error('Prembly phone-to-NIN retrieval error', { 
        error: error.message, 
        reference,
        responseData: error.response?.data,
      });
      
      const rawError = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'Phone number lookup failed';
      const errorMsg = this.normalizeErrorMessage(rawError, error.response?.data?.response_code);
      
      return { 
        success: false, 
        error: errorMsg, 
        reference,
        errorCode: error.response?.data?.response_code,
      };
    }
  }

  isConfigured(): boolean {
    return !!(process.env.PREMBLY_API_KEY && (process.env.PREMBLY_PUBLIC || process.env.PREMBLY_APP_ID));
  }
}

export const premblyService = new PremblyService();
