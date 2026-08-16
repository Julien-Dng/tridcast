CREATE TYPE quality_tier AS ENUM ('economy', 'standard', 'advanced', 'premium');
CREATE TYPE pricing_mode AS ENUM ('per_generation', 'per_second', 'per_compute_time', 'fixed', 'custom');
CREATE TYPE credit_transaction_type AS ENUM ('subscription_grant', 'purchase', 'promotion', 'reservation', 'consumption', 'release', 'refund', 'expiration', 'manual_adjustment');

CREATE TABLE ai_models (
  id uuid PRIMARY KEY, provider text NOT NULL, provider_model_id text NOT NULL,
  provider_version text, name text NOT NULL, slug text UNIQUE NOT NULL, description text NOT NULL,
  quality_tier quality_tier NOT NULL, capabilities jsonb NOT NULL DEFAULT '{}',
  supported_aspect_ratios jsonb NOT NULL, supported_durations jsonb NOT NULL,
  supported_resolutions jsonb NOT NULL, pricing_mode pricing_mode NOT NULL,
  estimated_provider_cost numeric(14,6) NOT NULL CHECK (estimated_provider_cost >= 0),
  credit_cost integer NOT NULL CHECK (credit_cost >= 0), minimum_plan text,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY, slug text UNIQUE NOT NULL, name text NOT NULL, description text NOT NULL,
  monthly_price integer NOT NULL, annual_price integer NOT NULL, monthly_credits integer NOT NULL,
  maximum_quality_tier quality_tier NOT NULL, maximum_resolution text NOT NULL,
  concurrent_generation_limit integer NOT NULL CHECK (concurrent_generation_limit > 0),
  features jsonb NOT NULL DEFAULT '[]', stripe_monthly_price_id text, stripe_annual_price_id text,
  active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY, organization_id uuid UNIQUE NOT NULL, plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id text, stripe_subscription_id text UNIQUE, status text NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','year')),
  current_period_start timestamptz NOT NULL, current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE generation_quotes (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, project_id uuid NOT NULL,
  model_id uuid NOT NULL REFERENCES ai_models(id), configuration jsonb NOT NULL,
  estimated_provider_cost numeric(14,6) NOT NULL, required_credits integer NOT NULL CHECK (required_credits > 0),
  currency char(3) NOT NULL DEFAULT 'EUR', expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE credit_wallets (
  id uuid PRIMARY KEY, organization_id uuid UNIQUE NOT NULL,
  subscription_credits integer NOT NULL DEFAULT 0 CHECK (subscription_credits >= 0),
  purchased_credits integer NOT NULL DEFAULT 0 CHECK (purchased_credits >= 0),
  promotional_credits integer NOT NULL DEFAULT 0 CHECK (promotional_credits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE credit_transactions (
  id uuid PRIMARY KEY, wallet_id uuid NOT NULL REFERENCES credit_wallets(id), type credit_transaction_type NOT NULL,
  amount integer NOT NULL, balance_after integer NOT NULL CHECK (balance_after >= 0), project_id uuid,
  generation_job_id uuid, stripe_payment_id text, description text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_events (
  id uuid PRIMARY KEY, provider text NOT NULL, external_event_id text NOT NULL,
  event_type text NOT NULL, payload_hash text NOT NULL, processed_at timestamptz,
  status text NOT NULL, error_message text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, external_event_id)
);
CREATE TABLE credit_packs (
  id uuid PRIMARY KEY, name text NOT NULL, credits integer NOT NULL CHECK (credits > 0),
  price integer NOT NULL CHECK (price > 0), minimum_plan text, stripe_price_id text,
  active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL
);
CREATE TABLE billing_settings (
  key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);

-- Application transactions must lock this row before checking and reserving funds:
-- SELECT * FROM credit_wallets WHERE organization_id = $1 FOR UPDATE;
CREATE INDEX credit_transactions_wallet_created_idx ON credit_transactions(wallet_id, created_at DESC);
CREATE INDEX generation_quotes_expiry_idx ON generation_quotes(expires_at);

INSERT INTO subscription_plans (id, slug, name, description, monthly_price, annual_price, monthly_credits, maximum_quality_tier, maximum_resolution, concurrent_generation_limit, features, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'starter', 'Starter', 'Pour démarrer', 2900, 29000, 1000, 'economy', '720p', 1, '["history_limited","no_watermark","commercial_use"]', 10),
  ('00000000-0000-0000-0000-000000000002', 'pro', 'Pro', 'Pour les professionnels', 7900, 79000, 3500, 'advanced', '1080p', 3, '["premium_templates","brand_kit","topups"]', 20),
  ('00000000-0000-0000-0000-000000000003', 'agency', 'Agency', 'Pour les équipes', 19900, 199000, 10000, 'premium', '2160p', 5, '["multiple_users","multiple_brand_kits","full_history","topups"]', 30);
INSERT INTO credit_packs (id, name, credits, price, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', '2 000 crédits', 2000, 2400, 10),
  ('10000000-0000-0000-0000-000000000002', '5 500 crédits', 5500, 6050, 20),
  ('10000000-0000-0000-0000-000000000003', '12 000 crédits', 12000, 12000, 30);
INSERT INTO billing_settings (key, value) VALUES
  ('credit_value_eur', '0.01'), ('target_gross_margin', '0.70'),
  ('minimum_gross_margin', '0.60'), ('retry_reserve_rate', '0.15'),
  ('quote_ttl_minutes', '15'), ('annual_discount_months', '2');
