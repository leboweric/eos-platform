-- Migration: Create transcription_sessions table for WebSocket resilience
-- Date: 2025-11-03
-- Purpose: Store active transcription sessions to enable recovery after backend restarts

CREATE TABLE transcription_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_id VARCHAR(255) UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  meeting_id UUID REFERENCES meetings(id),
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  partial_transcript TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transcription_sessions_transcript_id ON transcription_sessions(transcript_id);
CREATE INDEX idx_transcription_sessions_status ON transcription_sessions(status);
CREATE INDEX idx_transcription_sessions_meeting_id ON transcription_sessions(meeting_id);
CREATE INDEX idx_transcription_sessions_organization_id ON transcription_sessions(organization_id);
CREATE INDEX idx_transcription_sessions_last_activity ON transcription_sessions(last_activity_at);

-- Comments for documentation
COMMENT ON TABLE transcription_sessions IS 'Stores active AI transcription sessions for recovery after server restarts';
COMMENT ON COLUMN transcription_sessions.transcript_id IS 'Unique identifier for the transcription session (AssemblyAI session ID)';
COMMENT ON COLUMN transcription_sessions.status IS 'Session status: active, completed, abandoned';
COMMENT ON COLUMN transcription_sessions.partial_transcript IS 'Accumulated transcript text so far';
COMMENT ON COLUMN transcription_sessions.last_activity_at IS 'Last time this session received data';