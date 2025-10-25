-- Migration: Create meeting_snapshots table for meeting history
-- Date: 2025-10-25
-- Purpose: Store archived meeting data for Meeting History feature

CREATE TABLE IF NOT EXISTS meeting_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    meeting_type VARCHAR(50),
    meeting_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    average_rating NUMERIC(3,1),
    facilitator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    snapshot_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_meeting_snapshots_org ON meeting_snapshots(organization_id);
CREATE INDEX idx_meeting_snapshots_team ON meeting_snapshots(team_id);
CREATE INDEX idx_meeting_snapshots_date ON meeting_snapshots(meeting_date DESC);
CREATE INDEX idx_meeting_snapshots_type ON meeting_snapshots(meeting_type);

-- Add unique constraint to prevent duplicate snapshots for same meeting
CREATE UNIQUE INDEX idx_meeting_snapshots_meeting_unique ON meeting_snapshots(meeting_id) WHERE meeting_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE meeting_snapshots IS 'Archived meeting history with full snapshot data';
COMMENT ON COLUMN meeting_snapshots.snapshot_data IS 'JSONB containing: issues, todos, headlines, notes, attendees, etc.';