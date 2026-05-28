-- Add missing tables to fix database errors

-- Webhook Retry Queue
CREATE TABLE IF NOT EXISTS webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url VARCHAR(500) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_status ON webhook_retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_next ON webhook_retry_queue(next_retry_at);

-- Rate Limits Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  user_id UUID,
  endpoint VARCHAR(255),
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  window_end TIMESTAMP NOT NULL,
  limit_threshold INTEGER DEFAULT 100,
  is_exceeded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);

-- Screening Paystack Transactions
CREATE TABLE IF NOT EXISTS screening_paystack_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES screening_organizations(id) ON DELETE CASCADE,
  reference VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed, cancelled
  paystack_access_code VARCHAR(255),
  paystack_authorization_url VARCHAR(500),
  paystack_reference VARCHAR(100),
  payer_email VARCHAR(255),
  description TEXT,
  metadata JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_screening_paystack_org_id ON screening_paystack_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_screening_paystack_reference ON screening_paystack_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_screening_paystack_status ON screening_paystack_transactions(status);
CREATE INDEX IF NOT EXISTS idx_screening_paystack_created ON screening_paystack_transactions(created_at);
