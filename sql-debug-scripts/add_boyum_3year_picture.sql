-- =====================================================
-- Add 3-Year Picture for Boyum Barenscheer
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    blueprint_id UUID;
    three_year_id UUID;
    what_does_it_look_like TEXT;
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
    
    -- Build the "What Does It Look Like" as a JSON array (based on comment in migration)
    what_does_it_look_like := '[
        "Eighty percent of our clients have a minimum of 2 services per client for existing clients; 2 services for all new clients (1040 only work is not accepted unless connected to wealth management or another service line/opportunity)",
        "Career coaching program in place for staff",
        "Mastery of Karbon across the organization",
        "Partner as Bill Manager Reduction to no more than 10%",
        "Partner Comp Plan and Motivating Correct Action",
        "Industry and/or Service Specializations for Staff",
        "EOS successfully implemented firm-wide",
        "Partner Career Coaching Program in Place",
        "Training programs in place for cross-selling",
        "Rainmaker training program in place (including referral network)",
        "Profitability plan in place with bill managers held accountable",
        "LMA training program in place",
        "Core Processes documented and followed by all",
        "Bonus structure in place for admin managers",
        "Recognized Employer of Choice (Star Tribune)",
        "Wealth Management is viewed as part of BB",
        "Principles sign no returns or reports",
        "Principles cannot work more than 250 hours on their own book in first year of redemption",
        "Wealth Management transaction completed",
        "Admin assistant assigned to the three Department heads",
        "Optimize utilization by flattening revenue"
    ]';

    -- Check if 3-year picture already exists for this specific blueprint
    -- DO NOT delete - just update if it exists, insert if it doesn't
    IF EXISTS (SELECT 1 FROM three_year_pictures WHERE vto_id = blueprint_id) THEN
        RAISE NOTICE 'WARNING: 3-Year Picture already exists for this blueprint!';
        RAISE NOTICE 'To update, manually delete the existing one first';
        RAISE EXCEPTION 'Stopping to prevent data loss - 3-Year Picture already exists';
    END IF;
    
    -- Insert 3-Year Picture (note: combined revenue $32M + $10M = $42M)
    INSERT INTO three_year_pictures (
        vto_id,  -- Still named vto_id even though it references business_blueprints
        future_date,
        revenue_target,
        profit_target,
        profit_percentage,
        vision_description,
        what_does_it_look_like,  -- Check if this column exists
        created_at,
        updated_at
    ) VALUES (
        blueprint_id,
        '2028-12-31'::DATE,
        42000000,  -- $42M total revenue (32M BB + 10M WM)
        NULL,  -- Profit not specified
        NULL,  -- Profit percentage not specified
        'Boyum Revenue (Net): $32M, WM Revenue (Net): $10M',
        what_does_it_look_like,
        NOW(),
        NOW()
    ) RETURNING id INTO three_year_id;
    
    -- Note: If measurables need to be stored separately, we'd add them here
    -- But the main vision points are in the what_does_it_look_like field
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '3-Year Picture Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Future Date: December 31, 2028';
    RAISE NOTICE 'Revenue Target: $42M ($32M BB + $10M WM)';
    RAISE NOTICE 'Vision: 21 key initiatives documented';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the 3-year picture was added
SELECT 
    typ.future_date,
    typ.revenue_target,
    typ.vision_description,
    SUBSTRING(typ.what_does_it_look_like, 1, 100) || '...' as vision_preview,
    bb.name as blueprint_name,
    o.name as org_name
FROM three_year_pictures typ
JOIN business_blueprints bb ON typ.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';