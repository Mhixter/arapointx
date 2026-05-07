import axios from 'axios';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';

const PAYVESSEL_KYC_BASE = 'https://api.payvessel.com/kyc/api/v1/merchant';

interface VerificationResult {
  success: boolean;
  data?: any;
  reference: string;
  error?: string;
}

function getConfig() {
  return {
    apiKey: process.env.PAYVESSEL_API_KEY || '',
    secretKey: process.env.PAYVESSEL_SECRET_KEY || '',
  };
}

function getHeaders(config: ReturnType<typeof getConfig>) {
  return {
    'api-key': config.apiKey,
    'api-secret': `Bearer ${config.secretKey}`,
    'Content-Type': 'application/json',
  };
}

function mapNINResponse(raw: any, nin: string): Record<string, any> {
  return {
    id: raw.nin || raw.NIN || nin,
    trackingId: raw.trackingId || raw.tracking_id || raw.centralID || '',
    firstName: raw.firstname || raw.firstName || raw.first_name || '',
    middleName: raw.middlename || raw.middleName || raw.middle_name || '',
    lastName: raw.lastname || raw.lastName || raw.last_name || raw.surname || '',
    dateOfBirth: raw.dob || raw.dateOfBirth || raw.date_of_birth || raw.birthdate || '',
    gender: raw.gender || '',
    phone: raw.phone || raw.telephoneno || raw.mobile || '',
    email: raw.email || '',
    address: raw.residence_address || raw.address || '',
    town: raw.residence_town || raw.town || '',
    lga: raw.residence_lga || raw.lga || '',
    state: raw.residence_state || raw.state || '',
    birthState: raw.birth_state || raw.birthState || raw.state_of_origin || '',
    birthLga: raw.birth_lga || raw.birthLga || '',
    birthCountry: raw.birthcountry || raw.birth_country || 'Nigeria',
    photo: raw.photo || raw.image || '',
    nationality: 'Nigeria',
    maritalStatus: raw.maritalstatus || raw.marital_status || '',
    height: raw.height || '',
    educationalLevel: raw.educationallevel || raw.educational_level || '',
    employmentStatus: raw.employmentstatus || raw.employment_status || '',
  };
}

function mapBVNResponse(raw: any, bvn: string): Record<string, any> {
  return {
    id: raw.bvn || raw.BVN || bvn,
    firstName: raw.firstname || raw.firstName || raw.first_name || '',
    middleName: raw.middlename || raw.middleName || raw.middle_name || '',
    lastName: raw.lastname || raw.lastName || raw.last_name || raw.surname || '',
    dateOfBirth: raw.dob || raw.dateOfBirth || raw.date_of_birth || '',
    phone: raw.phone || raw.mobile || raw.phoneNumber || raw.phoneNumber1 || '',
    email: raw.email || '',
    gender: raw.gender || '',
    enrollmentBranch: raw.enrollmentBranch || raw.enrollment_branch || '',
    enrollmentInstitution: raw.enrollmentBank || raw.enrollment_bank || raw.bankName || '',
    watchListed: raw.watch_listed === 'YES' || raw.watchListed === true,
    photo: raw.image || raw.photo || raw.base64Image || '',
    lgaOfOrigin: raw.lgaOfOrigin || raw.lga_of_origin || '',
    lgaOfResidence: raw.lgaOfResidence || raw.lga_of_residence || '',
    maritalStatus: raw.maritalStatus || raw.marital_status || '',
    stateOfOrigin: raw.stateOfOrigin || raw.state_of_origin || '',
    stateOfResidence: raw.stateOfResidence || raw.state_of_residence || '',
    registrationDate: raw.registrationDate || raw.registration_date || '',
  };
}

function isSuccessResponse(data: any): boolean {
  return data.status === true || data.status === 'success' || data.success === true;
}

function getErrorMessage(data: any, fallback: string): string {
  return data.message || data.detail || data.error || fallback;
}

class PayVesselIdentityService {
  isConfigured(): boolean {
    const { apiKey, secretKey } = getConfig();
    return !!(apiKey && secretKey);
  }

  private async post(path: string, body: Record<string, any>): Promise<any> {
    const config = getConfig();
    const response = await axios.post(
      `${PAYVESSEL_KYC_BASE}${path}`,
      body,
      { headers: getHeaders(config), timeout: 30000 },
    );
    return response.data;
  }

  async verifyNIN(nin: string, enhanced = false): Promise<VerificationResult> {
    const reference = generateReferenceId();
    if (!this.isConfigured()) return { success: false, error: 'PayVessel not configured', reference };

    const endpoint = enhanced ? '/nin/enhanced' : '/nin/basic';
    try {
      logger.info('PayVessel NIN verification started', { endpoint, nin: nin.substring(0, 4) + '***', reference });
      const data = await this.post(endpoint, { nin });

      if (isSuccessResponse(data)) {
        const raw = data.data || data.result || {};
        logger.info('PayVessel NIN verification successful', { endpoint, reference });
        return { success: true, data: mapNINResponse(raw, nin), reference };
      }
      const err = getErrorMessage(data, 'NIN verification failed');
      logger.warn('PayVessel NIN verification failed', { endpoint, error: err, reference });
      return { success: false, error: err, reference };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.detail || error.message || 'NIN verification failed';
      logger.error('PayVessel NIN verification error', { endpoint, reference, error: msg, status: error.response?.status });
      return { success: false, error: msg, reference };
    }
  }

