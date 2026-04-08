export const getSiteUrl = (): string => {
  return (process.env.SITE_URL || 'https://arapoint.com.ng').replace(/\/$/, '');
};

export const generateJobId = (): string => {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateReferenceId = (): string => {
  return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateEstimatedWaitTime = (queueLength: number): string => {
  // Estimate ~2-5 seconds per query
  const estimatedSeconds = Math.min(5, Math.ceil(queueLength * 0.25));
  return `${estimatedSeconds} seconds`;
};

export const formatResponse = (status: string, code: number, message: string, data?: any) => {
  return {
    status,
    code,
    message,
    ...(data && { data }),
  };
};

export const formatErrorResponse = (code: number, message: string, errors?: any[], errorCode?: string) => {
  return {
    status: 'error',
    code,
    ...(errorCode && { error_code: errorCode }),
    message,
    ...(errors && { errors }),
  };
};
