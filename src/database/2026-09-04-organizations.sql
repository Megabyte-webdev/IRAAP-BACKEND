-- IRAAP institutional layer. Run with your normal Drizzle migration workflow.
CREATE TYPE organization_member_role AS ENUM ('STUDENT','SUPERVISOR','RESEARCHER','MANAGER');
CREATE TYPE subscription_status AS ENUM ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED');

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  code VARCHAR(80) UNIQUE,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_memberships (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role organization_member_role NOT NULL,
  department VARCHAR(255),
  external_ref VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_membership_org_user UNIQUE (organization_id, user_id)
);

CREATE TABLE organization_subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_code VARCHAR(80) NOT NULL DEFAULT 'FREE',
  status subscription_status NOT NULL DEFAULT 'TRIAL',
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP,
  external_customer_id VARCHAR(255),
  external_subscription_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(100),
  subject VARCHAR(255) NOT NULL DEFAULT 'General Support',
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  admin_note TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE publication_requests ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS organization_membership_org_idx ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS organization_membership_user_idx ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS organization_subscriptions_org_idx ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS support_ticket_status_idx ON support_tickets(status);
