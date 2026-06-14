-- Store hash of the current valid refresh token per user (rotation on each refresh)
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64);

COMMENT ON COLUMN users.refresh_token_hash IS 'SHA-256 hash of the current valid refresh token; rotated on login and refresh';