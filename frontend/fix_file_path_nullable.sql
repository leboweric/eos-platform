-- Make file_path nullable since we're storing files in file_data column
-- Run this in pgAdmin on your Railway database

ALTER TABLE priority_attachments 
ALTER COLUMN file_path DROP NOT NULL;