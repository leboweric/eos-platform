-- Create scorecard_metrics table
CREATE TABLE IF NOT EXISTS scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  goal DECIMAL(10, 2) NOT NULL,
  owner VARCHAR(255),
  type VARCHAR(50) DEFAULT 'weekly' CHECK (type IN ('weekly', 'monthly', 'quarterly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create scorecard_scores table
CREATE TABLE IF NOT EXISTS scorecard_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  week_date DATE NOT NULL,
  value DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_id, week_date)
);

-- Create indexes for performance
CREATE INDEX idx_scorecard_metrics_org_team ON scorecard_metrics(organization_id, team_id);
CREATE INDEX idx_scorecard_scores_metric_week ON scorecard_scores(metric_id, week_date);

-- Add comments
COMMENT ON TABLE scorecard_metrics IS 'Stores scorecard metrics/KPIs for teams';
COMMENT ON TABLE scorecard_scores IS 'Stores weekly scores for scorecard metrics';
COMMENT ON COLUMN scorecard_metrics.type IS 'Frequency type: weekly, monthly, or quarterly';
COMMENT ON COLUMN scorecard_scores.week_date IS 'The Monday date of the week for this score';