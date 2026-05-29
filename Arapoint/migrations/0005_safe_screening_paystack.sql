-- Migration: Create screening_paystack_transactions table
-- This migration ONLY creates the missing screening_paystack_transactions table
-- No destructive operations on existing tables

CREATE TABLE IF NOT EXISTS screening_paystack_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES screening_organizations(id) ON DELETE CASCADE,
  reference VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(50) DEFAULT 'pending',
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_screening_paystack_org_id 
  ON screening_paystack_transactions(org_id);

CREATE INDEX IF NOT EXISTS idx_screening_paystack_reference 
  ON screening_paystack_transactions(reference);

CREATE INDEX IF NOT EXISTS idx_screening_paystack_status 
  ON screening_paystack_transactions(status);

CREATE INDEX IF NOT EXISTS idx_screening_paystack_created 
  ON screening_paystack_transactions(created_at);
