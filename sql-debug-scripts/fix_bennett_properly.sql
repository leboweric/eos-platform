-- =====================================================
-- Properly fix Bennett's Leadership Team
-- Each org needs their own Leadership Team with is_leadership_team = true
-- The special UUID should NOT be reused!
-- =====================================================

BEGIN;

DO $$
DECLARE
    bennett_org_id UUID;
    bennett_leadership_id UUID;
BEGIN
    -- Get Bennett's organization ID
    SELECT id INTO bennett_org_id 
    FROM organizations 
    WHERE slug = 'bennett-material-handling';
    
    IF bennett_org_id IS NULL THEN
        RAISE EXCEPTION 'Bennett Material Handling organization not found';
    END IF;
    
    -- Check if Bennett already has a Leadership Team (with any UUID)
    SELECT id INTO bennett_leadership_id
    FROM teams
    WHERE organization_id = bennett_org_id
    AND (name = 'Leadership Team' OR is_leadership_team = true);
    
    IF bennett_leadership_id IS NULL THEN
        -- Create a NEW Leadership Team for Bennett with a regular UUID
        INSERT INTO teams (
            id,
            name,
            organization_id,
            is_leadership_team,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),  -- Regular UUID, NOT the special one!
            'Leadership Team',
            bennett_org_id,
            true,  -- This is what makes the 2-Page Plan menu appear!
            NOW(),
            NOW()
        ) RETURNING id INTO bennett_leadership_id;
        
        RAISE NOTICE 'Created new Leadership Team for Bennett with ID: %', bennett_leadership_id;
    ELSE
        -- Just ensure the flag is set
        UPDATE teams
        SET is_leadership_team = true
        WHERE id = bennett_leadership_id;
        
        RAISE NOTICE 'Updated existing Leadership Team for Bennett with ID: %', bennett_leadership_id;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bennett Leadership Team Fixed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The 2-Page Plan menu should now appear.';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the fix
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'bennett-material-handling'
AND t.is_leadership_team = true;