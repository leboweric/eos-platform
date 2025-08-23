-- CHECK ENRICHMENT RESULTS
-- See if Apollo found any data

-- 1. Check if ANY contacts got emails
SELECT 
    COUNT(*) as total_contacts,
    COUNT(email) as contacts_with_email,
    COUNT(phone) as contacts_with_phone
FROM prospect_contacts;

-- 2. Check if ANY prospects got company data
SELECT 
    COUNT(*) as total_prospects,
    COUNT(employee_count) as with_employee_count,
    COUNT(industry) as with_industry,
    COUNT(technologies_used) as with_technologies
FROM prospects;

-- 3. Show prospects that were successfully enriched (if any)
SELECT 
    p.company_name,
    p.website,
    p.employee_count,
    p.industry,
    pc.email,
    pc.phone,
    p.last_updated
FROM prospects p
LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE 
    p.employee_count IS NOT NULL
    OR pc.email IS NOT NULL
ORDER BY p.last_updated DESC
LIMIT 20;

-- 4. Check recent Apollo enrichment signals
SELECT 
    p.company_name,
    ps.signal_type,
    ps.detected_at,
    ps.signal_data::text as data_preview
FROM prospect_signals ps
JOIN prospects p ON ps.prospect_id = p.id
WHERE ps.signal_type = 'apollo_enrichment'
    AND ps.detected_at > NOW() - INTERVAL '1 hour'
ORDER BY ps.detected_at DESC
LIMIT 10;

-- 5. Find prospects with cleaner company names (more likely to work)
SELECT 
    company_name,
    website,
    prospect_score
FROM prospects
WHERE has_eos_titles = true
    AND company_name NOT LIKE '%™%'
    AND company_name NOT LIKE '%®%'
    AND company_name NOT LIKE '%LLC%'
    AND company_name NOT LIKE '%Inc.%'
    AND LENGTH(company_name) < 30
    AND company_name ~ '^[A-Za-z0-9 ]+$'  -- Only letters, numbers, spaces
ORDER BY prospect_score DESC
LIMIT 20;