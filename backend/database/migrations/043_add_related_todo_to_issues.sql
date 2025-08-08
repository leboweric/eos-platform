-- Add related_todo_id to issues table to track issues created from todos
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS related_todo_id UUID REFERENCES todos(id) ON DELETE SET NULL;

-- Add priority_level column if it doesn't exist
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high'));

-- Add unique constraint to prevent duplicate issues for the same todo
-- Use IF NOT EXISTS to avoid error if constraint already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_todo_issue') THEN
        ALTER TABLE issues ADD CONSTRAINT unique_todo_issue UNIQUE (related_todo_id);
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_issues_related_todo 
ON issues(related_todo_id) 
WHERE related_todo_id IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN issues.related_todo_id IS 'References the todo that this issue was automatically created from';
COMMENT ON COLUMN issues.priority_level IS 'Priority level of the issue (low, normal, high)';