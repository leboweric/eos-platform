-- Add scorecard groups functionality
-- This migration adds the ability to organize scorecard metrics into groups

-- Create scorecard_groups table
CREATE TABLE IF NOT EXISTS scorecard_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scorecard_groups_org_team ON scorecard_groups(organization_id, team_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_groups_display_order ON scorecard_groups(display_order);

-- Add group_id and display_order to scorecard_metrics
ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES scorecard_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for group_id
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_group_id ON scorecard_metrics(group_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_display_order ON scorecard_metrics(display_order);

-- Update trigger for scorecard_groups
CREATE OR REPLACE FUNCTION update_scorecard_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scorecard_groups_updated_at
BEFORE UPDATE ON scorecard_groups
FOR EACH ROW
EXECUTE FUNCTION update_scorecard_groups_updated_at();