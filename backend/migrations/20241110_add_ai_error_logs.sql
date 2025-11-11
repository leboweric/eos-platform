-- Migration: Add lightweight error logging for AI transcription
-- Purpose: Track recent errors for monitoring dashboard (24-48 hour retention)
-- Created: 2024-11-10

CREATE TABLE IF NOT EXISTS ai_transcription_error_logs (
  id SERIAL PRIMARY KEY,
  transcript_id UUID REFERENCES meeting_transcripts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  error_type VARCHAR(100) NOT NULL, -- e.g., 'websocket_error', 'ai_summary_error', 'database_error'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB, -- Additional context like meeting type, team name, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_ai_error_logs_created_at ON ai_transcription_error_logs (created_at DESC);
CREATE INDEX idx_ai_error_logs_type ON ai_transcription_error_logs (error_type);
CREATE INDEX idx_ai_error_logs_org ON ai_transcription_error_logs (organization_id, created_at DESC);

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
