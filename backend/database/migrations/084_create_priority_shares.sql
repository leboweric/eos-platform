-- Create priority_shares table for cross-team rock visibility
-- Allows users to manually share their rocks with other teams

CREATE TABLE IF NOT EXISTS priority_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    priority_id UUID NOT NULL REFERENCES quarterly_priorities(id) ON DELETE CASCADE,
    shared_with_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(priority_id, shared_with_team_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_priority_shares_priority 
ON priority_shares(priority_id);

CREATE INDEX IF NOT EXISTS idx_priority_shares_team 
ON priority_shares(shared_with_team_id);

-- Add comment for documentation
COMMENT ON TABLE priority_shares IS 'Tracks which teams have access to view specific quarterly priorities (rocks). Follows "allow nothing by default" principle - rocks are only visible to other teams when explicitly shared.';
COMMENT ON COLUMN priority_shares.priority_id IS 'The rock being shared';
COMMENT ON COLUMN priority_shares.shared_with_team_id IS 'The team that can view this rock';
COMMENT ON COLUMN priority_shares.shared_by IS 'The user who shared the rock';
