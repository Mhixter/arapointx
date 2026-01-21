import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  decimal,
  date,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  walletBalance: decimal('wallet_balance', { precision: 15, scale: 2 }).default('0'),
  bvn: varchar('bvn', { length: 11 }),
  nin: varchar('nin', { length: 11 }),
  kycStatus: varchar('kyc_status', { length: 50 }).default('pending'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// OTP Verifications Table
export const otpVerifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull(),
  otpCode: varchar('otp_code', { length: 6 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).default('registration'),
  isUsed: boolean('is_used').default(false),
  attempts: integer('attempts').default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// RPA Jobs Queue
export const rpaJobs = pgTable('rpa_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  serviceType: varchar('service_type', { length: 100 }).notNull(),
  queryData: jsonb('query_data').notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  result: jsonb('result'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

// Bot Credentials
export const botCredentials = pgTable('bot_credentials', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  serviceName: varchar('service_name', { length: 100 }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  apiKey: varchar('api_key', { length: 500 }),
  authToken: varchar('auth_token', { length: 1000 }),
  tokenExpiry: timestamp('token_expiry'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// BVN Services
export const bvnServices = pgTable('bvn_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  bvn: varchar('bvn', { length: 11 }),
  phone: varchar('phone', { length: 20 }),
  serviceType: varchar('service_type', { length: 50 }),
  requestId: varchar('request_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  responseData: jsonb('response_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Education Services
export const educationServices = pgTable('education_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  jobId: uuid('job_id').references(() => rpaJobs.id),
  serviceType: varchar('service_type', { length: 100 }).notNull(),
  examYear: integer('exam_year'),
  registrationNumber: varchar('registration_number', { length: 100 }),
  status: varchar('status', { length: 50 }),
  resultData: jsonb('result_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Identity Verifications
export const identityVerifications = pgTable('identity_verifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  verificationType: varchar('verification_type', { length: 100 }),
  nin: varchar('nin', { length: 11 }),
  phone: varchar('phone', { length: 20 }),
  secondEnrollmentId: varchar('second_enrollment_id', { length: 100 }),
  status: varchar('status', { length: 50 }),
  verificationData: jsonb('verification_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Birth Attestations
export const birthAttestations = pgTable('birth_attestations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  fullName: varchar('full_name', { length: 255 }),
  dateOfBirth: date('date_of_birth'),
  registrationNumber: varchar('registration_number', { length: 100 }),
  status: varchar('status', { length: 50 }),
  certificateData: jsonb('certificate_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Airtime Services
export const airtimeServices = pgTable('airtime_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  network: varchar('network', { length: 50 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  type: varchar('type', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Data Services
export const dataServices = pgTable('data_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  network: varchar('network', { length: 50 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  planName: varchar('plan_name', { length: 100 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  type: varchar('type', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Electricity Services
export const electricityServices = pgTable('electricity_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  discoName: varchar('disco_name', { length: 100 }),
  meterNumber: varchar('meter_number', { length: 50 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  transactionId: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cable Services
export const cableServices = pgTable('cable_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  provider: varchar('provider', { length: 100 }),
  smartcardNumber: varchar('smartcard_number', { length: 50 }),
  package: varchar('package', { length: 100 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  transactionId: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Transactions
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  transactionType: varchar('transaction_type', { length: 50 }),
  amount: decimal('amount', { precision: 15, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  referenceId: varchar('reference_id', { length: 100 }),
  status: varchar('status', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Admin Settings
export const adminSettings = pgTable('admin_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar('setting_key', { length: 255 }).unique().notNull(),
  settingValue: text('setting_value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Roles
export const adminRoles = pgTable('admin_roles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: text('description'),
  permissions: jsonb('permissions').default('[]'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Users
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  roleId: uuid('role_id').references(() => adminRoles.id),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Activity Logs
export const adminActivityLogs = pgTable('admin_activity_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid('admin_id').references(() => adminUsers.id),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: varchar('resource_id', { length: 100 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Virtual Accounts (for Paystack Dedicated Virtual Accounts)
export const virtualAccounts = pgTable('virtual_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  paystackCustomerId: varchar('paystack_customer_id', { length: 100 }),
  paystackCustomerCode: varchar('paystack_customer_code', { length: 100 }),
  dedicatedAccountId: varchar('dedicated_account_id', { length: 100 }),
  bankName: varchar('bank_name', { length: 100 }),
  bankCode: varchar('bank_code', { length: 20 }),
  accountNumber: varchar('account_number', { length: 20 }),
  accountName: varchar('account_name', { length: 255 }),
  providerSlug: varchar('provider_slug', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Service Pricing
export const servicePricing = pgTable('service_pricing', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  serviceType: varchar('service_type', { length: 100 }).unique().notNull(),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).default('0').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  markup: decimal('markup', { precision: 10, scale: 2 }).default('0').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Scraped Data Plans
export const scrapedDataPlans = pgTable('scraped_data_plans', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  network: varchar('network', { length: 50 }).notNull(),
  planId: varchar('plan_id', { length: 100 }).notNull(),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  resellerPrice: decimal('reseller_price', { precision: 10, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  lastScrapedAt: timestamp('last_scraped_at').defaultNow(),
});

// CAC Service Types Catalog
export const cacServiceTypes = pgTable('cac_service_types', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  processingDays: integer('processing_days').default(7),
  requiredDocuments: jsonb('required_documents').default('[]'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CAC Agents (linked to admin_users with CAC role)
export const cacAgents = pgTable('cac_agents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id).unique(),
  employeeId: varchar('employee_id', { length: 50 }),
  specializations: jsonb('specializations').default('[]'),
  maxActiveRequests: integer('max_active_requests').default(10),
  currentActiveRequests: integer('current_active_requests').default(0),
  totalCompletedRequests: integer('total_completed_requests').default(0),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CAC Business Nature Categories (from CAC Portal)
export const cacBusinessNatures = pgTable('cac_business_natures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// CAC Registration Requests
export const cacRegistrationRequests = pgTable('cac_registration_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  serviceTypeId: uuid('service_type_id').references(() => cacServiceTypes.id),
  serviceType: varchar('service_type', { length: 100 }).notNull(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  businessNature: varchar('business_nature', { length: 255 }),
  businessAddress: text('business_address'),
  businessState: varchar('business_state', { length: 100 }),
  businessLga: varchar('business_lga', { length: 100 }),
  proprietorName: varchar('proprietor_name', { length: 255 }),
  proprietorPhone: varchar('proprietor_phone', { length: 20 }),
  proprietorEmail: varchar('proprietor_email', { length: 255 }),
  proprietorNin: varchar('proprietor_nin', { length: 11 }),
  additionalProprietors: jsonb('additional_proprietors').default('[]'),
  shareCapital: decimal('share_capital', { precision: 15, scale: 2 }),
  objectives: text('objectives'),
  passportPhotoUrl: text('passport_photo_url'),
  signatureUrl: text('signature_url'),
  ninSlipUrl: text('nin_slip_url'),
  status: varchar('status', { length: 50 }).default('submitted'),
  assignedAgentId: uuid('assigned_agent_id').references(() => cacAgents.id),
  assignedAt: timestamp('assigned_at'),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean('is_paid').default(false),
  paymentReference: varchar('payment_reference', { length: 100 }),
  cacRegistrationNumber: varchar('cac_registration_number', { length: 100 }),
  certificateUrl: text('certificate_url'),
  rejectionReason: text('rejection_reason'),
  customerNotes: text('customer_notes'),
  agentNotes: text('agent_notes'),
  submittedToCacAt: timestamp('submitted_to_cac_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CAC Request Documents
export const cacRequestDocuments = pgTable('cac_request_documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid('request_id').references(() => cacRegistrationRequests.id).notNull(),
  documentType: varchar('document_type', { length: 100 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  checksum: varchar('checksum', { length: 64 }),
  isVerified: boolean('is_verified').default(false),
  verifiedBy: uuid('verified_by').references(() => cacAgents.id),
  verifiedAt: timestamp('verified_at'),
  version: integer('version').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// CAC Request Activity Log
export const cacRequestActivity = pgTable('cac_request_activity', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid('request_id').references(() => cacRegistrationRequests.id).notNull(),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 100 }).notNull(),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  comment: text('comment'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// CAC Request Chat Messages
export const cacRequestMessages = pgTable('cac_request_messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid('request_id').references(() => cacRegistrationRequests.id).notNull(),
  senderType: varchar('sender_type', { length: 20 }).notNull(),
  senderId: uuid('sender_id').notNull(),
  message: text('message').notNull(),
  attachments: jsonb('attachments').default('[]'),
  fileUrl: text('file_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileType: varchar('file_type', { length: 100 }),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Identity Agents (for manual NIN services) - uses adminUsers like CAC agents
export const identityAgents = pgTable('identity_agents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id).unique(),
  employeeId: varchar('employee_id', { length: 50 }),
  specializations: jsonb('specializations').default('["nin_validation", "ipe_clearance", "nin_personalization"]'),
  maxActiveRequests: integer('max_active_requests').default(20),
  currentActiveRequests: integer('current_active_requests').default(0),
  totalCompletedRequests: integer('total_completed_requests').default(0),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Education Agents (for JAMB, WAEC, NECO verification)
export const educationAgents = pgTable('education_agents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id).unique(),
  employeeId: varchar('employee_id', { length: 50 }),
  specializations: jsonb('specializations').default('["jamb", "waec", "neco"]'),
  maxActiveRequests: integer('max_active_requests').default(20),
  currentActiveRequests: integer('current_active_requests').default(0),
  totalCompletedRequests: integer('total_completed_requests').default(0),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Education Service Requests
export const educationServiceRequests = pgTable('education_service_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  trackingId: varchar('tracking_id', { length: 20 }).unique().notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(),
  examYear: varchar('exam_year', { length: 10 }),
  registrationNumber: varchar('registration_number', { length: 50 }),
  candidateName: varchar('candidate_name', { length: 255 }),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  assignedAgentId: uuid('assigned_agent_id').references(() => educationAgents.id),
  assignedAt: timestamp('assigned_at'),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean('is_paid').default(false),
  paymentReference: varchar('payment_reference', { length: 100 }),
  resultData: jsonb('result_data'),
  resultUrl: varchar('result_url', { length: 500 }),
  customerNotes: text('customer_notes'),
  agentNotes: text('agent_notes'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Identity Service Requests (NIN Validation, IPE Clearance, NIN Personalization)
export const identityServiceRequests = pgTable('identity_service_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  trackingId: varchar('tracking_id', { length: 20 }).unique().notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(), // nin_validation, ipe_clearance, nin_personalization
  // Request details based on service type
  nin: varchar('nin', { length: 11 }),
  newTrackingId: varchar('new_tracking_id', { length: 50 }), // For IPE and Personalization
  // For NIN Validation - what fields to update
  updateFields: jsonb('update_fields'), // { name: 'new name', address: 'new address', phone: 'new phone' }
  // Status tracking
  status: varchar('status', { length: 30 }).default('pending').notNull(), // pending, pickup, completed
  assignedAgentId: uuid('assigned_agent_id').references(() => identityAgents.id),
  assignedAt: timestamp('assigned_at'),
  // Pricing
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean('is_paid').default(false),
  paymentReference: varchar('payment_reference', { length: 100 }),
  // Result
  slipUrl: varchar('slip_url', { length: 500 }), // For completed IPE/Personalization
  resultData: jsonb('result_data'), // Any additional result data
  customerNotes: text('customer_notes'),
  agentNotes: text('agent_notes'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Identity Request Activity Log
export const identityRequestActivity = pgTable('identity_request_activity', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid('request_id').references(() => identityServiceRequests.id).notNull(),
  actorType: varchar('actor_type', { length: 20 }).notNull(), // user, agent, system
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 100 }).notNull(),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  comment: text('comment'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Education PIN Inventory
export const educationPins = pgTable('education_pins', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  examType: varchar('exam_type', { length: 20 }).notNull(), // waec, neco, nabteb, nbais
  pinCode: varchar('pin_code', { length: 100 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }),
  status: varchar('status', { length: 20 }).default('unused').notNull(), // unused, used
  usedByOrderId: uuid('used_by_order_id'),
  usedByUserId: uuid('used_by_user_id').references(() => users.id),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// NBAIS Schools
export const nbaisSchools = pgTable('nbais_schools', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  state: varchar('state', { length: 100 }).notNull(),
  schoolName: varchar('school_name', { length: 500 }).notNull(),
  schoolValue: varchar('school_value', { length: 500 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Education PIN Orders
export const educationPinOrders = pgTable('education_pin_orders', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  examType: varchar('exam_type', { length: 20 }).notNull(), // waec, neco, nabteb, nbais
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, paid, completed, failed, refunded
  pinId: uuid('pin_id').references(() => educationPins.id),
  paymentReference: varchar('payment_reference', { length: 100 }),
  deliveredPin: varchar('delivered_pin', { length: 100 }),
  deliveredSerial: varchar('delivered_serial', { length: 100 }),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Airtime to Cash Agents
export const a2cAgents = pgTable('a2c_agents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id).unique(),
  employeeId: varchar('employee_id', { length: 50 }),
  supportedNetworks: jsonb('supported_networks').default('["mtn", "airtel", "glo", "9mobile"]'),
  maxActiveRequests: integer('max_active_requests').default(30),
  currentActiveRequests: integer('current_active_requests').default(0),
  totalCompletedRequests: integer('total_completed_requests').default(0),
  totalProcessedAmount: decimal('total_processed_amount', { precision: 15, scale: 2 }).default('0'),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Airtime to Cash Phone Inventory - Numbers customers send airtime to
export const a2cPhoneInventory = pgTable('a2c_phone_inventory', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => a2cAgents.id).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  network: varchar('network', { length: 20 }).notNull(), // mtn, airtel, glo, 9mobile
  dailyLimit: decimal('daily_limit', { precision: 15, scale: 2 }).default('500000'), // Max airtime per day
  usedToday: decimal('used_today', { precision: 15, scale: 2 }).default('0'), // Amount used today
  lastResetDate: timestamp('last_reset_date').defaultNow(),
  priority: integer('priority').default(1), // For round-robin selection
  isActive: boolean('is_active').default(true),
  label: varchar('label', { length: 100 }), // Optional friendly name
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Airtime to Cash Requests
export const a2cRequests = pgTable('a2c_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id).notNull(),
  trackingId: varchar('tracking_id', { length: 20 }).unique().notNull(),
  network: varchar('network', { length: 20 }).notNull(), // mtn, airtel, glo, 9mobile
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(), // User's phone that will send airtime
  airtimeAmount: decimal('airtime_amount', { precision: 10, scale: 2 }).notNull(),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 2 }).notNull(), // e.g., 0.70 for 70%
  cashAmount: decimal('cash_amount', { precision: 10, scale: 2 }).notNull(), // Amount user will receive
  inventoryId: uuid('inventory_id').references(() => a2cPhoneInventory.id), // Link to inventory number
  receivingNumber: varchar('receiving_number', { length: 20 }).notNull(), // Agent's number to receive airtime
  // User's bank details for payment
  bankName: varchar('bank_name', { length: 100 }),
  accountNumber: varchar('account_number', { length: 20 }),
  accountName: varchar('account_name', { length: 255 }),
  // Status: pending -> airtime_sent -> airtime_received -> processing -> completed/rejected
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  assignedAgentId: uuid('assigned_agent_id').references(() => a2cAgents.id),
  assignedAt: timestamp('assigned_at'),
  userConfirmedAt: timestamp('user_confirmed_at'), // When user clicks "I've sent"
  airtimeReceivedAt: timestamp('airtime_received_at'),
  cashPaidAt: timestamp('cash_paid_at'),
  customerNotes: text('customer_notes'),
  agentNotes: text('agent_notes'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Airtime to Cash Status History - For audit trail
export const a2cStatusHistory = pgTable('a2c_status_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid('request_id').references(() => a2cRequests.id).notNull(),
  actorType: varchar('actor_type', { length: 20 }).notNull(), // user, agent, admin, system
  actorId: uuid('actor_id'),
  previousStatus: varchar('previous_status', { length: 30 }),
  newStatus: varchar('new_status', { length: 30 }).notNull(),
  note: text('note'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent Channels - Stores agent WhatsApp/contact info for notifications
export const agentChannels = pgTable('agent_channels', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentType: varchar('agent_type', { length: 30 }).notNull(), // cac, identity, education, a2c, bvn
  agentId: uuid('agent_id').notNull(), // Reference to respective agent table
  channelType: varchar('channel_type', { length: 20 }).default('whatsapp').notNull(), // whatsapp, sms, email
  channelValue: varchar('channel_value', { length: 50 }).notNull(), // Phone number for WhatsApp/SMS
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Agent Notifications - Queue for WhatsApp/SMS notifications
export const agentNotifications = pgTable('agent_notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentType: varchar('agent_type', { length: 30 }).notNull(), // cac, identity, education, a2c, bvn
  agentId: uuid('agent_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  requestType: varchar('request_type', { length: 50 }).notNull(), // bvn_modification, education_verification, a2c_request, etc.
  requestId: varchar('request_id', { length: 100 }).notNull(),
  templateName: varchar('template_name', { length: 100 }).notNull(), // WhatsApp template name
  payload: jsonb('payload').notNull(), // Template variables
  status: varchar('status', { length: 20 }).default('queued').notNull(), // queued, sent, failed, delivered, read
  attempts: integer('attempts').default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  errorMessage: text('error_message'),
  externalMessageId: varchar('external_message_id', { length: 100 }), // WhatsApp message ID
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// WhatsApp Templates - Admin-configurable message templates
export const whatsappTemplates = pgTable('whatsapp_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  templateName: varchar('template_name', { length: 100 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  templateContent: text('template_content').notNull(), // Template with {{variable}} placeholders
  variables: jsonb('variables').default('[]'), // List of required variables
  category: varchar('category', { length: 50 }).notNull(), // transactional, marketing
  isActive: boolean('is_active').default(true),
  metaTemplateId: varchar('meta_template_id', { length: 100 }), // ID from Meta WhatsApp
  metaStatus: varchar('meta_status', { length: 30 }), // APPROVED, PENDING, REJECTED
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
