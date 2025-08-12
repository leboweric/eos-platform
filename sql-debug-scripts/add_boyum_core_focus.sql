-- =====================================================
-- Add Core Focus (Hedgehog) for Boyum Barenscheer
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    blueprint_id UUID;
BEGIN
    -- Get the organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    -- Get the business blueprint (with team_id = NULL for org-level)
    SELECT id INTO blueprint_id
    FROM business_blueprints 
    WHERE organization_id = org_id 
    AND team_id IS NULL;  -- CRITICAL: Must be NULL for org-level
    
    IF blueprint_id IS NULL THEN
        RAISE EXCEPTION 'Business Blueprint not found. Run core values script first.';
    END IF;
    
    -- Double-check this blueprint belongs to Boyum Barenscheer
    IF NOT EXISTS (
        SELECT 1 FROM business_blueprints bb
        JOIN organizations o ON bb.organization_id = o.id
        WHERE bb.id = blueprint_id 
        AND o.slug = 'boyum-barenscheer'
    ) THEN
        RAISE EXCEPTION 'Blueprint does not belong to Boyum Barenscheer - aborting!';
    END IF;
    
    -- Check if core_focus already exists - DO NOT DELETE
    IF EXISTS (SELECT 1 FROM core_focus WHERE vto_id = blueprint_id) THEN
        RAISE NOTICE 'WARNING: Core Focus already exists for this blueprint!';
        RAISE EXCEPTION 'Stopping to prevent data loss - Core Focus already exists';
    END IF;
    
    -- Insert Core Focus (note: still uses vto_id column name)
    INSERT INTO core_focus (
        vto_id,  -- Still named vto_id even though it references business_blueprints
        purpose_cause_passion,
        niche,
        created_at,
        updated_at
    ) VALUES (
        blueprint_id,
        'We''re good listeners and go-to problem solvers.',
        'We provide simplified, understandable financial solutions.',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Core Focus Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Purpose/Cause/Passion: We''re good listeners and go-to problem solvers.';
    RAISE NOTICE 'Niche: We provide simplified, understandable financial solutions.';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the core focus was added
SELECT 
    cf.purpose_cause_passion,
    cf.niche,
    bb.name as blueprint_name,
    o.name as org_name
FROM core_focus cf
JOIN business_blueprints bb ON cf.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';