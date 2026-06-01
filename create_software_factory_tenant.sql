-- =====================================================
-- Create Software Factory Tenant (Standalone)
-- Exact spec: Only Leadership Team + exactly 3 users
-- rick@aiop.one, eric@aiop.one, charlie@aiop.one
-- Modeled on Bennett Material Handling clean production setup
-- NO other teams, NO consultant linkage
-- Proper Leadership Team (gen_random_uuid + is_leadership_team=true)
-- Org-level Business Blueprint (team_id = NULL)
-- =====================================================

-- Run this in pgAdmin connected to the production Railway database.
-- This script is safe to re-run (it deletes any previous "software-factory" org).

-- =====================================================
-- CLEANUP (for safe re-runs during initial setup)
-- =====================================================
DELETE FROM organizations WHERE slug = 'software-factory';

BEGIN;

DO $$
DECLARE
    v_org_id UUID;
    v_leadership_team_id UUID;
    v_eric_user_id UUID;
    v_rick_user_id UUID;
    v_charlie_user_id UUID;
    v_blueprint_id UUID;
    v_password_hash TEXT := '$2b$12$O7KlPI1nrqTwjFRNniHzQu/kt0fvci/GWVbU/51SA08tKNm270EgC'; -- abc123  (ALL USERS MUST CHANGE ON FIRST LOGIN)
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Software Factory tenant';
    RAISE NOTICE 'Only Leadership Team + 3 users on aiop.one domain';
    RAISE NOTICE '========================================';

    -- 1. Create Organization
    INSERT INTO organizations (name, slug, created_at, updated_at)
    VALUES ('Software Factory', 'software-factory', NOW(), NOW())
    RETURNING id INTO v_org_id;

    RAISE NOTICE 'Created organization: Software Factory (ID: %)', v_org_id;

    -- 2. Create ONLY the Leadership Team (no other teams)
    INSERT INTO teams (id, name, organization_id, is_leadership_team, description, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'Leadership Team',
        v_org_id,
        true,
        'Leadership Team',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_leadership_team_id;

    RAISE NOTICE 'Created Leadership Team ONLY (ID: %)', v_leadership_team_id;

    -- 3. Create the three exact users (all on Leadership Team)
    -- Eric LeBow - admin
    INSERT INTO users (
        id, organization_id, email, password_hash,
        first_name, last_name, role,
        created_at, updated_at, is_active, is_temporary_password
    )
    VALUES (
        gen_random_uuid(), v_org_id,
        'eric@aiop.one',
        v_password_hash,
        'Eric', 'LeBow', 'admin',
        NOW(), NOW(), true, true
    )
    RETURNING id INTO v_eric_user_id;

    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (v_leadership_team_id, v_eric_user_id, 'admin', NOW());

    RAISE NOTICE 'Created: eric@aiop.one (admin)';

    -- Rick Erickson - member
    INSERT INTO users (
        id, organization_id, email, password_hash,
        first_name, last_name, role,
        created_at, updated_at, is_active, is_temporary_password
    )
    VALUES (
        gen_random_uuid(), v_org_id,
        'rick@aiop.one',
        v_password_hash,
        'Rick', 'Erickson', 'member',
        NOW(), NOW(), true, true
    )
    RETURNING id INTO v_rick_user_id;

    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (v_leadership_team_id, v_rick_user_id, 'member', NOW());

    RAISE NOTICE 'Created: rick@aiop.one (member)';

    -- Charlie - member  (UPDATE LAST NAME BELOW IF NEEDED)
    INSERT INTO users (
        id, organization_id, email, password_hash,
        first_name, last_name, role,
        created_at, updated_at, is_active, is_temporary_password
    )
    VALUES (
        gen_random_uuid(), v_org_id,
        'charlie@aiop.one',
        v_password_hash,
        'Charlie', 'User', 'member',   -- <-- CHANGE LAST NAME HERE IF DESIRED
        NOW(), NOW(), true, true
    )
    RETURNING id INTO v_charlie_user_id;

    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (v_leadership_team_id, v_charlie_user_id, 'member', NOW());

    RAISE NOTICE 'Created: charlie@aiop.one (member)';

    -- 4. Create Org-Level Business Blueprint (team_id MUST be NULL)
    INSERT INTO business_blueprints (id, organization_id, team_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_org_id, NULL, NOW(), NOW())
    RETURNING id INTO v_blueprint_id;

    RAISE NOTICE 'Created org-level Business Blueprint (team_id=NULL)';

    -- 5. Subscription (3 users)
    INSERT INTO subscriptions (
        organization_id,
        status,
        plan_id,
        trial_type,
        trial_start_date,
        trial_end_date,
        billing_email,
        user_count,
        price_per_user,
        created_at,
        updated_at
    )
    VALUES (
        v_org_id,
        'trialing',
        'pro',
        'free',
        NOW(),
        NOW() + INTERVAL '90 days',
        'eric@aiop.one',
        3,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (organization_id) DO NOTHING;

    RAISE NOTICE 'Subscription created (trialing, 3 users)';

    -- 6. Optional org metadata (safe if columns missing)
    BEGIN
        UPDATE organizations
        SET 
            industry = 'Software / Technology (AI-Native Agentic ERP)',
            employee_count = 5,
            subscription_tier = 'pro'
        WHERE id = v_org_id;
    EXCEPTION WHEN undefined_column THEN
        -- columns may not exist yet; ignore
    END;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUCCESS: Software Factory tenant created';
    RAISE NOTICE 'Only Leadership Team exists. Exactly 3 users.';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Org ID: %', v_org_id;
    RAISE NOTICE 'Leadership Team ID: %', v_leadership_team_id;
    RAISE NOTICE 'Blueprint ID (org-level): %', v_blueprint_id;
    RAISE NOTICE '';
    RAISE NOTICE 'USERS (all on Leadership Team):';
    RAISE NOTICE '  - eric@aiop.one   (admin)   — CEO';
    RAISE NOTICE '  - rick@aiop.one   (member)  — CTO';
    RAISE NOTICE '  - charlie@aiop.one (member)';
    RAISE NOTICE '';
    RAISE NOTICE 'Default password for all three: abc123';
    RAISE NOTICE '*** ALL USERS MUST CHANGE PASSWORD ON FIRST LOGIN ***';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps after running:';
    RAISE NOTICE '1. Run the verification queries at the bottom of this file';
    RAISE NOTICE '2. Log in as eric@aiop.one and change password';
    RAISE NOTICE '3. Upload logo: logos/software-factory/icon-192.png (or better export from landing page)';
    RAISE NOTICE '4. Set theme colors (see suggested UPDATE below)';
    RAISE NOTICE '5. (Optional) Run seed_software_factory_vto.sql for instant professional VTO content';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- =====================================================
-- POST-CREATION VERIFICATION — RUN THESE IMMEDIATELY AFTER
-- =====================================================

-- 1. Confirm ONLY Leadership Team exists and is correctly flagged
SELECT 
    'LEADERSHIP TEAM CHECK' as check_type,
    COUNT(*) as total_teams,
    (SELECT COUNT(*) FROM teams WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory') AND is_leadership_team = true) as leadership_teams,
    (SELECT name FROM teams WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory') AND is_leadership_team = true) as leadership_team_name
FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory');

-- 2. Blueprint must have team_id IS NULL
SELECT 
    'BLUEPRINT CHECK' as check_type,
    id, 
    team_id IS NULL as has_null_team_id
FROM business_blueprints 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory');

-- 3. Exactly the three required users, all linked to Leadership Team
SELECT 
    'USER CHECK' as check_type,
    u.email, 
    u.first_name || ' ' || u.last_name as full_name,
    u.role,
    t.name as team,
    tm.role as team_role
FROM users u
JOIN team_members tm ON tm.user_id = u.id
JOIN teams t ON t.id = tm.team_id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory')
ORDER BY u.role DESC, u.last_name;

-- 4. Subscription for 3 users
SELECT 
    'SUBSCRIPTION CHECK' as check_type,
    status, plan_id, user_count, billing_email
FROM subscriptions 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory');

-- 5. Final summary — should show exactly 1 team (Leadership)
SELECT 
    'FINAL TEAM COUNT' as check_type,
    name, 
    is_leadership_team
FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory')
ORDER BY is_leadership_team DESC, name;

-- =====================================================
-- THEME COLORS (run this after login / logo upload if desired)
-- Matches the SF landing page branding (blue + yellow accent)
-- =====================================================
-- UPDATE organizations
-- SET 
--     theme_primary_color   = '#2563EB',
--     theme_secondary_color = '#1E3A8A',
--     theme_accent_color    = '#EAB308'
-- WHERE slug = 'software-factory';

-- =====================================================
-- STANDALONE PASSWORD RESET (use this if the org already exists
-- from a previous run of the script and you just need to set abc123)
-- =====================================================
-- UPDATE users 
-- SET password_hash = '$2b$12$O7KlPI1nrqTwjFRNniHzQu/kt0fvci/GWVbU/51SA08tKNm270EgC',
--     is_temporary_password = true
-- WHERE email IN ('eric@aiop.one', 'rick@aiop.one', 'charlie@aiop.one')
--   AND organization_id = (SELECT id FROM organizations WHERE slug = 'software-factory');

-- If everything above shows 1 team, 3 users, correct blueprint, you are done.
-- All three users now have password: abc123 (must change on first login)
-- DO NOT touch special UUIDs on any other organization.