-- Fix existing zero UUID records BEFORE adding constraints
-- Run this FIRST, then run the prevent_null_teamid_critical.sql

-- ===============================================
-- 1. First, identify which cascading message has the zero UUID
-- ===============================================

SELECT 
    cm.id,
    cm.organization_id,
    cm.from_team_id,
    cm.message,
    cm.meeting_date,
    cm.created_at,
    o.name as org_name
FROM cascading_messages cm
JOIN organizations o ON cm.organization_id = o.id
WHERE cm.from_team_id = '00000000-0000-0000-0000-000000000000';

-- ===============================================
-- 2. Find the correct team to assign it to
-- ===============================================

-- Check what organization this message belongs to and find its leadership team
SELECT 
    cm.organization_id,
    o.name as org_name,
    t.id as leadership_team_id,
    t.name as leadership_team_name
FROM cascading_messages cm
JOIN organizations o ON cm.organization_id = o.id
LEFT JOIN teams t ON t.organization_id = cm.organization_id AND t.is_leadership_team = true
WHERE cm.from_team_id = '00000000-0000-0000-0000-000000000000';

-- ===============================================
-- 3. Update the cascading message to use the correct team
-- ===============================================

-- First, let's see what we'll be updating (DRY RUN)
WITH fix_data AS (
    SELECT 
        cm.id as message_id,
        cm.organization_id,
        cm.from_team_id as old_team_id,
        t.id as new_team_id,
        t.name as new_team_name,
        o.name as org_name
    FROM cascading_messages cm
    JOIN organizations o ON cm.organization_id = o.id
    LEFT JOIN teams t ON t.organization_id = cm.organization_id AND t.is_leadership_team = true
    WHERE cm.from_team_id = '00000000-0000-0000-0000-000000000000'
)
SELECT * FROM fix_data;

-- ===============================================
-- 4. ACTUAL FIX - Run this after verifying above looks correct
-- ===============================================

-- Update the cascading message to use the organization's leadership team
UPDATE cascading_messages cm
SET from_team_id = (
    SELECT t.id 
    FROM teams t 
    WHERE t.organization_id = cm.organization_id 
    AND t.is_leadership_team = true 
    LIMIT 1
)
WHERE cm.from_team_id = '00000000-0000-0000-0000-000000000000'
AND EXISTS (
    SELECT 1 
    FROM teams t 
    WHERE t.organization_id = cm.organization_id 
    AND t.is_leadership_team = true
);

-- Verify the fix worked
SELECT COUNT(*) as remaining_zero_uuid_messages
FROM cascading_messages 
WHERE from_team_id = '00000000-0000-0000-0000-000000000000';

-- Should return 0

-- ===============================================
-- 5. Also check and fix cascading_message_recipients if needed
-- ===============================================

-- Check if any recipients have zero UUID
SELECT COUNT(*) as zero_uuid_recipients
FROM cascading_message_recipients
WHERE to_team_id = '00000000-0000-0000-0000-000000000000';

-- If above returns > 0, fix them too:
UPDATE cascading_message_recipients cmr
SET to_team_id = (
    SELECT t.id 
    FROM cascading_messages cm
    JOIN teams t ON t.organization_id = cm.organization_id AND t.is_leadership_team = true
    WHERE cm.id = cmr.message_id
    LIMIT 1
)
WHERE cmr.to_team_id = '00000000-0000-0000-0000-000000000000'
AND EXISTS (
    SELECT 1 
    FROM cascading_messages cm
    JOIN teams t ON t.organization_id = cm.organization_id AND t.is_leadership_team = true
    WHERE cm.id = cmr.message_id
);

-- ===============================================
-- 6. Final verification - all should return 0
-- ===============================================

SELECT 
    'cascading_messages' as table_name,
    COUNT(*) as zero_uuid_count
FROM cascading_messages 
WHERE from_team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 
    'cascading_message_recipients',
    COUNT(*)
FROM cascading_message_recipients
WHERE to_team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 
    'quarterly_priorities',
    COUNT(*)
FROM quarterly_priorities
WHERE team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 
    'issues',
    COUNT(*)
FROM issues
WHERE team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 
    'todos',
    COUNT(*)
FROM todos
WHERE team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 
    'scorecard_metrics',
    COUNT(*)
FROM scorecard_metrics
WHERE team_id = '00000000-0000-0000-0000-000000000000';

-- ===============================================
-- After all counts are 0, you can safely run prevent_null_teamid_critical.sql
-- ===============================================