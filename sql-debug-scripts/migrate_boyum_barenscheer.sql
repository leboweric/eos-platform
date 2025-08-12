-- =====================================================
-- Migration Script: Boyum Barenscheer from Ninety.io
-- =====================================================
-- This script creates the Boyum Barenscheer organization with all teams and users
-- Default password for all users: Abc123!@#

-- First, clean up any failed attempts
ROLLBACK;

-- Check if organization already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM organizations WHERE slug = 'boyum-barenscheer') THEN
        RAISE NOTICE 'Organization already exists. Deleting old data...';
        DELETE FROM organizations WHERE slug = 'boyum-barenscheer';
    END IF;
END $$;

BEGIN;

-- Create everything in a single DO block
DO $$
DECLARE
    org_id UUID := gen_random_uuid();
    leadership_team_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
    password_hash VARCHAR := '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq'; -- Abc123!@#
    
    -- User IDs
    charlie_id UUID := gen_random_uuid();
    chris_id UUID := gen_random_uuid();
    stacy_id UUID := gen_random_uuid();
    tim_id UUID := gen_random_uuid();
    travis_id UUID := gen_random_uuid();
    eric_id UUID := gen_random_uuid();
    
    -- Team IDs
    team_lt_id UUID := gen_random_uuid();
    team_project_id UUID := gen_random_uuid();
    team_private_id UUID := gen_random_uuid();
    team_aa_it_focus_id UUID := gen_random_uuid();
    team_aa_managers_id UUID := gen_random_uuid();
    team_aa_partners_id UUID := gen_random_uuid();
    team_aa_senior_council_id UUID := gen_random_uuid();
    team_admin_leadership_id UUID := gen_random_uuid();
    team_admin_team_id UUID := gen_random_uuid();
    team_bas_managers_id UUID := gen_random_uuid();
    team_bas_partners_id UUID := gen_random_uuid();
    team_bas_staff_id UUID := gen_random_uuid();
    team_bas_tax_id UUID := gen_random_uuid();
    team_boost_id UUID := gen_random_uuid();
    team_cas_leadership_id UUID := gen_random_uuid();
    team_cas_team_id UUID := gen_random_uuid();
    team_executive_id UUID := gen_random_uuid();
    team_finance_id UUID := gen_random_uuid();
    team_hr_id UUID := gen_random_uuid();
    team_ig_construction_id UUID := gen_random_uuid();
    team_ig_manufacturing_id UUID := gen_random_uuid();
    team_ig_nonprofit_id UUID := gen_random_uuid();
    team_ig_salons_id UUID := gen_random_uuid();
    team_innovation_id UUID := gen_random_uuid();
    team_it_bas_cas_focus_id UUID := gen_random_uuid();
    team_it_team_id UUID := gen_random_uuid();
    team_it_tax_focus_id UUID := gen_random_uuid();
    team_karbon_id UUID := gen_random_uuid();
    team_marketing_id UUID := gen_random_uuid();
    team_ninety_training_id UUID := gen_random_uuid();
    team_operations_id UUID := gen_random_uuid();
    team_partners_id UUID := gen_random_uuid();
    team_tax_managers_id UUID := gen_random_uuid();
    team_tax_partners_id UUID := gen_random_uuid();
    team_tax_staff_id UUID := gen_random_uuid();
    team_training_id UUID := gen_random_uuid();
    team_wealth_mgmt_id UUID := gen_random_uuid();
    team_wm_bb_hwa_id UUID := gen_random_uuid();
    
