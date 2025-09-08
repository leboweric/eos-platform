-- Create todo_updates table to track updates on todos
CREATE TABLE IF NOT EXISTS todo_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_todo_updates_todo 
ON todo_updates(todo_id);

-- Create index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_todo_updates_created_at 
ON todo_updates(created_at DESC);

-- Add comment explaining the table
COMMENT ON TABLE todo_updates IS 'Stores updates and progress notes for todos';