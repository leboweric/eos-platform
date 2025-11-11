-- Migration: Add lightweight error logging for AI transcription
-- Purpose: Track recent errors for monitoring dashboard (24-48 hour retention)
-- Created: 2024-11-10

CREATE TABLE IF NOT EXISTS ai_transcription_error_logs (
  id SERIAL PRIMARY KEY,
  transcript_id INTEGER REFERENCES meeting_transcripts(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  error_type VARCHAR(100) NOT NULL, -- e.g., 'websocket_error', 'ai_summary_error', 'database_error'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB, -- Additional context like meeting type, team name, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Index for fast queries
  INDEX idx_ai_error_logs_created_at (created_at DESC),
  INDEX idx_ai_error_logs_type (error_type),
  INDEX idx_ai_error_logs_org (organization_id, created_at DESC)
);

-- Auto-cleanup function: Delete errors older than 48 hours
CREATE OR REPLACE FUNCTION cleanup_old_ai_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_transcription_error_logs
  WHERE created_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON ai_transcription_error_logs TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE ai_transcription_error_logs_id_seq TO PUBLIC;

-- Initial cleanup
SELECT cleanup_old_ai_error_logs();
