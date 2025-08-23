-- CHECK THE RESULTS OF THE BULK ENRICHMENT

-- 1. Total email coverage now
SELECT 
    COUNT(DISTINCT p.id) as total_eos_integrators,
    COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN p.id END) as with_emails,
    ROUND(
        COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN p.id END)::numeric / 
        COUNT(DISTINCT p.id)::numeric * 100, 
        1
    ) as email_coverage_percent
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true;

-- 2. Recently updated contacts (last hour)
SELECT 
    p.company_name,
    pc.first_name || ' ' || pc.last_name as contact,
    pc.email,
    pc.phone,
    pc.last_updated
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.last_updated > NOW() - INTERVAL '1 hour'
    AND pc.email IS NOT NULL
ORDER BY pc.last_updated DESC
LIMIT 20;

-- 3. Email count comparison
WITH email_stats AS (
    SELECT 
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as current_with_email,
        COUNT(*) as total_contacts
    FROM prospect_contacts pc
    JOIN prospects p ON pc.prospect_id = p.id
    WHERE p.has_eos_titles = true
)
SELECT 
    total_contacts,
    current_with_email,
    total_contacts - current_with_email as still_need_email,
    ROUND(current_with_email::numeric / total_contacts::numeric * 100, 1) as percent_complete
FROM email_stats;