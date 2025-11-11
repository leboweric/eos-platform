-- Migration: Add support for organization-level shared metrics with team visibility control
-- Purpose: Allow admins to create shared metrics that can be selectively visible to specific teams
-- Created: 2024-11-10

-- Add column to track which teams can see this shared metric
-- NULL or empty array = visible to all teams
-- Non-empty array = visible only to specified teams
ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS visible_to_teams UUID[] DEFAULT NULL;

-- Add column to distinguish org-level shared metrics from team-owned shared metrics
-- TRUE = organization-level (managed by admin)
-- FALSE/NULL = team-owned (existing behavior)
ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS is_org_level BOOLEAN DEFAULT FALSE;

-- Make team_id nullable to support org-level metrics
ALTER TABLE scorecard_metrics 
ALTER COLUMN team_id DROP NOT NULL;

-- Create index for faster queries on org-level shared metrics
CREATE INDEX idx_scorecard_metrics_org_level ON scorecard_metrics(organization_id, is_org_level) 
WHERE is_org_level = TRUE;

-- Create index for team visibility queries
CREATE INDEX idx_scorecard_metrics_visible_teams ON scorecard_metrics 
USING GIN (visible_to_teams)
WHERE visible_to_teams IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN scorecard_metrics.visible_to_teams IS 'Array of team UUIDs that can see this shared metric. NULL = visible to all teams.';
COMMENT ON COLUMN scorecard_metrics.is_org_level IS 'Whether this is an organization-level shared metric (managed by admin) vs team-owned shared metric';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scorecard_metrics TO PUBLIC;
