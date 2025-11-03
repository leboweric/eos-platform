-- Migration: Add is_active column to teams table
-- This enables the inactive toggle functionality on the Departments page

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for performance when filtering by active status
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- Add comment for documentation
COMMENT ON COLUMN teams.is_active IS 'Indicates whether the team/department is active. Inactive teams are hidden from most views.';

