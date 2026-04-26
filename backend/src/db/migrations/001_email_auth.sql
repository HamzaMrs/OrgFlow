-- 001_email_auth.sql — adds the columns and tables needed for email-based
-- onboarding (verification, password reset, invitations).
--
-- Idempotent: safe to run multiple times. Run once on Supabase (SQL Editor)
-- after pulling the new code.

-- ---------------------------------------------------------------------------
-- users: email verification + password reset state
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(verification_token) WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
  ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Existing accounts (the seed admin/manager/employee) are grandfathered as
-- already verified, so the migration doesn't lock them out.
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- ---------------------------------------------------------------------------
-- invitations: an admin invites someone by email; the recipient clicks the
-- link in the email, picks a password, and the user row is created on accept.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_pending
  ON invitations(email)
  WHERE accepted_at IS NULL;
