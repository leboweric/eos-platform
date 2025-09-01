-- Fix missing step_id column in process_attachments table
-- Run this in pgAdmin if you're getting "column step_id does not exist" errors

-- Add step_id column if it doesn't exist
ALTER TABLE process_attachments 
ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_process_attachments_step ON process_attachments(step_id);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'process_attachments' 
AND column_name = 'step_id';