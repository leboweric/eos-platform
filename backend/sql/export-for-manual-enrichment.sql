-- EXPORT PROSPECTS FOR MANUAL ENRICHMENT
-- Since Apollo API lacks permissions, export data for manual enrichment

-- 1. Export top EOS Integrators to CSV format
COPY (
    SELECT 
        p.company_name,
        pc.first_name,
        pc.last_name,
        pc.title,
        p.website,
        p.linkedin_url,
        p.has_eos_titles,
        array_to_string(p.eos_keywords_found, ', ') as eos_keywords,
        p.prospect_score,
        p.prospect_tier
    FROM prospects p
    LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
    WHERE p.has_eos_titles = true
    ORDER BY p.prospect_score DESC, p.company_name
) TO '/tmp/eos_integrators_export.csv' WITH CSV HEADER;

-- 2. Get top 50 for immediate manual lookup
SELECT 
    p.company_name as "Company",
    pc.first_name || ' ' || pc.last_name as "Contact Name",
    pc.title as "Title",
    p.website as "Website",
    'Need Email' as "Email Status"
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.prospect_tier = 'hot'
ORDER BY p.prospect_score DESC
LIMIT 50;

-- 3. Companies grouped by score tier for prioritization
SELECT 
    prospect_tier,
    COUNT(*) as count,
    STRING_AGG(company_name, ', ' ORDER BY prospect_score DESC LIMIT 10) as top_companies
FROM prospects
WHERE has_eos_titles = true
GROUP BY prospect_tier
ORDER BY 
    CASE prospect_tier
        WHEN 'hot' THEN 1
        WHEN 'warm' THEN 2
        WHEN 'cool' THEN 3
        WHEN 'cold' THEN 4
    END;