-- =====================================================
-- Create K&E Consulting Tenant
-- https://kandeconsulting.com/
-- Primary user: Karlie Knox (karli@kandeconsulting.com)
-- =====================================================

DELETE FROM organizations WHERE slug = 'kande-consulting';

BEGIN;

DO $$
DECLARE
    v_org_id UUID;
    v_leadership_team_id UUID;
    v_karlie_user_id UUID;
    v_mark_user_id UUID;
    v_blueprint_id UUID;
    -- Default password: abc123 (must change on first login)
    v_password_hash TEXT := '$2b$12$O7KlPI1nrqTwjFRNniHzQu/kt0fvci/GWVbU/51SA08tKNm270EgC';
BEGIN
    INSERT INTO organizations (
        name,
        slug,
        subscription_tier,
        theme_primary_color,
        theme_secondary_color,
        theme_accent_color,
        logo_size,
        trial_started_at,
        trial_ends_at,
        created_at,
        updated_at
    )
    VALUES (
        'K&E Consulting',
        'kande-consulting',
        'pro',
        '#DE4613',  -- brand orange (from kandeconsulting.com Elementor kit)
        '#0F2453',  -- navy
        '#FFBC7D',  -- light orange accent
        100,
        NOW(),
        NOW() + INTERVAL '90 days',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_org_id;

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

    INSERT INTO users (
        id, organization_id, email, password_hash,
        first_name, last_name, role,
        created_at, updated_at, is_active, is_temporary_password
    )
    VALUES (
        gen_random_uuid(), v_org_id,
        'karli@kandeconsulting.com',
        v_password_hash,
        'Karlie', 'Knox', 'admin',
        NOW(), NOW(), true, true
    )
    RETURNING id INTO v_karlie_user_id;

    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (v_leadership_team_id, v_karlie_user_id, 'admin', NOW());

    INSERT INTO users (
        id, organization_id, email, password_hash,
        first_name, last_name, role,
        created_at, updated_at, is_active, is_temporary_password
    )
    VALUES (
        gen_random_uuid(), v_org_id,
        'mark@kandeconsulting.com',
        v_password_hash,
        'Mark', 'Keating', 'admin',
        NOW(), NOW(), true, true
    )
    RETURNING id INTO v_mark_user_id;

    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (v_leadership_team_id, v_mark_user_id, 'admin', NOW());

    INSERT INTO business_blueprints (id, organization_id, team_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_org_id, NULL, NOW(), NOW())
    RETURNING id INTO v_blueprint_id;

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
        'karli@kandeconsulting.com',
        2,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (organization_id) DO NOTHING;

    RAISE NOTICE 'K&E Consulting tenant created';
    RAISE NOTICE 'Org ID: %', v_org_id;
    RAISE NOTICE 'Leadership Team ID: %', v_leadership_team_id;
    RAISE NOTICE 'Karlie Knox user ID: %', v_karlie_user_id;
    RAISE NOTICE 'Mark Keating user ID: %', v_mark_user_id;
    RAISE NOTICE 'Blueprint ID: %', v_blueprint_id;
    RAISE NOTICE 'Logins (temp password abc123): karli@kandeconsulting.com, mark@kandeconsulting.com';
END $$;

COMMIT;