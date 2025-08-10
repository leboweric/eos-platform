-- =====================================================
-- Fix Organizations Missing Leadership Teams
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_record RECORD;
    new_team_id UUID;
BEGIN
    -- Find all organizations without a leadership team
    FOR org_record IN 
        SELECT o.id, o.name, o.slug
        FROM organizations o
        LEFT JOIN teams t ON t.organization_id = o.id AND t.is_leadership_team = true
        WHERE t.id IS NULL
    LOOP
        -- Create Leadership Team for this org
        new_team_id := gen_random_uuid();
        
        INSERT INTO teams (
            id,
            organization_id,
            name,
            description,
            is_leadership_team,
            created_at,
            updated_at
        ) VALUES (
            new_team_id,
            org_record.id,
            'Leadership Team',
            'Leadership team for ' || org_record.name,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created Leadership Team for % (ID: %)', org_record.name, new_team_id;
        
        -- Add any existing admin users to the Leadership Team
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        SELECT 
            new_team_id,
            u.id,
            'member',
            NOW()
        FROM users u
        WHERE u.organization_id = org_record.id
        AND u.role = 'admin'
        AND NOT EXISTS (
            SELECT 1 FROM team_members tm 
            WHERE tm.team_id = new_team_id 
            AND tm.user_id = u.id
        );
        
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Leadership Teams Created Successfully!';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify all orgs now have leadership teams
SELECT 
    o.name as org_name,
    o.slug,
    t.id as leadership_team_id,
    t.is_leadership_team,
    CASE 
        WHEN t.id = '00000000-0000-0000-0000-000000000000' THEN '⚠️ USING SPECIAL UUID'
        WHEN t.id IS NULL THEN '❌ STILL MISSING'
        ELSE '✅ UNIQUE UUID'
    END as status
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id AND t.is_leadership_team = true
ORDER BY 
    CASE 
        WHEN t.id IS NULL THEN 0
        WHEN t.id = '00000000-0000-0000-0000-000000000000' THEN 1
        ELSE 2
    END,
    o.name;