-- Check demo org admin users
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  o.name as org_name,
  o.slug,
  o.id as org_id
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE o.slug = 'demo-acme-industries' 
  AND u.role = 'admin';

-- Also check if the demo org exists
SELECT 
  id,
  name,
  slug,
  created_at
FROM organizations
WHERE slug = 'demo-acme-industries';