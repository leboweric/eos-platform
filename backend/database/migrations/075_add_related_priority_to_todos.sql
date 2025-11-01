-- Add related_priority_id to todos table to track todos created from rocks
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS related_priority_id UUID REFERENCES quarterly_priorities(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_todos_related_priority 
ON todos(related_priority_id) 
WHERE related_priority_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN todos.related_priority_id IS 'References the quarterly priority (rock) that this todo was created from';