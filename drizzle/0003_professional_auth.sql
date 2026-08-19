ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
CREATE TABLE auth_accounts (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,provider text NOT NULL,provider_account_id text NOT NULL,email text,created_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT auth_account_provider_identity UNIQUE(provider,provider_account_id));
CREATE TABLE auth_sessions (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE verification_codes (id text PRIMARY KEY,email text NOT NULL,code_hash text NOT NULL,attempts integer NOT NULL DEFAULT 0,expires_at timestamptz NOT NULL,consumed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX verification_codes_email_created ON verification_codes(email,created_at DESC);
CREATE TABLE invitations (id text PRIMARY KEY,organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,email text NOT NULL,role member_role NOT NULL DEFAULT 'member',token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,accepted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX invitations_email_pending ON invitations(lower(email)) WHERE accepted_at IS NULL;
