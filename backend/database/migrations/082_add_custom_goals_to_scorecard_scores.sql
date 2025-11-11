-- Migration: Add custom goals support to scorecard_scores
-- Description: Allows setting custom goals for individual scorecard periods
-- Author: Manus AI
-- Date: 2025-11-11

-- Add custom goal columns to scorecard_scores table
ALTER TABLE scorecard_scores 
ADD COLUMN IF NOT EXISTS custom_goal DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS custom_goal_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS custom_goal_max DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS custom_goal_notes TEXT;

-- Add index for querying scores with custom goals
CREATE INDEX IF NOT EXISTS idx_scorecard_scores_custom_goal 
ON scorecard_scores(metric_id, week_date) 
WHERE custom_goal IS NOT NULL;

-- Add comments
COMMENT ON COLUMN scorecard_scores.custom_goal IS 'Custom goal override for this specific period (overrides metric default_goal)';
COMMENT ON COLUMN scorecard_scores.custom_goal_min IS 'Custom minimum goal for range-based metrics';
COMMENT ON COLUMN scorecard_scores.custom_goal_max IS 'Custom maximum goal for range-based metrics';
COMMENT ON COLUMN scorecard_scores.custom_goal_notes IS 'Optional notes explaining why this period has a custom goal';
