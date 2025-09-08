-- Add related_headline_id to issues table to track issues created from headlines
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS related_headline_id UUID REFERENCES headlines(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_issues_related_headline 
ON issues(related_headline_id) 
WHERE related_headline_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN issues.related_headline_id IS 'References the headline that this issue was created from during a Weekly Meeting';

-- Optional: Add a column to headlines to quickly check if it has a related issue
-- This avoids needing a join query to check if an issue exists
ALTER TABLE headlines
ADD COLUMN IF NOT EXISTS has_related_issue BOOLEAN DEFAULT FALSE;

-- Create an index for quick lookups
CREATE INDEX IF NOT EXISTS idx_headlines_has_issue 
ON headlines(has_related_issue) 
WHERE has_related_issue = TRUE;