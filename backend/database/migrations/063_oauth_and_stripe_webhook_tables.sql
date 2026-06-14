-- One-time OAuth exchange codes (tokens exchanged via POST, not URL)
CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_exchange_codes_expires
  ON oauth_exchange_codes (expires_at)
  WHERE consumed_at IS NULL;

-- Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE oauth_exchange_codes IS 'Short-lived single-use codes for secure OAuth token exchange';
COMMENT ON TABLE stripe_webhook_events IS 'Processed Stripe webhook event IDs for idempotency';