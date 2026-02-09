export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_SSL: process.env.DB_SSL === 'true',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_here',
  
  // RPA Configuration
  RPA_MAX_CONCURRENT_JOBS: parseInt(process.env.RPA_MAX_CONCURRENT_JOBS || '5'),
  RPA_JOB_TIMEOUT: parseInt(process.env.RPA_JOB_TIMEOUT || '60000'),
  RPA_REQUEST_TIMEOUT: parseInt(process.env.RPA_REQUEST_TIMEOUT || '90000'),
  RPA_RETRY_MAX: parseInt(process.env.RPA_RETRY_MAX || '3'),
  RPA_RETRY_BACKOFF: process.env.RPA_RETRY_BACKOFF || 'exponential',
  
  // Payment Gateways
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
  PALMPAY_API_KEY: process.env.PALMPAY_API_KEY || '',
  PALMPAY_SECRET_KEY: process.env.PALMPAY_SECRET_KEY || '',
  PALMPAY_APP_ID: process.env.PALMPAY_APP_ID || '',
  
  // Service Credentials
  BVN_SERVICE_USERNAME: process.env.BVN_SERVICE_USERNAME || '',
  BVN_SERVICE_PASSWORD: process.env.BVN_SERVICE_PASSWORD || '',
  NIN_SERVICE_USERNAME: process.env.NIN_SERVICE_USERNAME || '',
  NIN_SERVICE_PASSWORD: process.env.NIN_SERVICE_PASSWORD || '',
  JAMB_SERVICE_USERNAME: process.env.JAMB_SERVICE_USERNAME || '',
  JAMB_SERVICE_PASSWORD: process.env.JAMB_SERVICE_PASSWORD || '',
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Arapoint',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@arapoint.com.ng',
  
  // Admin
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@arapoint.com',
  ADMIN_PHONE: process.env.ADMIN_PHONE || '+2348012345678',
};
