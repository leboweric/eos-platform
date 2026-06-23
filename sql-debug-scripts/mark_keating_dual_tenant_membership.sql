-- =====================================================
-- Mark Keating: dual-tenant membership (K&E home + Boyum guest)
-- Run AFTER 099_create_user_organizations.sql migration
-- Run in pgAdmin on the railway database.
-- =====================================================

-- Diagnostics
SELECT u.id, u.email, u.organization_id, o.name AS home_org, o.slug
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.email = 'mark@kandeconsulting.com';

SELECT uo.*, o.name, o.slug
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'mark@kandeconsulting.com';

BEGIN;

DO $$
DECLARE
    mark_user_id UUID;
    kande_org_id UUID;
    boyum_org_id UUID := 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';
    boyum_it_team_id UUID;
BEGIN
    SELECT id INTO mark_user_id FROM users WHERE email = 'mark@kandeconsulting.com' LIMIT 1;
    IF mark_user_id IS NULL THEN
        RAISE EXCEPTION 'mark@kandeconsulting.com not found';
    END IF;

    SELECT id INTO kande_org_id FROM organizations WHERE slug = 'kande-consulting' LIMIT 1;
    IF kande_org_id IS NULL THEN
        RAISE EXCEPTION 'K&E Consulting org not found (slug: kande-consulting)';
    END IF;

    SELECT id INTO boyum_it_team_id
    FROM teams
    WHERE organization_id = boyum_org_id AND name = 'IT'
    LIMIT 1;

    -- Home org = K&E Consulting
    UPDATE users
    SET organization_id = kande_org_id,
        updated_at = NOW()
    WHERE id = mark_user_id;

    INSERT INTO user_organizations (user_id, organization_id, role, membership_type)
    VALUES (mark_user_id, kande_org_id, 'admin', 'home')
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET role = 'admin', membership_type = 'home', is_active = true, updated_at = NOW();

    INSERT INTO user_organizations (user_id, organization_id, role, membership_type)
    VALUES (mark_user_id, boyum_org_id, 'member', 'guest')
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET role = 'member', membership_type = 'guest', is_active = true, updated_at = NOW();

    IF boyum_it_team_id IS NOT NULL THEN
        INSERT INTO team_members (id, team_id, user_id, role)
        SELECT gen_random_uuid(), boyum_it_team_id, mark_user_id, 'member'
        WHERE NOT EXISTS (
            SELECT 1 FROM team_members WHERE team_id = boyum_it_team_id AND user_id = mark_user_id
        );
    END IF;

    RAISE NOTICE 'Mark Keating: home=K&E Consulting, guest=Boyum IT';
END $$;

COMMIT;

-- Verify
SELECT u.email, u.organization_id AS users_home_org_id, o.name AS users_home_org
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.email = 'mark@kandeconsulting.com';

SELECT o.name, o.slug, uo.role, uo.membership_type
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'mark@kandeconsulting.com'
ORDER BY uo.membership_type, o.name;

SELECT t.name AS team_name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN users u ON u.id = tm.user_id
WHERE u.email = 'mark@kandeconsulting.com'
  AND t.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';