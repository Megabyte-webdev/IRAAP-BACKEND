-- Organization manager controls, quotas, and Paystack billing ledger.
-- Run after 2026-09-04-organizations.sql.

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

CREATE INDEX IF NOT EXISTS billing_transactions_org_idx ON billing_transactions(organization_id);
CREATE INDEX IF NOT EXISTS billing_transactions_status_idx ON billing_transactions(status);

-- Make trial duration explicit for existing organizations that have no expiry.
UPDATE organization_subscriptions
SET ends_at = starts_at + INTERVAL '14 days'
WHERE status = 'TRIAL' AND ends_at IS NULL;
