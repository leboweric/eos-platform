-- Add related_priority_id to issues table to track issues created from incomplete priorities
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS related_priority_id UUID REFERENCES quarterly_priorities(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_issues_related_priority 
ON issues(related_priority_id) 
WHERE related_priority_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN issues.related_priority_id IS 'References the quarterly priority that this issue was created from (for incomplete priorities converted to issues)';