-- Add description column to scorecard_metrics table
ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN scorecard_metrics.description IS 'Optional description providing additional context for the metric, such as data source information';