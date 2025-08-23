-- VIEW YOUR ENRICHED EOS INTEGRATORS
-- These are ready for outreach!

-- 1. Count enriched prospects
SELECT 
    COUNT(DISTINCT p.id) as total_prospects,
    COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN p.id END) as prospects_with_email,
    COUNT(pc.email) as total_emails_found
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true;

-- 2. Top enriched prospects ready for outreach
SELECT 
    p.company_name as "Company",
    pc.first_name || ' ' || pc.last_name as "Contact",
    pc.title as "Title",
    pc.email as "Email",
    pc.phone as "Phone",
    p.website as "Website",
    p.employee_count as "Size",
    p.industry as "Industry",
    p.prospect_score as "Score",
    p.prospect_tier as "Tier"
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true
    AND pc.email IS NOT NULL
ORDER BY p.prospect_score DESC, p.company_name
LIMIT 50;

-- 3. Export for email campaign
SELECT 
    pc.first_name as "First Name",
    pc.last_name as "Last Name",
    pc.email as "Email",
    p.company_name as "Company",
    pc.title as "Title",
    CASE 
        WHEN pc.title ILIKE '%integrator%' THEN 'Integrator'
        WHEN pc.title ILIKE '%visionary%' THEN 'Visionary'
        WHEN pc.title ILIKE '%coo%' THEN 'COO'
        WHEN pc.title ILIKE '%ceo%' THEN 'CEO'
        ELSE 'Executive'
    END as "Role Type",
    p.website as "Website"
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true
    AND pc.email IS NOT NULL
ORDER BY p.prospect_score DESC;

-- 4. Email domains distribution (to check quality)
SELECT 
    SUBSTRING(pc.email FROM '@(.*)$') as email_domain,
    COUNT(*) as count
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.email IS NOT NULL
    AND p.has_eos_titles = true
GROUP BY email_domain
ORDER BY count DESC
LIMIT 20;

-- 5. Missing emails (for future enrichment)
SELECT 
    p.company_name,
    pc.first_name || ' ' || pc.last_name as contact_name,
    pc.title,
    p.prospect_score
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true
    AND pc.email IS NULL
    AND p.prospect_tier IN ('hot', 'warm')
ORDER BY p.prospect_score DESC
LIMIT 40;