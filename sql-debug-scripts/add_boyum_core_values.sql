-- =====================================================
-- Add Core Values for Boyum Barenscheer
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    vto_id UUID;
BEGIN
    -- Get the organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    -- Check if VTO exists, if not create it
    SELECT id INTO vto_id
    FROM vtos 
    WHERE organization_id = org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000';
    
    IF vto_id IS NULL THEN
        -- Create VTO for Leadership Team
        INSERT INTO vtos (
            organization_id,
            team_id,
            name,
            is_shared_with_all_teams,
            created_at,
            updated_at
        ) VALUES (
            org_id,
            '00000000-0000-0000-0000-000000000000'::uuid, -- Leadership Team ID
            'V/TO',
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO vto_id;
        
        RAISE NOTICE 'Created VTO for Boyum Barenscheer';
    END IF;
    
    -- Delete any existing core values for this VTO (in case of re-run)
    DELETE FROM core_values WHERE vto_id = vto_id;
    
    -- Insert Core Values
    INSERT INTO core_values (vto_id, value_text, description, display_order, created_at, updated_at)
    VALUES 
        (
            vto_id,
            'Caring & Thoughtful',
            'As a caring organization, we prioritize the well-being of our team, fostering a supportive and inclusive environment. Our commitment extends to making a positive impact on the communities we serve. We approach challenges with thoughtful consideration and a focus on long-term impact. Open communication and diverse perspectives drive our innovation and responsible decision-making.',
            1,
            NOW(),
            NOW()
        ),
        (
            vto_id,
            'Get Things Done',
            'We''re all about turning plans into results, no excuses. When we commit, we deliver—taking challenges in stride and finding solutions along the way. Teamwork is our engine, and clear communication keeps us on track. In the end, it''s not just about completing tasks; it''s about owning them and celebrating the journey of achievement.',
            2,
            NOW(),
            NOW()
        ),
        (
            vto_id,
            'Work with Purpose',
            'We believe that every action we take should be intentional and aligned with our greater mission. By working with purpose, we ensure that our efforts are not just tasks completed, but meaningful contributions to our customers, our firm, and our communities. We also understand that true purpose is achieved when our professional goals are harmonized with personal well-being, allowing us to bring our best selves to both work and life.',
            3,
            NOW(),
            NOW()
        );
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Core Values Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. Caring & Thoughtful';
    RAISE NOTICE '2. Get Things Done';
    RAISE NOTICE '3. Work with Purpose';
    RAISE NOTICE '========================================';

END $$;

COMMIT;