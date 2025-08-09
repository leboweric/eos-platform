-- Create issue_updates table to track updates on issues
CREATE TABLE IF NOT EXISTS issue_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_issue_updates_issue 
ON issue_updates(issue_id);

-- Create index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_issue_updates_created_at 
ON issue_updates(created_at DESC);

-- Add comment explaining the table
COMMENT ON TABLE issue_updates IS 'Stores updates and progress notes for issues';