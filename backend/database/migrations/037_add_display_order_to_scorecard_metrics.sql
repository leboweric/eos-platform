-- Add display_order column to scorecard_metrics table for custom ordering
ALTER TABLE scorecard_metrics 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing metrics to have sequential display_order based on creation order
WITH ordered_metrics AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id, team_id ORDER BY created_at) - 1 as new_order
  FROM scorecard_metrics
)
UPDATE scorecard_metrics sm
SET display_order = om.new_order
FROM ordered_metrics om
WHERE sm.id = om.id;

-- Add index for performance
CREATE INDEX idx_scorecard_metrics_display_order ON scorecard_metrics(organization_id, team_id, display_order);

-- Add comment
COMMENT ON COLUMN scorecard_metrics.display_order IS 'Custom display order for metrics (0-based)';