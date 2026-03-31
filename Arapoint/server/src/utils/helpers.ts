export const getSiteUrl = (): string => {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.REPLIT_DEPLOYMENT) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return 'https://arapoint.com.ng';
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

export const formatErrorResponse = (code: number, message: string, errors?: any[]) => {
  return {
    status: 'error',
    code,
    message,
    ...(errors && { errors }),
  };
};
