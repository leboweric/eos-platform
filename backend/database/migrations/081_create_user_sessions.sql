-- Migration: Create user_sessions table for tracking logged-in users
-- Purpose: Enable real-time visibility of currently logged-in users
-- Date: 2025-11-09

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_org_id ON user_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE user_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() 
    AND is_active = true;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function to extend session expiration on activity
CREATE OR REPLACE FUNCTION extend_session_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NOW() + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-extend session on activity update
CREATE TRIGGER trigger_extend_session_expiration
  BEFORE UPDATE OF last_activity_at ON user_sessions
  FOR EACH ROW
  WHEN (OLD.last_activity_at IS DISTINCT FROM NEW.last_activity_at)
  EXECUTE FUNCTION extend_session_expiration();

-- Comment on table
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for real-time presence and activity monitoring';
COMMENT ON COLUMN user_sessions.last_activity_at IS 'Updated by heartbeat every 60 seconds while user is active';
COMMENT ON COLUMN user_sessions.expires_at IS 'Auto-extended to +24 hours on each activity update';
