-- Create todo attachments table
CREATE TABLE IF NOT EXISTS todo_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_todo_attachments_todo_id ON todo_attachments(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_attachments_uploaded_by ON todo_attachments(uploaded_by);

COMMENT ON TABLE todo_attachments IS 'Stores file attachments for todos';