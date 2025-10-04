-- Add organization_id to scorecard_scores table for better query performance
-- This allows direct filtering by organization without joining through metrics

ALTER TABLE scorecard_scores 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from existing data
UPDATE scorecard_scores 
SET organization_id = sm.organization_id 
FROM scorecard_metrics sm 
WHERE scorecard_scores.metric_id = sm.id 
AND scorecard_scores.organization_id IS NULL;

-- Make the column NOT NULL after population
ALTER TABLE scorecard_scores 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scorecard_scores_org_week 
ON scorecard_scores(organization_id, week_date);

-- Add composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_scorecard_scores_org_metric_week 
ON scorecard_scores(organization_id, metric_id, week_date);