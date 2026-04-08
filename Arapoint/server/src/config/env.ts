const isProd = process.env.NODE_ENV === 'production';

function required(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    if (isProd && !fallback) {
      throw new Error(`FATAL: Required environment variable "${key}" is not set. Cannot start in production.`);
    }
    return fallback ?? '';
  }
  return value;
}

function requireSecret(key: string, insecureFallback: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '' || value === insecureFallback) {
    if (isProd) {
      throw new Error(`FATAL: Secret "${key}" is not set or is using the insecure default. Cannot start in production.`);
    }
    return insecureFallback;
  }
  return value;
}

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: required('DATABASE_URL'),
  DB_SSL: process.env.DB_SSL === 'true',

  // JWT — MUST be set in production; startup will crash with a clear message if missing
  JWT_SECRET:            requireSecret('JWT_SECRET',            'your_jwt_secret_key_here'),
  REFRESH_TOKEN_SECRET:  requireSecret('REFRESH_TOKEN_SECRET',  'your_refresh_token_secret_here'),

  // RPA Configuration
  RPA_MAX_CONCURRENT_JOBS: parseInt(process.env.RPA_MAX_CONCURRENT_JOBS || '10'),
  RPA_BROWSER_POOL_SIZE:   parseInt(process.env.RPA_BROWSER_POOL_SIZE   || '3'),
  RPA_JOB_TIMEOUT:         parseInt(process.env.RPA_JOB_TIMEOUT         || '60000'),
  RPA_REQUEST_TIMEOUT:     parseInt(process.env.RPA_REQUEST_TIMEOUT     || '90000'),
  RPA_RETRY_MAX:           parseInt(process.env.RPA_RETRY_MAX           || '3'),
  RPA_RETRY_BACKOFF:       process.env.RPA_RETRY_BACKOFF || 'exponential',

  // Payment Gateways
  PAYSTACK_SECRET_KEY:       process.env.PAYSTACK_SECRET_KEY       || '',
  PAYSTACK_PUBLIC_KEY:       process.env.PAYSTACK_PUBLIC_KEY       || '',
  PALMPAY_PUBLIC_KEY:        process.env.PALMPAY_PUBLIC_KEY        || '',
  PALMPAY_APP_ID:            process.env.PALMPAY_APP_ID            || '',
  PAYMENTPOINT_API_KEY:      process.env.PAYMENTPOINT_API_KEY      || '',
  PAYMENTPOINT_SECRET_KEY:   process.env.PAYMENTPOINT_SECRET_KEY   || '',
  PAYMENTPOINT_MERCHANT_ID:  process.env.PAYMENTPOINT_MERCHANT_ID  || '',

  // Service Credentials
  BVN_SERVICE_USERNAME:  process.env.BVN_SERVICE_USERNAME  || '',
  BVN_SERVICE_PASSWORD:  process.env.BVN_SERVICE_PASSWORD  || '',
  NIN_SERVICE_USERNAME:  process.env.NIN_SERVICE_USERNAME  || '',
  NIN_SERVICE_PASSWORD:  process.env.NIN_SERVICE_PASSWORD  || '',
  JAMB_SERVICE_USERNAME: process.env.JAMB_SERVICE_USERNAME || '',
  JAMB_SERVICE_PASSWORD: process.env.JAMB_SERVICE_PASSWORD || '',

  // Email
  SMTP_HOST:       process.env.SMTP_HOST       || 'smtp.gmail.com',
  SMTP_PORT:       parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER:       process.env.SMTP_USER        || '',
  SMTP_PASS:       process.env.SMTP_PASS        || '',
  SMTP_FROM_NAME:  process.env.SMTP_FROM_NAME   || 'Arapoint',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL  || process.env.SMTP_USER || 'noreply@arapoint.com.ng',

  // Admin
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@arapoint.com',
  ADMIN_PHONE: process.env.ADMIN_PHONE || '+2348012345678',
};
