-- Store todo attachment binary data in PostgreSQL (not filesystem)
ALTER TABLE todo_attachments ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- file_path is deprecated; kept for backward compatibility with existing rows
COMMENT ON COLUMN todo_attachments.file_data IS 'Binary data of the uploaded file stored directly in PostgreSQL';
COMMENT ON COLUMN todo_attachments.file_path IS 'DEPRECATED - Use file_data instead';