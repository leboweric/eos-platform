-- Check attachment storage for the failing downloads
-- Strategic Consulting & Coaching's priority attachment

-- 1. Check the attachment records
SELECT 
    id,
    priority_id,
    file_name,
    file_path,
    CASE 
        WHEN file_data IS NULL THEN 'NO DATA'
        ELSE 'Has data (' || length(file_data) || ' bytes)'
    END as data_status,
    file_size,
    mime_type,
    created_at
FROM priority_attachments
WHERE priority_id = '3f4ca402-1179-4e35-9b41-89f3bc974592'
   OR id IN ('6ea39994-19cc-47f8-b89d-8a0395d52541', '0c84b3d2-400e-4e88-9f2e-9a769ad01ea5');

-- 2. Check if ANY priority attachments have file_data
SELECT 
    COUNT(*) as total_attachments,
    COUNT(file_data) as with_data,
    COUNT(file_path) as with_path,
    COUNT(CASE WHEN file_data IS NULL AND file_path IS NOT NULL THEN 1 END) as path_only
FROM priority_attachments;

-- 3. Get sample of recent attachments to see storage pattern
SELECT 
    id,
    file_name,
    CASE 
        WHEN file_data IS NOT NULL THEN 'Database'
        WHEN file_path IS NOT NULL THEN 'Filesystem'
        ELSE 'Unknown'
    END as storage_type,
    created_at
FROM priority_attachments
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if this is a Railway deployment issue
-- Files stored on filesystem are lost on Railway redeploy
SELECT 
    'WARNING: ' || COUNT(*) || ' attachments use file_path (filesystem) storage which breaks on Railway!' as issue
FROM priority_attachments
WHERE file_path IS NOT NULL AND file_data IS NULL;