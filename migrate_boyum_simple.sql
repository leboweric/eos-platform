-- =====================================================
-- SIMPLE Migration: Boyum Barenscheer 
-- Just Organization, Users, and Teams
-- =====================================================

-- Clean up any previous attempts
ROLLBACK;

-- Delete if exists
DELETE FROM organizations WHERE slug = 'boyum-barenscheer';

BEGIN;

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
    
BEGIN
    -- 1. Create Organization
    INSERT INTO organizations (id, name, slug, subscription_tier, created_at, updated_at)
    VALUES (org_id, 'Boyum Barenscheer', 'boyum-barenscheer', 'professional', NOW(), NOW());

    -- 2. Create Leadership Team
    INSERT INTO teams (id, name, organization_id, created_at, updated_at)
    VALUES (leadership_team_id, 'Leadership Team', org_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET organization_id = org_id;

    -- 3. Create all other teams
    INSERT INTO teams (name, organization_id, created_at, updated_at)
    VALUES 
        ('LT', org_id, NOW(), NOW()),
        ('Project', org_id, NOW(), NOW()),
        ('Private', org_id, NOW(), NOW()),
        ('A&A IT Focus Group', org_id, NOW(), NOW()),
        ('A&A Managers', org_id, NOW(), NOW()),
        ('A&A Partners', org_id, NOW(), NOW()),
        ('A&A Senior II Council', org_id, NOW(), NOW()),
        ('Admin Leadership', org_id, NOW(), NOW()),
        ('Admin Team', org_id, NOW(), NOW()),
        ('BAS Managers', org_id, NOW(), NOW()),
        ('BAS Partners', org_id, NOW(), NOW()),
        ('BAS Staff', org_id, NOW(), NOW()),
        ('BAS-TAX', org_id, NOW(), NOW()),
        ('Boost', org_id, NOW(), NOW()),
        ('CAS Leadership', org_id, NOW(), NOW()),
        ('CAS Team', org_id, NOW(), NOW()),
        ('Executive', org_id, NOW(), NOW()),
        ('Finance Team', org_id, NOW(), NOW()),
        ('HR Team', org_id, NOW(), NOW()),
        ('Industry Group - Construction & Engineering', org_id, NOW(), NOW()),
        ('Industry Group - Manufacturing & Dist', org_id, NOW(), NOW()),
        ('Industry Group - Nonprofit', org_id, NOW(), NOW()),
        ('Industry Group - Salons', org_id, NOW(), NOW()),
        ('Innovation Team', org_id, NOW(), NOW()),
        ('IT - BAS/CAS Focus Group', org_id, NOW(), NOW()),
        ('IT Team', org_id, NOW(), NOW()),
        ('IT-Tax Focus Group', org_id, NOW(), NOW()),
        ('Karbon Implementation', org_id, NOW(), NOW()),
        ('Marketing', org_id, NOW(), NOW()),
        ('Ninety.io Training', org_id, NOW(), NOW()),
        ('Operations Team', org_id, NOW(), NOW()),
        ('Partners', org_id, NOW(), NOW()),
        ('Tax Managers', org_id, NOW(), NOW()),
        ('Tax Partners', org_id, NOW(), NOW()),
        ('Tax Staff', org_id, NOW(), NOW()),
        ('Training', org_id, NOW(), NOW()),
        ('Wealth Management', org_id, NOW(), NOW()),
        ('WM BB-HWA Project Team', org_id, NOW(), NOW());

    -- 4. Create Users
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES 
        (charlie_id, 'cmetzig@myboyum.com', password_hash, 'Charlie', 'Metzig', 'member', org_id, NOW(), NOW()),
        (chris_id, 'cwittich@myboyum.com', password_hash, 'Chris', 'Wittich', 'member', org_id, NOW(), NOW()),
        (stacy_id, 'sshaw@myboyum.com', password_hash, 'Stacy', 'Shaw', 'member', org_id, NOW(), NOW()),
        (tim_id, 'thaag@myboyum.com', password_hash, 'Tim', 'Haag', 'admin', org_id, NOW(), NOW()),
        (travis_id, 'tnoe@myboyum.com', password_hash, 'Travis', 'Noe', 'admin', org_id, NOW(), NOW()),
        (eric_id, 'elebow@myboyum.com', password_hash, 'Eric', 'LeBow', 'admin', org_id, NOW(), NOW());

    -- 5. Add users to Leadership Team
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES 
        (charlie_id, leadership_team_id, 'member', NOW()),
        (chris_id, leadership_team_id, 'member', NOW()),
        (stacy_id, leadership_team_id, 'member', NOW()),
        (tim_id, leadership_team_id, 'member', NOW()),
        (travis_id, leadership_team_id, 'member', NOW()),
        (eric_id, leadership_team_id, 'member', NOW());

    RAISE NOTICE 'SUCCESS! Created:';
    RAISE NOTICE '- Organization: Boyum Barenscheer';
    RAISE NOTICE '- 39 Teams/Departments';
    RAISE NOTICE '- 6 Leadership Team Members';
    RAISE NOTICE '';
    RAISE NOTICE 'Users (Password: Abc123!@#):';
    RAISE NOTICE '- cmetzig@myboyum.com';
    RAISE NOTICE '- cwittich@myboyum.com';
    RAISE NOTICE '- sshaw@myboyum.com';
    RAISE NOTICE '- thaag@myboyum.com [ADMIN]';
    RAISE NOTICE '- tnoe@myboyum.com [ADMIN]';
    RAISE NOTICE '- elebow@myboyum.com [ADMIN]';

END $$;

COMMIT;