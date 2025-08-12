-- =====================================================
-- Add Support for 'greater' (>) Comparison Operator
-- =====================================================

-- First, check the current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE '%comparison_operator%';

-- Drop the existing check constraint
ALTER TABLE scorecard_metrics 
DROP CONSTRAINT IF EXISTS scorecard_metrics_comparison_operator_check;

-- Add the new constraint that includes 'greater' and 'less'
ALTER TABLE scorecard_metrics 
ADD CONSTRAINT scorecard_metrics_comparison_operator_check 
CHECK (comparison_operator IN ('equal', 'greater', 'greater_equal', 'less', 'less_equal'));

-- Update any metrics that should use 'greater' instead of 'greater_equal'
-- For Boyum IT Team, update metrics that should be strictly greater than 0
BEGIN;

UPDATE scorecard_metrics
SET comparison_operator = 'greater'
WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
  AND goal = 0
  AND comparison_operator = 'greater_equal'
  AND name IN (
    'Automation - Completed',
    'Automation - In Progress', 
    'Automation - Suggestions',
    'CSAT - Positive',
    'FreshService IT Documents Created/Updated/Reviewed',
    'FreshService Staff Articles Created/Updated/Reviewed'
  );

COMMIT;

-- Verify the changes
SELECT 
    name,
    goal,
    comparison_operator,
    CASE comparison_operator
        WHEN 'greater' THEN CONCAT('> ', goal)
        WHEN 'greater_equal' THEN CONCAT('>= ', goal)
        WHEN 'less' THEN CONCAT('< ', goal)
        WHEN 'less_equal' THEN CONCAT('<= ', goal)
        WHEN 'equal' THEN CONCAT('= ', goal)
    END as goal_display
FROM scorecard_metrics
WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
ORDER BY name;