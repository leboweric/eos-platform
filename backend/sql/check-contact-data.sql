-- CHECK WHAT CONTACT DATA WE ACTUALLY HAVE

-- 1. Contact data completeness
SELECT 
    COUNT(*) as total_contacts,
    COUNT(email) as with_email,
    COUNT(phone) as with_phone,
    COUNT(linkedin_url) as with_linkedin,
    COUNT(CASE WHEN is_eos_role = true THEN 1 END) as marked_as_eos_role,
    COUNT(CASE WHEN is_decision_maker = true THEN 1 END) as marked_as_decision_maker
FROM prospect_contacts;

-- 2. Sample contacts to see what data we have
SELECT 
    pc.first_name,
    pc.last_name,
    pc.title,
    pc.email,
    pc.phone,
    pc.is_eos_role,
    pc.is_decision_maker,
    p.company_name
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.title IS NOT NULL
LIMIT 20;

-- 3. Check signal types and strength
SELECT 
    signal_type,
    COUNT(*) as count,
    AVG(signal_strength) as avg_strength,
    MIN(signal_strength) as min_strength,
    MAX(signal_strength) as max_strength
FROM prospect_signals
GROUP BY signal_type
ORDER BY count DESC;

-- 4. Contacts with emails (ready for outreach)
SELECT 
    pc.first_name || ' ' || pc.last_name as full_name,
    pc.title,
    pc.email,
    p.company_name,
    p.website
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.email IS NOT NULL
ORDER BY p.company_name
LIMIT 20;

-- 5. Title distribution
SELECT 
    title,
    COUNT(*) as count
FROM prospect_contacts
WHERE title IS NOT NULL
GROUP BY title
ORDER BY count DESC
LIMIT 20;