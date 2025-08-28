-- Create table to track when meetings are concluded
-- This is used to schedule todo reminders 6 days after each meeting

CREATE TABLE IF NOT EXISTS meeting_conclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID,
  meeting_type VARCHAR(50) NOT NULL DEFAULT 'weekly', -- 'weekly', 'quarterly', etc.
  concluded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient queries
  CONSTRAINT unique_meeting_conclusion UNIQUE (organization_id, team_id, meeting_type, concluded_at)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_meeting_conclusions_concluded_at 
  ON meeting_conclusions(concluded_at);

CREATE INDEX IF NOT EXISTS idx_meeting_conclusions_org_team 
  ON meeting_conclusions(organization_id, team_id);

CREATE INDEX IF NOT EXISTS idx_meeting_conclusions_meeting_type 
  ON meeting_conclusions(meeting_type);

-- Add comment explaining the table's purpose
COMMENT ON TABLE meeting_conclusions IS 'Tracks when meetings are concluded to schedule todo reminders 6 days later';
COMMENT ON COLUMN meeting_conclusions.concluded_at IS 'When the meeting was concluded - used to calculate 6-day reminder schedule';