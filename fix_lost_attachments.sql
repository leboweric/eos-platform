-- IMPORTANT: Railway Deployment File Loss Issue
-- ================================================
-- Files uploaded on Aug 6, 2025 were stored on the filesystem
-- and are now LOST due to Railway's ephemeral storage.
-- 
-- Newer files (after Aug 14) are correctly stored in the database.

-- 1. View the lost attachments
SELECT 
    id,
    file_name,
    priority_id,
    file_path,
    created_at,
    'LOST - File was on filesystem' as status
FROM priority_attachments
WHERE file_data IS NULL 
  AND file_path IS NOT NULL;

-- 2. Get details for Strategic Consulting's lost files
SELECT 
    pa.file_name,
    pa.created_at,
    qp.title as rock_title,
    u.first_name || ' ' || u.last_name as rock_owner
FROM priority_attachments pa
JOIN quarterly_priorities qp ON pa.priority_id = qp.id
LEFT JOIN users u ON qp.owner_id = u.id
WHERE pa.file_data IS NULL 
  AND pa.file_path IS NOT NULL
  AND qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 3. OPTION A: Remove the lost attachment records to stop 404 errors
-- (Users won't see broken download links)
/*
DELETE FROM priority_attachments
WHERE file_data IS NULL 
  AND file_path IS NOT NULL;
*/

-- 4. OPTION B: Mark them as lost (if you add a status column)
/*
ALTER TABLE priority_attachments ADD COLUMN IF NOT EXISTS status VARCHAR(50);

UPDATE priority_attachments
SET status = 'lost_on_redeploy'
WHERE file_data IS NULL 
  AND file_path IS NOT NULL;
*/

-- 5. Verify the upload fix is working (recent uploads use database)
SELECT 
    DATE(created_at) as upload_date,
    COUNT(*) as total_uploads,
    COUNT(file_data) as database_storage,
    COUNT(file_path) - COUNT(file_data) as filesystem_storage
FROM priority_attachments
GROUP BY DATE(created_at)
ORDER BY upload_date DESC;

-- RECOMMENDATION:
-- ================
-- The 3 lost files need to be re-uploaded by the users:
-- 1. "Draft transition plan developed and shared with L-team.docx"
-- 2. "Renae Transition Rock Timeline DRAFT.docx"  
-- 3. "US Bank Financing Processes.docx"
--
-- The upload code has already been fixed (as shown by Aug 14+ uploads),
-- so re-uploaded files will be safely stored in the database.