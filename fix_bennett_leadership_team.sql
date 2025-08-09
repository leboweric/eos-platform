-- =====================================================
-- Fix Bennett Material Handling's Leadership Team
-- =====================================================

BEGIN;

DO $$
DECLARE
    bennett_org_id UUID;
BEGIN
    -- Get Bennett's organization ID
    SELECT id INTO bennett_org_id 
    FROM organizations 
    WHERE slug = 'bennett-material-handling';
    
    IF bennett_org_id IS NULL THEN
        RAISE EXCEPTION 'Bennett Material Handling organization not found';
    END IF;
    
    -- The problem: The special Leadership Team UUID is SHARED across all orgs
    -- When we created Boyum's Leadership Team, it overwrote Bennett's
    
    -- Fix: Update the Leadership Team record to point back to Bennett
    UPDATE teams 
    SET 
        organization_id = bennett_org_id,
        is_leadership_team = true,
        name = 'Leadership Team'
    WHERE id = '00000000-0000-0000-0000-000000000000';
    
    -- Wait, this will break Boyum! We need a different approach...
    RAISE EXCEPTION 'STOP - This approach will break Boyum. Need a different solution!';

END $$;

ROLLBACK;

-- =====================================================
-- The REAL problem: 
-- The special UUID '00000000-0000-0000-0000-000000000000' can only belong to ONE organization!
-- This is a fundamental design flaw in the database.
-- 
-- We need to check which org currently owns it:
-- =====================================================

SELECT 
    t.id as team_id,
    t.name as team_name,
    t.organization_id,
    o.name as org_name,
    o.slug as org_slug,
    t.is_leadership_team
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.id = '00000000-0000-0000-0000-000000000000';