-- Add Mark Keating to K&E Consulting (Leadership Team)
-- Run after create_kande_consulting_org.sql if org already exists

DO $$
DECLARE
    v_org_id UUID;
    v_leadership_team_id UUID;
    v_mark_user_id UUID;
    v_password_hash TEXT := '$2b$12$O7KlPI1nrqTwjFRNniHzQu/kt0fvci/GWVbU/51SA08tKNm270EgC';
BEGIN
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'kande-consulting' LIMIT 1;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'K&E Consulting org not found (slug: kande-consulting)';
    END IF;

    SELECT id INTO v_leadership_team_id
    FROM teams
    WHERE organization_id = v_org_id AND is_leadership_team = true
    LIMIT 1;

    IF EXISTS (SELECT 1 FROM users WHERE email = 'mark@kandeconsulting.com') THEN
        RAISE NOTICE 'mark@kandeconsulting.com already exists — skipping';
        RETURN;
    END IF;

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

    UPDATE subscriptions
    SET user_count = GREATEST(user_count, 2), updated_at = NOW()
    WHERE organization_id = v_org_id;

    RAISE NOTICE 'Mark Keating created: %', v_mark_user_id;
    RAISE NOTICE 'Login: mark@kandeconsulting.com / abc123';
END $$;