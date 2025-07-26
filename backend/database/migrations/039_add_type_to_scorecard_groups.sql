-- Add type field to scorecard_groups to allow separate groups for weekly/monthly views
ALTER TABLE scorecard_groups 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'both' CHECK (type IN ('weekly', 'monthly', 'both'));

-- Update existing groups to apply to both views
UPDATE scorecard_groups SET type = 'both' WHERE type IS NULL;

-- Add index for performance when filtering by type
CREATE INDEX IF NOT EXISTS idx_scorecard_groups_type ON scorecard_groups(type);