-- Analyze EOS Prospects Data
-- Run these queries in pgAdmin to understand your prospect database

-- 1. Total prospects and EOS breakdown
SELECT 
    COUNT(*) as total_prospects,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles,
    COUNT(CASE WHEN eos_keywords_found IS NOT NULL THEN 1 END) as with_eos_keywords,
    CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND(COUNT(CASE WHEN has_eos_titles = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
    END as eos_percentage
FROM prospects;

-- 2. Top companies with strongest EOS signals
SELECT 
    company_name,
    has_eos_titles,
    array_to_string(eos_keywords_found, ', ') as keywords_found,
    prospect_score,
    industry,
    employee_count
FROM prospects
WHERE has_eos_titles = true OR eos_keywords_found IS NOT NULL
ORDER BY prospect_score DESC, has_eos_titles DESC
LIMIT 20;

-- 3. Industry breakdown of EOS companies
SELECT 
    COALESCE(industry, 'Unknown') as industry,
    COUNT(*) as company_count,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles,
    ROUND(AVG(COALESCE(employee_count, 0)), 0) as avg_employee_count
FROM prospects
GROUP BY industry
HAVING COUNT(*) > 5
ORDER BY company_count DESC;

-- 4. Company size distribution
SELECT 
    CASE 
        WHEN employee_count < 10 THEN '1-9 employees'
        WHEN employee_count < 50 THEN '10-49 employees'
        WHEN employee_count < 200 THEN '50-199 employees'
        WHEN employee_count < 500 THEN '200-499 employees'
        WHEN employee_count >= 500 THEN '500+ employees'
        ELSE 'Unknown size'
    END as size_category,
    COUNT(*) as company_count,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles
FROM prospects
GROUP BY size_category
ORDER BY 
    CASE size_category
        WHEN '1-9 employees' THEN 1
        WHEN '10-49 employees' THEN 2
        WHEN '50-199 employees' THEN 3
        WHEN '200-499 employees' THEN 4
        WHEN '500+ employees' THEN 5
        ELSE 6
    END;

-- 5. Contacts with EOS roles
SELECT 
    pc.first_name || ' ' || pc.last_name as contact_name,
    pc.title,
    p.company_name,
    pc.is_eos_role,
    pc.linkedin_url
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.is_eos_role = true OR pc.title ILIKE '%integrator%' OR pc.title ILIKE '%visionary%'
ORDER BY p.company_name
LIMIT 50;

-- 6. Prospects ready for outreach (high scores, have contacts)
SELECT 
    p.company_name,
    p.prospect_score,
    p.industry,
    p.employee_count,
    COUNT(pc.id) as contact_count,
    p.website
FROM prospects p
LEFT JOIN prospect_contacts pc ON pc.prospect_id = p.id
WHERE p.prospect_score >= 5
GROUP BY p.id, p.company_name, p.prospect_score, p.industry, p.employee_count, p.website
HAVING COUNT(pc.id) > 0
ORDER BY p.prospect_score DESC, contact_count DESC
LIMIT 25;

-- 7. Signal strength analysis
SELECT 
    ps.signal_type,
    COUNT(*) as signal_count,
    AVG(ps.signal_strength) as avg_strength,
    MAX(ps.signal_strength) as max_strength
FROM prospect_signals ps
GROUP BY ps.signal_type
ORDER BY signal_count DESC;

-- 8. Recent imports (last 7 days)
SELECT 
    DATE(created_at) as import_date,
    COUNT(*) as prospects_added,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles
FROM prospects
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY import_date DESC;

-- 9. Companies with websites (ready for enrichment)
SELECT 
    COUNT(*) as total_prospects,
    COUNT(website) as with_website,
    COUNT(linkedin_url) as with_linkedin,
    COUNT(CASE WHEN website IS NOT NULL AND has_eos_titles = true THEN 1 END) as eos_with_website
FROM prospects;

-- 10. Duplicate check (by company name similarity)
SELECT 
    p1.company_name as company1,
    p2.company_name as company2,
    p1.website as website1,
    p2.website as website2
FROM prospects p1
JOIN prospects p2 ON p1.id < p2.id
WHERE 
    LOWER(REPLACE(p1.company_name, ' ', '')) = LOWER(REPLACE(p2.company_name, ' ', ''))
    OR (p1.website IS NOT NULL AND p1.website = p2.website)
ORDER BY p1.company_name;