-- Migration: Create annual_planning_goals table
-- Purpose: Store 2026+ goals separately from VTO during Annual Planning meetings
-- Date: 2025-10-29

CREATE TABLE IF NOT EXISTS annual_planning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  planning_year INTEGER NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique planning goals per organization/team/year
  CONSTRAINT unique_planning_goals_per_team_year 
    UNIQUE (organization_id, team_id, planning_year)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_annual_planning_goals_org_team_year 
  ON annual_planning_goals(organization_id, team_id, planning_year);

CREATE INDEX IF NOT EXISTS idx_annual_planning_goals_status 
  ON annual_planning_goals(status);

CREATE INDEX IF NOT EXISTS idx_annual_planning_goals_year 
  ON annual_planning_goals(planning_year);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_annual_planning_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annual_planning_goals_updated_at
  BEFORE UPDATE ON annual_planning_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_annual_planning_goals_updated_at();

-- Add comments for documentation
COMMENT ON TABLE annual_planning_goals IS 'Stores planning goals for future years during Annual Planning meetings';
COMMENT ON COLUMN annual_planning_goals.planning_year IS 'The year being planned for (e.g., 2026 when planning in October 2025)';
COMMENT ON COLUMN annual_planning_goals.goals IS 'Array of goal objects in JSON format';
COMMENT ON COLUMN annual_planning_goals.status IS 'draft=being planned, approved=finalized, archived=migrated to VTO';