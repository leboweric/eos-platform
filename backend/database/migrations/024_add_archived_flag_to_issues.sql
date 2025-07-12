-- Add archived flag to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of non-archived issues
CREATE INDEX IF NOT EXISTS idx_issues_archived 
ON issues(organization_id, archived, timeline);

-- Add comment
COMMENT ON COLUMN issues.archived IS 'Flag to indicate if the issue has been archived. Archived issues are hidden from normal views.';