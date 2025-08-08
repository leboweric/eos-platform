-- Fix priority_attachments table to store files in database instead of filesystem
-- Run this in pgAdmin on your Railway database

-- First, check if the table exists and create it if not
CREATE TABLE IF NOT EXISTS priority_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_id UUID NOT NULL REFERENCES quarterly_priorities(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500), -- Keep for backward compatibility but don't use
  file_data BYTEA, -- Store actual file content here
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add file_data column if it doesn't exist
ALTER TABLE priority_attachments 
ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_priority_attachments_priority_id ON priority_attachments(priority_id);
CREATE INDEX IF NOT EXISTS idx_priority_attachments_uploaded_by ON priority_attachments(uploaded_by);

-- Add comment
COMMENT ON TABLE priority_attachments IS 'Stores file attachments for quarterly priorities';
COMMENT ON COLUMN priority_attachments.file_data IS 'Binary data of the uploaded file';