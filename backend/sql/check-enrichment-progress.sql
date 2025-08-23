-- CHECK APOLLO ENRICHMENT PROGRESS
-- Run these queries to see if enrichment is working

-- 1. Check if any prospects have been enriched
SELECT 
    COUNT(*) as total_prospects,
    COUNT(technologies_used) as with_technologies,
    COUNT(growth_rate) as with_growth_rate,
    COUNT(recent_funding) as with_funding
FROM prospects
WHERE has_eos_titles = true;

-- 2. Check if contacts are getting emails
SELECT 
    COUNT(*) as total_contacts,
    COUNT(email) as with_email,
    COUNT(phone) as with_phone
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true;

-- 3. Show recently enriched prospects (if any)
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
WHERE p.has_eos_titles = true
    AND p.last_updated > NOW() - INTERVAL '10 minutes'
ORDER BY p.last_updated DESC
LIMIT 10;

-- 4. Check for prospects with emails (ready for outreach)
SELECT 
    p.company_name,
    pc.first_name || ' ' || pc.last_name as contact_name,
    pc.title,
    pc.email,
    p.website
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true
    AND pc.email IS NOT NULL
ORDER BY p.company_name
LIMIT 20;

-- 5. Check signal updates
SELECT 
    COUNT(*) as recent_signals
FROM prospect_signals
WHERE detected_at > NOW() - INTERVAL '10 minutes'
    AND signal_type = 'apollo_enrichment';