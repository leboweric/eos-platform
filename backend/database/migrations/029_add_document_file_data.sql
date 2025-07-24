-- Add file_data column to documents table for storing files in PostgreSQL
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Make file_path nullable since we'll stop using it
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;

-- Add comment to indicate file_path is deprecated
COMMENT ON COLUMN documents.file_path IS 'DEPRECATED - Use file_data instead. This column will be removed in a future migration.';
COMMENT ON COLUMN documents.file_data IS 'Binary data of the uploaded file stored directly in PostgreSQL';