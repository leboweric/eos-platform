-- Add archived_at column to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Set archived_at for existing archived issues
UPDATE issues 
SET archived_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE archived = TRUE AND archived_at IS NULL;

-- Verify the update
SELECT COUNT(*) as archived_issues_fixed 
FROM issues 
WHERE archived = TRUE;
