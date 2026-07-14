-- Move sensitive Risdall todo/issue from Delivery → Leadership
-- Todo: Set up 1:1 with Nick on performance improvement
-- Already applied in production on 2026-07-14.

BEGIN;

UPDATE todos
SET team_id = 'e9bba8ad-3aaf-479f-ad8f-51c23fe2da24',
    updated_at = NOW()
WHERE id = 'c1570dc4-b453-41e2-8c1a-36304d758efe'
  AND organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7';

UPDATE issues
SET team_id = 'e9bba8ad-3aaf-479f-ad8f-51c23fe2da24',
    updated_at = NOW()
WHERE id = 'f6ccb283-5a10-48ee-a854-3c79a1dadc0a'
  AND organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7';

COMMIT;

SELECT 'todo' AS kind, t.name AS team, LEFT(td.title, 60) AS title
FROM todos td JOIN teams t ON t.id = td.team_id
WHERE td.id = 'c1570dc4-b453-41e2-8c1a-36304d758efe'
UNION ALL
SELECT 'issue', t.name, LEFT(i.title, 60)
FROM issues i JOIN teams t ON t.id = i.team_id
WHERE i.id = 'f6ccb283-5a10-48ee-a854-3c79a1dadc0a';
