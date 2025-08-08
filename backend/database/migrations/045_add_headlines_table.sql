-- Create headlines table for Weekly Accountability Meeting
CREATE TABLE IF NOT EXISTS headlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'employee')),
  text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  meeting_date DATE DEFAULT CURRENT_DATE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_headlines_organization ON headlines(organization_id);
CREATE INDEX IF NOT EXISTS idx_headlines_team ON headlines(team_id);
CREATE INDEX IF NOT EXISTS idx_headlines_type ON headlines(type);
CREATE INDEX IF NOT EXISTS idx_headlines_created_by ON headlines(created_by);
CREATE INDEX IF NOT EXISTS idx_headlines_archived ON headlines(archived);
CREATE INDEX IF NOT EXISTS idx_headlines_meeting_date ON headlines(meeting_date);

-- Add comment for documentation
COMMENT ON TABLE headlines IS 'Stores customer and employee headlines for Weekly Accountability Meetings';
COMMENT ON COLUMN headlines.type IS 'Type of headline: customer or employee';
COMMENT ON COLUMN headlines.archived IS 'Whether the headline has been archived after the meeting';
COMMENT ON COLUMN headlines.meeting_date IS 'Date when the headline was created/discussed';