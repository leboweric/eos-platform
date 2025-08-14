-- Migration to add shared metrics functionality
-- Allows teams to create metrics that can be shared and used by other teams

-- Add columns to scorecard_metrics for sharing
ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by_team_id UUID REFERENCES teams(id),
ADD COLUMN IF NOT EXISTS shared_description TEXT,
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS calculation_method TEXT,
ADD COLUMN IF NOT EXISTS update_frequency VARCHAR(50);

-- Create table for team metric subscriptions
-- This tracks when a team subscribes to use another team's shared metric
CREATE TABLE IF NOT EXISTS team_metric_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The team that is subscribing to the metric
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- The original shared metric
  source_metric_id UUID NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  -- The subscribing team's copy of the metric (with their own goal)
  local_metric_id UUID NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  -- When the subscription was created
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Who initiated the subscription
  subscribed_by UUID REFERENCES users(id),
  -- Whether the subscription is active
  is_active BOOLEAN DEFAULT TRUE,
  -- Notes about why this metric was adopted
  subscription_notes TEXT,
  
  UNIQUE(team_id, source_metric_id)
);

-- Create a shared metrics library view for easier querying
CREATE OR REPLACE VIEW shared_metrics_library AS
SELECT 
  sm.id,
  sm.organization_id,
  sm.name,
  sm.description,
  sm.shared_description,
  sm.data_source,
  sm.calculation_method,
  sm.update_frequency,
  sm.type,
  sm.value_type,
  sm.comparison_operator,
  sm.goal,
  sm.owner,
  sm.created_by_team_id,
  t.name as created_by_team_name,
  sm.created_at,
  COUNT(DISTINCT tms.team_id) as subscriber_count
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.created_by_team_id = t.id
LEFT JOIN team_metric_subscriptions tms ON sm.id = tms.source_metric_id AND tms.is_active = TRUE
WHERE sm.is_shared = TRUE
GROUP BY 
  sm.id, sm.organization_id, sm.name, sm.description, sm.shared_description,
  sm.data_source, sm.calculation_method, sm.update_frequency,
  sm.type, sm.value_type, sm.comparison_operator, sm.goal, sm.owner,
  sm.created_by_team_id, t.name, sm.created_at;

-- Create indexes for performance
CREATE INDEX idx_scorecard_metrics_is_shared ON scorecard_metrics(is_shared) WHERE is_shared = TRUE;
CREATE INDEX idx_scorecard_metrics_created_by_team ON scorecard_metrics(created_by_team_id);
CREATE INDEX idx_team_metric_subscriptions_team ON team_metric_subscriptions(team_id);
CREATE INDEX idx_team_metric_subscriptions_source ON team_metric_subscriptions(source_metric_id);
CREATE INDEX idx_team_metric_subscriptions_active ON team_metric_subscriptions(is_active) WHERE is_active = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN scorecard_metrics.is_shared IS 'Whether this metric is shared with other teams';
COMMENT ON COLUMN scorecard_metrics.created_by_team_id IS 'The team that originally created and shared this metric';
COMMENT ON COLUMN scorecard_metrics.shared_description IS 'Detailed description for other teams on how to use this metric';
COMMENT ON COLUMN scorecard_metrics.data_source IS 'Where the data for this metric comes from';
COMMENT ON COLUMN scorecard_metrics.calculation_method IS 'How this metric is calculated';
COMMENT ON COLUMN scorecard_metrics.update_frequency IS 'How often this metric should be updated';

COMMENT ON TABLE team_metric_subscriptions IS 'Tracks which teams have subscribed to use shared metrics from other teams';
COMMENT ON VIEW shared_metrics_library IS 'View of all shared metrics available in the organization';