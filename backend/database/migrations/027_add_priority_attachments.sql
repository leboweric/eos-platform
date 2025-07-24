-- Add attachments support for quarterly priorities
CREATE TABLE IF NOT EXISTS priority_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  priority_id UUID NOT NULL REFERENCES quarterly_priorities(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_priority_attachments_priority_id ON priority_attachments(priority_id);
CREATE INDEX IF NOT EXISTS idx_priority_attachments_uploaded_by ON priority_attachments(uploaded_by);

COMMENT ON TABLE priority_attachments IS 'Stores file attachments for quarterly priorities';