  async verifyBVN(bvn: string, enhanced = false): Promise<VerificationResult> {
    const reference = generateReferenceId();
    if (!this.isConfigured()) return { success: false, error: 'PayVessel not configured', reference };

    const endpoint = enhanced ? '/bvn/enhanced' : '/bvn/basic';
    try {
      logger.info('PayVessel BVN verification started', { endpoint, bvn: bvn.substring(0, 4) + '***', reference });
      const data = await this.post(endpoint, { bvn });

      if (isSuccessResponse(data)) {
        const raw = data.data || data.result || {};
        logger.info('PayVessel BVN verification successful', { endpoint, reference });
        return { success: true, data: mapBVNResponse(raw, bvn), reference };
      }
      const err = getErrorMessage(data, 'BVN verification failed');
      logger.warn('PayVessel BVN verification failed', { endpoint, error: err, reference });
      return { success: false, error: err, reference };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.detail || error.message || 'BVN verification failed';
      logger.error('PayVessel BVN verification error', { endpoint, reference, error: msg, status: error.response?.status });
      return { success: false, error: msg, reference };
    }
  }

  async verifyDriversLicense(licenseNo: string, dob: string): Promise<VerificationResult> {
    const reference = generateReferenceId();
    if (!this.isConfigured()) return { success: false, error: 'PayVessel not configured', reference };

    try {
      logger.info('PayVessel DL verification started', { reference });
      const data = await this.post('/drivers-license', { licenseNo, dob });

      if (isSuccessResponse(data)) {
        const raw = data.data || data.result || {};
        return {
          success: true,
          data: {
            licenseNo: raw.licenseNo || raw.license_no || licenseNo,
            firstName: raw.firstname || raw.firstName || '',
            lastName: raw.lastname || raw.lastName || '',
            middleName: raw.middlename || raw.middleName || '',
            dateOfBirth: raw.dob || raw.dateOfBirth || dob,
            gender: raw.gender || '',
            stateOfIssue: raw.stateOfIssue || raw.state_of_issue || '',
            expiryDate: raw.expiryDate || raw.expiry_date || '',
            photo: raw.photo || raw.image || '',
          },
          reference,
        };
      }
      return { success: false, error: getErrorMessage(data, 'Driver\'s license verification failed'), reference };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Driver\'s license verification failed';
      logger.error('PayVessel DL verification error', { reference, error: msg });
      return { success: false, error: msg, reference };
    }
  }

  async verifyVotersCard(vin: string, lastName: string, state: string, dob: string): Promise<VerificationResult> {
    const reference = generateReferenceId();
    if (!this.isConfigured()) return { success: false, error: 'PayVessel not configured', reference };

    try {
      logger.info('PayVessel Voters Card verification started', { reference });
      const data = await this.post('/voters-card', { vin, lastName, state, dob });

      if (isSuccessResponse(data)) {
        const raw = data.data || data.result || {};
        return {
          success: true,
          data: {
            vin: raw.vin || raw.VIN || vin,
            firstName: raw.firstname || raw.firstName || '',
            lastName: raw.lastname || raw.lastName || lastName,
            middleName: raw.middlename || raw.middleName || '',
            dateOfBirth: raw.dob || raw.dateOfBirth || dob,
            gender: raw.gender || '',
            state: raw.state || state,
            lga: raw.lga || '',
            ward: raw.ward || '',
            pollingUnit: raw.pollingUnit || raw.polling_unit || '',
          },
          reference,
        };
      }
      return { success: false, error: getErrorMessage(data, 'Voter\'s card verification failed'), reference };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Voter\'s card verification failed';
      logger.error('PayVessel Voters Card verification error', { reference, error: msg });
      return { success: false, error: msg, reference };
    }
  }

  async verifyPassport(passportNo: string, dob: string, surname: string): Promise<VerificationResult> {
    const reference = generateReferenceId();
    if (!this.isConfigured()) return { success: false, error: 'PayVessel not configured', reference };

    try {
      logger.info('PayVessel Passport verification started', { reference });
      const data = await this.post('/passport', { passportNo, dob, surname });

      if (isSuccessResponse(data)) {
        const raw = data.data || data.result || {};
        return {
          success: true,
          data: {
            passportNo: raw.passportNo || raw.passport_no || passportNo,
            firstName: raw.firstname || raw.firstName || '',
            lastName: raw.lastname || raw.lastName || surname,
            middleName: raw.middlename || raw.middleName || '',
            dateOfBirth: raw.dob || raw.dateOfBirth || dob,
            gender: raw.gender || '',
            issuedDate: raw.issuedDate || raw.issued_date || '',
            expiryDate: raw.expiryDate || raw.expiry_date || '',
            photo: raw.photo || raw.image || '',
          },
          reference,
        };
      }
      return { success: false, error: getErrorMessage(data, 'Passport verification failed'), reference };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Passport verification failed';
      logger.error('PayVessel Passport verification error', { reference, error: msg });
      return { success: false, error: msg, reference };
    }
  }
}

export const payVesselIdentityService = new PayVesselIdentityService();
