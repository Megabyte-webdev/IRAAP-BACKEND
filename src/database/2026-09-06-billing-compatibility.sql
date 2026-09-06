-- IRAAP billing_transactions compatibility migration
-- Run this once against the same PostgreSQL database used by the API.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS billing_transactions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference VARCHAR(120) NOT NULL UNIQUE,
  plan_code VARCHAR(80) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  customer_email VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  provider VARCHAR(30) NOT NULL DEFAULT 'PAYSTACK',
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_transactions_org_idx
  ON billing_transactions(organization_id);

CREATE INDEX IF NOT EXISTS billing_transactions_status_idx
  ON billing_transactions(status);

-- Existing installations sometimes have the table but miss newer columns.
ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'PAYSTACK';

ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'PENDING';

ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
