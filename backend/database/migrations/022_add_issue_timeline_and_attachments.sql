-- Add timeline field to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS timeline VARCHAR(20) DEFAULT 'short_term' 
CHECK (timeline IN ('short_term', 'long_term'));

-- Add comment for the new column
COMMENT ON COLUMN issues.timeline IS 'Timeline for issue resolution: short_term (within this quarter) or long_term (next quarter)';

-- Create issue_attachments table with bytea for file storage
CREATE TABLE IF NOT EXISTS issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON issue_attachments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_timeline ON issues(timeline);

-- Add comments
COMMENT ON TABLE issue_attachments IS 'Stores file attachments for issues';
COMMENT ON COLUMN issue_attachments.file_data IS 'Binary data of the file stored directly in PostgreSQL';