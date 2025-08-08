-- Add archived field to todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_archived ON todos(archived);
CREATE INDEX IF NOT EXISTS idx_todos_status_archived ON todos(status, archived);