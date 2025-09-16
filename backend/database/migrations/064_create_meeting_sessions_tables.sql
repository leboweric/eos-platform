-- Migration: Create meeting sessions tables for timer persistence
-- Purpose: Enable pause/resume functionality with database persistence
-- Author: AXP Development Team
-- Date: 2024-01-16

-- Table for active meeting sessions with timer state
CREATE TABLE IF NOT EXISTS meeting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('weekly', 'quarterly', 'annual')),
  
  -- Timing fields
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_pause_time TIMESTAMP WITH TIME ZONE,
  last_resume_time TIMESTAMP WITH TIME ZONE,
  total_paused_duration INTEGER DEFAULT 0, -- total seconds paused
  is_paused BOOLEAN DEFAULT false,
  
  -- Current state
  current_section VARCHAR(50), -- 'segue', 'scorecard', 'rock-review', etc.
  current_section_start TIMESTAMP WITH TIME ZONE,
  
  -- Meeting metadata
  facilitator_id UUID REFERENCES users(id),
  participant_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Auto-cleanup after 24 hours
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for pause/resume event history
CREATE TABLE IF NOT EXISTS meeting_pause_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  
  -- Event details
  pause_time TIMESTAMP WITH TIME ZONE NOT NULL,
  resume_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- calculated on resume
  
  -- Who and why
  paused_by UUID REFERENCES users(id),
  resumed_by UUID REFERENCES users(id),
  reason VARCHAR(255), -- optional reason for pause
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_org_team 
  ON meeting_sessions(organization_id, team_id);

CREATE INDEX IF NOT EXISTS idx_meeting_sessions_active 
  ON meeting_sessions(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_meeting_sessions_expires 
  ON meeting_sessions(expires_at) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_meeting_pause_events_session 
  ON meeting_pause_events(session_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_meeting_sessions_updated_at_trigger ON meeting_sessions;
CREATE TRIGGER update_meeting_sessions_updated_at_trigger
  BEFORE UPDATE ON meeting_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_sessions_updated_at();

-- Function to calculate total meeting duration (excluding paused time)
CREATE OR REPLACE FUNCTION calculate_active_duration(session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  session_record RECORD;
  total_duration INTEGER;
BEGIN
  SELECT * INTO session_record FROM meeting_sessions WHERE id = session_id;
  
  IF session_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total elapsed time
  total_duration := EXTRACT(EPOCH FROM (NOW() - session_record.start_time))::INTEGER;
  
  -- Subtract paused duration
  total_duration := total_duration - COALESCE(session_record.total_paused_duration, 0);
  
  -- If currently paused, subtract time since last pause
  IF session_record.is_paused AND session_record.last_pause_time IS NOT NULL THEN
    total_duration := total_duration - 
      EXTRACT(EPOCH FROM (NOW() - session_record.last_pause_time))::INTEGER;
  END IF;
  
  RETURN GREATEST(total_duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE meeting_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() 
    AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Sample query to get current active meeting for a team
-- SELECT 
--   ms.*,
--   calculate_active_duration(ms.id) as active_duration_seconds,
--   u.full_name as facilitator_name
-- FROM meeting_sessions ms
-- LEFT JOIN users u ON ms.facilitator_id = u.id
-- WHERE ms.team_id = $1 
--   AND ms.is_active = true
--   AND ms.meeting_type = $2
-- ORDER BY ms.created_at DESC
-- LIMIT 1;

COMMENT ON TABLE meeting_sessions IS 'Stores active meeting sessions with timer state for pause/resume functionality';
COMMENT ON TABLE meeting_pause_events IS 'History of pause/resume events for meeting analytics';
COMMENT ON FUNCTION calculate_active_duration IS 'Calculates meeting duration excluding paused time';