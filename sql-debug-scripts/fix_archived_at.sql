-- Fix archived issues that have NULL archived_at dates
-- Set archived_at to updated_at for archived issues missing the timestamp
UPDATE issues 
SET archived_at = COALESCE(archived_at, updated_at, CURRENT_TIMESTAMP)
WHERE archived = TRUE AND archived_at IS NULL;

-- Show count of fixed records
SELECT COUNT(*) as fixed_issues 
FROM issues 
WHERE archived = TRUE;
