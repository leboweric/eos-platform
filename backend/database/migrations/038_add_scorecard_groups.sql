-- Create scorecard_groups table
CREATE TABLE IF NOT EXISTS scorecard_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
  is_expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add group_id to scorecard_metrics
ALTER TABLE scorecard_metrics 
ADD COLUMN group_id UUID REFERENCES scorecard_groups(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_scorecard_groups_org_team ON scorecard_groups(organization_id, team_id);
CREATE INDEX idx_scorecard_metrics_group ON scorecard_metrics(group_id);

-- Add comments
COMMENT ON TABLE scorecard_groups IS 'Groups for organizing scorecard metrics (e.g., Parts, Service, Sales)';
COMMENT ON COLUMN scorecard_groups.color IS 'Hex color for group header (e.g., #3B82F6)';
COMMENT ON COLUMN scorecard_groups.is_expanded IS 'Whether the group is expanded or collapsed in UI';
COMMENT ON COLUMN scorecard_metrics.group_id IS 'Optional group this metric belongs to';