BEGIN
    -- 1. Create the Organization
    INSERT INTO organizations (
        id,
        name,
        slug,
        settings,
        subscription_tier,
        created_at,
        updated_at
    ) VALUES (
        org_id,
        'Boyum Barenscheer',
        'boyum-barenscheer',
        '{"industry": "Professional Services", "employee_count": 100}'::jsonb,
        'professional',
        NOW(),
        NOW()
    );

    -- 2. Create the Leadership Team (special team)
    INSERT INTO teams (
        id,
        name,
        organization_id,
        is_leadership_team,
        created_at,
        updated_at
    ) VALUES (
        leadership_team_id,
        'Leadership Team',
        org_id,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE 
    SET organization_id = org_id,
        is_leadership_team = true,
        name = 'Leadership Team';

    -- 3. Create all other teams/departments
    INSERT INTO teams (id, name, organization_id, is_leadership_team, created_at, updated_at)
    VALUES 
        (team_lt_id, 'LT', org_id, false, NOW(), NOW()),
        (team_project_id, 'Project', org_id, false, NOW(), NOW()),
        (team_private_id, 'Private', org_id, false, NOW(), NOW()),
        (team_aa_it_focus_id, 'A&A IT Focus Group', org_id, false, NOW(), NOW()),
        (team_aa_managers_id, 'A&A Managers', org_id, false, NOW(), NOW()),
        (team_aa_partners_id, 'A&A Partners', org_id, false, NOW(), NOW()),
        (team_aa_senior_council_id, 'A&A Senior II Council', org_id, false, NOW(), NOW()),
        (team_admin_leadership_id, 'Admin Leadership', org_id, false, NOW(), NOW()),
        (team_admin_team_id, 'Admin Team', org_id, false, NOW(), NOW()),
        (team_bas_managers_id, 'BAS Managers', org_id, false, NOW(), NOW()),
        (team_bas_partners_id, 'BAS Partners', org_id, false, NOW(), NOW()),
        (team_bas_staff_id, 'BAS Staff', org_id, false, NOW(), NOW()),
        (team_bas_tax_id, 'BAS-TAX', org_id, false, NOW(), NOW()),
        (team_boost_id, 'Boost', org_id, false, NOW(), NOW()),
        (team_cas_leadership_id, 'CAS Leadership', org_id, false, NOW(), NOW()),
        (team_cas_team_id, 'CAS Team', org_id, false, NOW(), NOW()),
        (team_executive_id, 'Executive', org_id, false, NOW(), NOW()),
        (team_finance_id, 'Finance Team', org_id, false, NOW(), NOW()),
        (team_hr_id, 'HR Team', org_id, false, NOW(), NOW()),
        (team_ig_construction_id, 'Industry Group - Construction & Engineering', org_id, false, NOW(), NOW()),
        (team_ig_manufacturing_id, 'Industry Group - Manufacturing & Dist', org_id, false, NOW(), NOW()),
        (team_ig_nonprofit_id, 'Industry Group - Nonprofit', org_id, false, NOW(), NOW()),
        (team_ig_salons_id, 'Industry Group - Salons', org_id, false, NOW(), NOW()),
        (team_innovation_id, 'Innovation Team', org_id, false, NOW(), NOW()),
        (team_it_bas_cas_focus_id, 'IT - BAS/CAS Focus Group', org_id, false, NOW(), NOW()),
        (team_it_team_id, 'IT Team', org_id, false, NOW(), NOW()),
        (team_it_tax_focus_id, 'IT-Tax Focus Group', org_id, false, NOW(), NOW()),
        (team_karbon_id, 'Karbon Implementation', org_id, false, NOW(), NOW()),
        (team_marketing_id, 'Marketing', org_id, false, NOW(), NOW()),
        (team_ninety_training_id, 'Ninety.io Training', org_id, false, NOW(), NOW()),
        (team_operations_id, 'Operations Team', org_id, false, NOW(), NOW()),
        (team_partners_id, 'Partners', org_id, false, NOW(), NOW()),
        (team_tax_managers_id, 'Tax Managers', org_id, false, NOW(), NOW()),
        (team_tax_partners_id, 'Tax Partners', org_id, false, NOW(), NOW()),
        (team_tax_staff_id, 'Tax Staff', org_id, false, NOW(), NOW()),
        (team_training_id, 'Training', org_id, false, NOW(), NOW()),
        (team_wealth_mgmt_id, 'Wealth Management', org_id, false, NOW(), NOW()),
        (team_wm_bb_hwa_id, 'WM BB-HWA Project Team', org_id, false, NOW(), NOW());

    -- 4. Create Leadership Team Users
    -- Charlie Metzig (Regular member)
    INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, organization_id, 
        created_at, updated_at
    ) VALUES (
        charlie_id,
        'cmetzig@myboyum.com',
        password_hash,
        'Charlie',
        'Metzig',
        'member',
        org_id,
        NOW(),
        NOW()
    );

    -- Chris Wittich (Regular member)
    INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, organization_id, 
        created_at, updated_at
    ) VALUES (
        chris_id,
        'cwittich@myboyum.com',
        password_hash,
        'Chris',
        'Wittich',
        'member',
        org_id,
        NOW(),
        NOW()
    );

    -- Stacy Shaw (Regular member)
    INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, organization_id, 
        created_at, updated_at
    ) VALUES (
        stacy_id,
        'sshaw@myboyum.com',
        password_hash,
        'Stacy',
        'Shaw',
        'member',
        org_id,
        NOW(),
        NOW()
    );

    -- Tim Haag (Admin)
    INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, organization_id, 
        created_at, updated_at
    ) VALUES (
        tim_id,
        'thaag@myboyum.com',
        password_hash,
        'Tim',
        'Haag',
        'admin',
        org_id,
        NOW(),
        NOW()
    );

    -- Travis Noe (Admin)
    INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, organization_id, 
        created_at, updated_at
    ) VALUES (
        travis_id,
        'tnoe@myboyum.com',
        password_hash,
        'Travis',
        'Noe',
        'admin',
        org_id,
        NOW(),
        NOW()
    );

    -- Eric LeBow (Admin)
    INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, organization_id, 
        created_at, updated_at
    ) VALUES (
        eric_id,
        'elebow@myboyum.com',
        password_hash,
        'Eric',
        'LeBow',
        'admin',
        org_id,
        NOW(),
        NOW()
    );

    -- 5. Add all users to team_members table for Leadership Team
    INSERT INTO team_members (id, user_id, team_id, role, joined_at)
    VALUES 
        (gen_random_uuid(), charlie_id, leadership_team_id, 'member', NOW()),
        (gen_random_uuid(), chris_id, leadership_team_id, 'member', NOW()),
        (gen_random_uuid(), stacy_id, leadership_team_id, 'member', NOW()),
        (gen_random_uuid(), tim_id, leadership_team_id, 'member', NOW()),
        (gen_random_uuid(), travis_id, leadership_team_id, 'member', NOW()),
        (gen_random_uuid(), eric_id, leadership_team_id, 'member', NOW());

    -- 6. Initialize VTO (simplified - just create the main VTO record)
    INSERT INTO vtos (
        id,
        organization_id,
        team_id,
        name,
        is_shared_with_all_teams,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        org_id,
        leadership_team_id,
        'V/TO',
        true,
        NOW(),
        NOW()
    );

    -- Note: Core values, targets, etc. will need to be added separately

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Boyum Barenscheer Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization: Boyum Barenscheer';
    RAISE NOTICE 'Teams Created: 39 (including Leadership Team)';
    RAISE NOTICE '';
    RAISE NOTICE 'Leadership Team Members (6):';
    RAISE NOTICE '  - Charlie Metzig (cmetzig@myboyum.com)';
    RAISE NOTICE '  - Chris Wittich (cwittich@myboyum.com)';
    RAISE NOTICE '  - Stacy Shaw (sshaw@myboyum.com)';
    RAISE NOTICE '  - Tim Haag [ADMIN] (thaag@myboyum.com)';
    RAISE NOTICE '  - Travis Noe [ADMIN] (tnoe@myboyum.com)';
    RAISE NOTICE '  - Eric LeBow [ADMIN] (elebow@myboyum.com)';
    RAISE NOTICE '';
    RAISE NOTICE 'Default Password for ALL users: Abc123!@#';
    RAISE NOTICE 'All users will be required to change password on first login';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- =====================================================
-- Additional Notes:
-- =====================================================
-- 1. All users have been created with @myboyum.com email addresses
--    Format: first initial + last name (e.g., sshaw@myboyum.com)
-- 
-- 2. Users marked as Admin: Tim Haag, Travis Noe, Eric LeBow
-- 
-- 3. All 39 teams/departments have been created as listed
-- 
-- 4. Next steps after running this script:
--    - Add additional users to specific departments
--    - Import VTO data (Core Values, 10-year target, etc.)
--    - Import Rocks/Priorities
--    - Import Scorecard metrics
--    - Import Issues
--    - Import To-Dos
-- =====================================================