-- Migration: Add section-specific timing to meeting sessions
-- Purpose: Track time spent in each section of Level 10 meetings (Phase 2 of Ninety.io parity)
-- Author: AXP Development Team
-- Date: 2024-12-16

-- Add section timing fields to meeting_sessions table
ALTER TABLE meeting_sessions 
ADD COLUMN IF NOT EXISTS section_timings JSONB DEFAULT '{}';

-- Example section_timings structure:
-- {
--   "segue": { 
--     "allocated": 300,  -- 5 minutes in seconds
--     "started_at": "2024-01-15T10:00:00Z",
--     "ended_at": "2024-01-15T10:04:05Z",
--     "actual": 245,
--     "paused_duration": 0
--   },
--   "scorecard": { 
--     "allocated": 300,
--     "started_at": "2024-01-15T10:04:05Z",
--     "ended_at": "2024-01-15T10:11:05Z",
--     "actual": 420,
--     "overrun": 120,
--     "paused_duration": 0
--   },
--   "rock_review": { ... },
--   "headlines": { ... },
--   "todos": { ... },
--   "ids": { ... },
--   "conclude": { ... }
-- }

-- Add column for tracking section order and progress
ALTER TABLE meeting_sessions
ADD COLUMN IF NOT EXISTS sections_completed TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_allocated_time INTEGER DEFAULT 5400, -- 90 minutes in seconds
ADD COLUMN IF NOT EXISTS meeting_pace VARCHAR(20) DEFAULT 'on-track' CHECK (
  meeting_pace IN ('on-track', 'ahead', 'behind', 'critical')
);

-- Create a table for section configurations (can be customized per org/team)
CREATE TABLE IF NOT EXISTS meeting_section_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  meeting_type VARCHAR(50) NOT NULL,
  
  -- Section configuration as JSON for flexibility
  sections JSONB NOT NULL,
  -- Example:
  -- [
  --   {"id": "segue", "name": "Segue", "duration": 5, "icon": "Users", "order": 1},
  --   {"id": "scorecard", "name": "Scorecard", "duration": 5, "icon": "TrendingUp", "order": 2},
  --   {"id": "rock_review", "name": "Rock Review", "duration": 5, "icon": "Target", "order": 3},
  --   {"id": "headlines", "name": "Headlines", "duration": 5, "icon": "Newspaper", "order": 4},
  --   {"id": "todos", "name": "To-Do Review", "duration": 5, "icon": "CheckSquare", "order": 5},
  --   {"id": "ids", "name": "IDS", "duration": 60, "icon": "MessageSquare", "order": 6},
  --   {"id": "conclude", "name": "Conclude", "duration": 5, "icon": "CheckCircle", "order": 7}
  -- ]
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one default per meeting type per org/team
  UNIQUE(organization_id, team_id, meeting_type, is_default) 
  DEFERRABLE INITIALLY DEFERRED
);

-- Insert default Level 10 meeting configuration
INSERT INTO meeting_section_configs (
  organization_id, 
  team_id, 
  meeting_type, 
  sections, 
  is_default
)
SELECT DISTINCT
  organization_id,
  NULL, -- org-wide default
  'weekly',
  '[
    {"id": "segue", "name": "Segue", "duration": 5, "icon": "Users", "order": 1, "description": "Good news and wins from the past week"},
    {"id": "scorecard", "name": "Scorecard", "duration": 5, "icon": "TrendingUp", "order": 2, "description": "Review weekly metrics and KPIs"},
    {"id": "rock_review", "name": "Rock Review", "duration": 5, "icon": "Target", "order": 3, "description": "Check progress on quarterly priorities"},
    {"id": "headlines", "name": "Headlines", "duration": 5, "icon": "Newspaper", "order": 4, "description": "Share customer and employee headlines"},
    {"id": "todos", "name": "To-Do Review", "duration": 5, "icon": "CheckSquare", "order": 5, "description": "Review last week''s action items"},
    {"id": "ids", "name": "IDS", "duration": 60, "icon": "MessageSquare", "order": 6, "description": "Identify, Discuss, and Solve issues"},
    {"id": "conclude", "name": "Conclude", "duration": 5, "icon": "CheckCircle", "order": 7, "description": "Rate the meeting and cascade messages"}
  ]'::jsonb,
  true
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM meeting_section_configs msc 
  WHERE msc.organization_id = organizations.id 
    AND msc.meeting_type = 'weekly'
    AND msc.is_default = true
);

