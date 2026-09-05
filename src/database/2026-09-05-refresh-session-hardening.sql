CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Refresh-session hardening:
-- * stores only SHA-256 token hashes
-- * sliding 30-day inactivity expiry
-- * 90-day absolute session lifetime
-- * token rotation/reuse tracking

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS family_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS replaced_by_token_hash TEXT;

-- Existing deployments may have plaintext tokens. Backfill token_hash before
-- the column becomes NOT NULL; immediately rotate active sessions afterward.
UPDATE refresh_tokens
SET token_hash = encode(digest(token::text, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

UPDATE refresh_tokens
SET family_id = 'legacy-' || id::text
WHERE family_id IS NULL;

UPDATE refresh_tokens
SET session_expires_at = GREATEST(expires_at, COALESCE(created_at, NOW()) + INTERVAL '90 days')
WHERE session_expires_at IS NULL;

UPDATE refresh_tokens
SET last_used_at = created_at
WHERE last_used_at IS NULL;

-- Drop the old plaintext token column after the application has been deployed
-- with hash-only reads/writes. Keeping plaintext tokens in the DB is unsafe.
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS token;

ALTER TABLE refresh_tokens
  ALTER COLUMN token_hash SET NOT NULL,
  ALTER COLUMN family_id SET NOT NULL,
  ALTER COLUMN session_expires_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_uidx
  ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx
  ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx
  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx
  ON refresh_tokens(expires_at);
