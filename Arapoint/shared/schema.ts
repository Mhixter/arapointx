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
  serial,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  password_hash: varchar('password_hash', { length: 255 }),
  wallet_balance: decimal('wallet_balance', { precision: 15, scale: 2 }).default('0'),
  bvn: varchar('bvn', { length: 11 }),
  nin: varchar('nin', { length: 11 }),
  kyc_status: varchar('kyc_status', { length: 50 }).default('pending'),
  email_verified: boolean('email_verified').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const otp_verifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull(),
  otp_code: varchar('otp_code', { length: 6 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).default('registration'),
  is_used: boolean('is_used').default(false),
  attempts: integer('attempts').default(0),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const rpa_jobs = pgTable('rpa_jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  service_type: varchar('service_type', { length: 100 }).notNull(),
  query_data: jsonb('query_data').notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  result: jsonb('result'),
  error_message: text('error_message'),
  retry_count: integer('retry_count').default(0),
  max_retries: integer('max_retries').default(3),
  priority: integer('priority').default(0),
  created_at: timestamp('created_at').defaultNow(),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
});

export const bot_credentials = pgTable('bot_credentials', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  service_name: varchar('service_name', { length: 100 }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  password_hash: varchar('password_hash', { length: 255 }),
  api_key: varchar('api_key', { length: 500 }),
  auth_token: varchar('auth_token', { length: 1000 }),
  token_expiry: timestamp('token_expiry'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const bvn_services = pgTable('bvn_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  bvn: varchar('bvn', { length: 11 }),
  phone: varchar('phone', { length: 20 }),
  service_type: varchar('service_type', { length: 50 }),
  request_id: varchar('request_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  response_data: jsonb('response_data'),
  created_at: timestamp('created_at').defaultNow(),
});

export const scraped_data_plans = pgTable('scraped_data_plans', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  network: varchar('network', { length: 50 }).notNull(),
  plan_id: varchar('plan_id', { length: 100 }).notNull(),
  plan_name: varchar('plan_name', { length: 255 }).notNull(),
  cost_price: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  is_active: boolean('is_active').default(true),
  last_scraped_at: timestamp('last_scraped_at').defaultNow(),
});

export const education_services = pgTable('education_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  service_type: varchar('service_type', { length: 100 }).notNull(),
  exam_year: integer('exam_year'),
  registration_number: varchar('registration_number', { length: 100 }),
  status: varchar('status', { length: 50 }),
  result_data: jsonb('result_data'),
  created_at: timestamp('created_at').defaultNow(),
});

export const identity_verifications = pgTable('identity_verifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  verification_type: varchar('verification_type', { length: 100 }),
  nin: varchar('nin', { length: 11 }),
  phone: varchar('phone', { length: 20 }),
  second_enrollment_id: varchar('second_enrollment_id', { length: 100 }),
  status: varchar('status', { length: 50 }),
  verification_data: jsonb('verification_data'),
  created_at: timestamp('created_at').defaultNow(),
});

export const birth_attestations = pgTable('birth_attestations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  full_name: varchar('full_name', { length: 255 }),
  date_of_birth: date('date_of_birth'),
  registration_number: varchar('registration_number', { length: 100 }),
  status: varchar('status', { length: 50 }),
  certificate_data: jsonb('certificate_data'),
  created_at: timestamp('created_at').defaultNow(),
});

export const airtime_services = pgTable('airtime_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  network: varchar('network', { length: 50 }),
  phone_number: varchar('phone_number', { length: 20 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  type: varchar('type', { length: 50 }),
  transaction_id: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const data_services = pgTable('data_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  network: varchar('network', { length: 50 }),
  phone_number: varchar('phone_number', { length: 20 }),
  plan_name: varchar('plan_name', { length: 100 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  type: varchar('type', { length: 50 }),
  transaction_id: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const electricity_services = pgTable('electricity_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  disco_name: varchar('disco_name', { length: 100 }),
  meter_number: varchar('meter_number', { length: 50 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  transaction_id: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const cable_services = pgTable('cable_services', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  provider: varchar('provider', { length: 100 }),
  smartcard_number: varchar('smartcard_number', { length: 50 }),
  package: varchar('package', { length: 100 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  transaction_id: varchar('transaction_id', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }),
  reference: varchar('reference', { length: 100 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id),
  transaction_type: varchar('transaction_type', { length: 50 }),
  amount: decimal('amount', { precision: 15, scale: 2 }),
  payment_method: varchar('payment_method', { length: 50 }),
  reference_id: varchar('reference_id', { length: 100 }),
  status: varchar('status', { length: 50 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const admin_settings = pgTable('admin_settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  setting_key: varchar('setting_key', { length: 255 }).unique().notNull(),
  setting_value: text('setting_value'),
  description: text('description'),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const virtual_accounts = pgTable('virtual_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id).notNull().unique(),
  paystack_customer_id: varchar('paystack_customer_id', { length: 100 }),
  paystack_customer_code: varchar('paystack_customer_code', { length: 100 }),
  dedicated_account_id: varchar('dedicated_account_id', { length: 100 }),
  bank_name: varchar('bank_name', { length: 100 }),
  bank_code: varchar('bank_code', { length: 20 }),
  account_number: varchar('account_number', { length: 20 }),
  account_name: varchar('account_name', { length: 255 }),
  provider_slug: varchar('provider_slug', { length: 50 }),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const nbais_schools = pgTable('nbais_schools', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  state: varchar('state', { length: 100 }).notNull(),
  school_name: varchar('school_name', { length: 500 }).notNull(),
  school_value: varchar('school_value', { length: 500 }),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const cac_requests = pgTable('cac_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  agent_id: uuid('agent_id').references(() => users.id),
  business_name: varchar('business_name', { length: 255 }).notNull(),
  business_type: varchar('business_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  reference: varchar('reference', { length: 100 }).unique().notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  completed_at: timestamp('completed_at'),
});

export const cac_files = pgTable('cac_files', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cac_request_id: uuid('cac_request_id').references(() => cac_requests.id).notNull(),
  uploaded_by: uuid('uploaded_by').references(() => users.id).notNull(),
  file_type: varchar('file_type', { length: 50 }).notNull(),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_key: varchar('file_key', { length: 500 }).notNull(),
  file_size: integer('file_size'),
  is_result: boolean('is_result').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

export const bvn_verifications = pgTable('bvn_verifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  bvn: varchar('bvn', { length: 11 }).notNull(),
  reference: varchar('reference', { length: 100 }).unique().notNull(),
  verification_data: jsonb('verification_data'),
  pdf_key: varchar('pdf_key', { length: 500 }),
  status: varchar('status', { length: 50 }).default('completed'),
  created_at: timestamp('created_at').defaultNow(),
});
