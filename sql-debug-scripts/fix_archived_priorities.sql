-- Check if deleted_at column exists in quarterly_priorities table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities' 
AND column_name = 'deleted_at';

-- If the above query returns no rows, run this to add the column:
ALTER TABLE quarterly_priorities
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_deleted_at 
ON quarterly_priorities(deleted_at) 
WHERE deleted_at IS NULL;

-- Check if you have any archived priorities (with deleted_at set)
SELECT 
    id, 
    title, 
    quarter, 
    year, 
    deleted_at,
    is_company_priority,
    team_id
FROM quarterly_priorities 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- If you have priorities that should be archived but deleted_at is NULL,
-- you can manually archive them by setting deleted_at
-- Example (uncomment and modify as needed):
/*
UPDATE quarterly_priorities 
SET deleted_at = NOW() 
WHERE id IN ('priority-id-1', 'priority-id-2');
*/