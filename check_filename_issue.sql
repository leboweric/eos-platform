-- Check if file_name is properly stored in attachments

-- 1. Check all attachment filenames
SELECT 
    id,
    file_name,
    CASE 
        WHEN file_name IS NULL THEN 'NULL filename!'
        WHEN file_name = '' THEN 'EMPTY filename!'
        ELSE 'OK'
    END as filename_status,
    created_at
FROM priority_attachments
ORDER BY created_at DESC;

-- 2. Check if there's a pattern with the working vs non-working attachments
SELECT 
    id,
    file_name,
    mime_type,
    file_size,
    CASE 
        WHEN file_data IS NOT NULL THEN 'Has data'
        ELSE 'No data'
    END as data_status
FROM priority_attachments
WHERE file_data IS NOT NULL  -- Only check ones that have data
ORDER BY created_at DESC;

-- 3. Fix any NULL filenames (if found)
-- UPDATE priority_attachments 
-- SET file_name = 'document_' || id || '.pdf'
-- WHERE file_name IS NULL;