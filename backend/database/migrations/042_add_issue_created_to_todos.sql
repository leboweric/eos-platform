-- Add issue_created flag to todos table to track if an issue has been automatically created for overdue todos
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS issue_created BOOLEAN DEFAULT FALSE;

-- Add index for performance when filtering todos that need issues created
CREATE INDEX IF NOT EXISTS idx_todos_issue_created 
ON todos(issue_created) 
WHERE issue_created = FALSE AND status NOT IN ('complete', 'cancelled');

-- Add comment explaining the column
COMMENT ON COLUMN todos.issue_created IS 'Tracks whether an issue has been automatically created for this overdue todo';