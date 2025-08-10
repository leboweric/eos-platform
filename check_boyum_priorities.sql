-- Check what priorities exist for Boyum
SELECT 
    p.id,
    p.title,
    p.quarter,
    p.year,
    p.is_company_priority,
    p.status,
    p.created_at
FROM quarterly_priorities p
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
ORDER BY p.year DESC, p.quarter DESC, p.created_at DESC;