-- Function to calculate section duration with pause handling
CREATE OR REPLACE FUNCTION calculate_section_duration(
  section_data JSONB,
  current_paused_duration INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  started_at TIMESTAMP WITH TIME ZONE;
  ended_at TIMESTAMP WITH TIME ZONE;
  actual_duration INTEGER;
  section_paused_duration INTEGER;
BEGIN
  -- Get timestamps
  started_at := (section_data->>'started_at')::TIMESTAMP WITH TIME ZONE;
  ended_at := (section_data->>'ended_at')::TIMESTAMP WITH TIME ZONE;
  section_paused_duration := COALESCE((section_data->>'paused_duration')::INTEGER, 0);
  
  IF started_at IS NULL THEN
    RETURN 0;
  END IF;
  
  IF ended_at IS NULL THEN
    -- Section still in progress
    actual_duration := EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER;
  ELSE
    -- Section completed
    actual_duration := EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER;
  END IF;
  
  -- Subtract paused time
  actual_duration := actual_duration - section_paused_duration - current_paused_duration;
  
  RETURN GREATEST(actual_duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate meeting pace
CREATE OR REPLACE FUNCTION calculate_meeting_pace(session_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  session_record RECORD;
  total_allocated INTEGER;
  total_actual INTEGER;
  expected_progress INTEGER;
  current_section_order INTEGER;
  deviation_percentage NUMERIC;
BEGIN
  SELECT * INTO session_record FROM meeting_sessions WHERE id = session_id;
  
  IF session_record IS NULL THEN
    RETURN 'on-track';
  END IF;
  
  -- Calculate totals from section_timings
  SELECT 
    COALESCE(SUM((value->>'allocated')::INTEGER), 0),
    COALESCE(SUM((value->>'actual')::INTEGER), 0)
  INTO total_allocated, total_actual
  FROM jsonb_each(session_record.section_timings);
  
  IF total_allocated = 0 THEN
    RETURN 'on-track';
  END IF;
  
  -- Calculate deviation
  deviation_percentage := ((total_actual - total_allocated)::NUMERIC / total_allocated) * 100;
  
  -- Determine pace
  IF deviation_percentage > 20 THEN
    RETURN 'critical';
  ELSIF deviation_percentage > 10 THEN
    RETURN 'behind';
  ELSIF deviation_percentage < -5 THEN
    RETURN 'ahead';
  ELSE
    RETURN 'on-track';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add index for section timing queries
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_section_timings 
  ON meeting_sessions USING GIN (section_timings);

-- Add trigger to update meeting pace
CREATE OR REPLACE FUNCTION update_meeting_pace()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.section_timings IS DISTINCT FROM OLD.section_timings THEN
    NEW.meeting_pace := calculate_meeting_pace(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_meeting_pace_trigger ON meeting_sessions;
CREATE TRIGGER update_meeting_pace_trigger
  BEFORE UPDATE ON meeting_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_pace();

COMMENT ON COLUMN meeting_sessions.section_timings IS 'JSON object tracking time spent in each meeting section';
COMMENT ON COLUMN meeting_sessions.sections_completed IS 'Array of section IDs in the order they were completed';
COMMENT ON COLUMN meeting_sessions.meeting_pace IS 'Current meeting pace: on-track, ahead, behind, or critical';
COMMENT ON TABLE meeting_section_configs IS 'Configurable section definitions and time allocations for different meeting types';