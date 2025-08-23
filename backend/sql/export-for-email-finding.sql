-- EXPORT EOS INTEGRATORS FOR EMAIL FINDING
-- Since Apollo only found 1 email, export for alternative enrichment

-- 1. Export top 100 hot prospects for priority enrichment
SELECT 
    p.company_name as "Company",
    pc.first_name as "First Name",
    pc.last_name as "Last Name", 
    pc.title as "Title",
    p.website as "Website",
    p.linkedin_url as "Company LinkedIn",
    pc.linkedin_url as "Contact LinkedIn",
    p.prospect_score as "Score",
    p.prospect_tier as "Tier"
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.prospect_tier IN ('hot', 'warm')
    AND p.has_eos_titles = true
ORDER BY p.prospect_score DESC
LIMIT 100;

-- 2. Simple CSV export format for upload to email finders
SELECT 
    pc.first_name || ' ' || pc.last_name as "Full Name",
    p.company_name as "Company",
    p.website as "Domain"
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true
    AND p.company_name NOT IN ('Self-employed', 'Freelance', 'Independent')
ORDER BY p.prospect_score DESC;

-- 3. LinkedIn URLs for Sales Navigator outreach
SELECT 
    pc.first_name || ' ' || pc.last_name as "Name",
    pc.title as "Title",
    p.company_name as "Company",
    pc.linkedin_url as "LinkedIn Profile"
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
    AND pc.linkedin_url IS NOT NULL
ORDER BY p.prospect_score DESC
LIMIT 200;