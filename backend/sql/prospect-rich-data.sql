-- RICH DATA QUERIES - Shows contacts and signals
-- These queries properly JOIN the related tables to show all the rich data

-- ========================================
-- 1. CHECK WHAT DATA WE ACTUALLY HAVE
-- ========================================
SELECT 
    'Prospects' as table_name,
    COUNT(*) as record_count
FROM prospects
UNION ALL
SELECT 
    'Prospect Contacts',
    COUNT(*)
FROM prospect_contacts
UNION ALL
SELECT 
    'Prospect Signals',
    COUNT(*)
FROM prospect_signals;

-- ========================================
-- 2. TOP PROSPECTS WITH FULL CONTACT INFO
-- ========================================
WITH prospect_enriched AS (
    SELECT 
        p.id,
        p.company_name,
        p.website,
        p.has_eos_titles,
        p.eos_keywords_found,
        p.prospect_score,
        COUNT(DISTINCT pc.id) as contact_count,
        COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) as contacts_with_email,
        COUNT(DISTINCT ps.id) as signal_count,
        STRING_AGG(DISTINCT pc.first_name || ' ' || pc.last_name || ' (' || COALESCE(pc.title, 'No title') || ')', ', ') as contacts,
        STRING_AGG(DISTINCT pc.email, ', ') as emails,
        STRING_AGG(DISTINCT ps.signal_type || '(' || ps.signal_strength || ')', ', ') as signals
    FROM prospects p
    LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
    LEFT JOIN prospect_signals ps ON p.id = ps.prospect_id
    WHERE p.has_eos_titles = true
    GROUP BY p.id, p.company_name, p.website, p.has_eos_titles, p.eos_keywords_found, p.prospect_score
)
SELECT 
    company_name,
    website,
    contact_count,
    contacts_with_email,
    signal_count,
    prospect_score,
    contacts,
    emails,
    signals
FROM prospect_enriched
ORDER BY 
    contacts_with_email DESC,
    contact_count DESC,
    signal_count DESC
LIMIT 30;

-- ========================================
-- 3. ALL CONTACTS WITH EOS ROLES
-- ========================================
SELECT 
    p.company_name,
    pc.first_name,
    pc.last_name,
    pc.title,
    pc.email,
    pc.phone,
    pc.is_eos_role,
    pc.is_decision_maker,
    p.website
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.is_eos_role = true 
   OR pc.title ILIKE '%integrator%' 
   OR pc.title ILIKE '%visionary%'
   OR pc.title ILIKE '%eos%'
ORDER BY p.company_name, pc.last_name
LIMIT 50;

-- ========================================
-- 4. PROSPECTS WITH BEST CONTACT COVERAGE
-- ========================================
SELECT 
    p.company_name,
    p.website,
    COUNT(DISTINCT pc.id) as total_contacts,
    COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) as contacts_with_email,
    COUNT(DISTINCT CASE WHEN pc.phone IS NOT NULL THEN pc.id END) as contacts_with_phone,
    COUNT(DISTINCT CASE WHEN pc.is_eos_role = true THEN pc.id END) as eos_role_contacts,
    COUNT(DISTINCT CASE WHEN pc.is_decision_maker = true THEN pc.id END) as decision_makers,
    STRING_AGG(
        pc.first_name || ' ' || pc.last_name || 
        ' (' || COALESCE(pc.title, 'No title') || ')' ||
        CASE WHEN pc.email IS NOT NULL THEN ' ✉️' ELSE '' END ||
        CASE WHEN pc.phone IS NOT NULL THEN ' 📞' ELSE '' END,
        ', '
        ORDER BY pc.is_eos_role DESC, pc.is_decision_maker DESC
    ) as contact_details
FROM prospects p
JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE p.has_eos_titles = true
GROUP BY p.id, p.company_name, p.website
HAVING COUNT(DISTINCT pc.id) > 0
ORDER BY 
    contacts_with_email DESC,
    total_contacts DESC
LIMIT 30;

-- ========================================
-- 5. SIGNAL ANALYSIS WITH COMPANY DETAILS
-- ========================================
SELECT 
    p.company_name,
    ps.signal_type,
    ps.signal_strength,
    ps.source,
    ps.detected_at::date as signal_date,
    p.website,
    p.has_eos_titles,
    CASE 
        WHEN ps.signal_data IS NOT NULL 
        THEN jsonb_pretty(ps.signal_data)
        ELSE 'No additional data'
    END as signal_details
FROM prospect_signals ps
JOIN prospects p ON ps.prospect_id = p.id
WHERE ps.signal_strength >= 5
ORDER BY 
    ps.signal_strength DESC,
    ps.detected_at DESC
LIMIT 50;

-- ========================================
-- 6. READY FOR IMMEDIATE OUTREACH (Has emails)
-- ========================================
WITH outreach_ready AS (
    SELECT 
        p.id,
        p.company_name,
        p.website,
        p.has_eos_titles,
        array_to_string(p.eos_keywords_found, ', ') as eos_keywords,
        COUNT(DISTINCT pc.id) as contact_count,
        COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) as email_count,
        STRING_AGG(
            DISTINCT 
            pc.first_name || ' ' || pc.last_name || ' - ' || pc.email,
            '; '
        ) FILTER (WHERE pc.email IS NOT NULL) as email_contacts
    FROM prospects p
    JOIN prospect_contacts pc ON p.id = pc.prospect_id
    WHERE p.has_eos_titles = true
    GROUP BY p.id, p.company_name, p.website, p.has_eos_titles, p.eos_keywords_found
    HAVING COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) > 0
)
SELECT 
    company_name,
    website,
    email_count,
    eos_keywords,
    email_contacts
FROM outreach_ready
ORDER BY email_count DESC
LIMIT 50;

-- ========================================
-- 7. CONTACTS GROUPED BY TITLE PATTERNS
-- ========================================
SELECT 
    CASE 
        WHEN LOWER(title) LIKE '%integrator%' THEN 'Integrator'
        WHEN LOWER(title) LIKE '%visionary%' THEN 'Visionary'
        WHEN LOWER(title) LIKE '%ceo%' OR LOWER(title) LIKE '%chief executive%' THEN 'CEO'
        WHEN LOWER(title) LIKE '%coo%' OR LOWER(title) LIKE '%chief operating%' THEN 'COO'
        WHEN LOWER(title) LIKE '%president%' THEN 'President'
        WHEN LOWER(title) LIKE '%owner%' THEN 'Owner'
        WHEN LOWER(title) LIKE '%founder%' THEN 'Founder'
        WHEN LOWER(title) LIKE '%director%' THEN 'Director'
        WHEN LOWER(title) LIKE '%manager%' THEN 'Manager'
        WHEN LOWER(title) LIKE '%vp%' OR LOWER(title) LIKE '%vice president%' THEN 'VP'
        ELSE 'Other'
    END as title_category,
    COUNT(*) as count,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
    STRING_AGG(
        DISTINCT first_name || ' ' || last_name || ' at ' || 
        (SELECT company_name FROM prospects WHERE id = prospect_contacts.prospect_id),
        ', '
        LIMIT 5
    ) as examples
FROM prospect_contacts
WHERE title IS NOT NULL
GROUP BY title_category
ORDER BY count DESC;

-- ========================================
-- 8. PROSPECTS MISSING CONTACTS (Need enrichment)
-- ========================================
SELECT 
    p.company_name,
    p.website,
    p.has_eos_titles,
    array_to_string(p.eos_keywords_found, ', ') as eos_keywords
FROM prospects p
LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
WHERE pc.id IS NULL
    AND p.has_eos_titles = true
    AND p.website IS NOT NULL
ORDER BY p.company_name
LIMIT 50;

-- ========================================
-- 9. DATA COMPLETENESS BY PROSPECT
-- ========================================
SELECT 
    p.company_name,
    p.website,
    p.has_eos_titles,
    COUNT(DISTINCT pc.id) as contacts,
    COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) as emails,
    COUNT(DISTINCT ps.id) as signals,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) > 0 THEN '✅ Ready'
        WHEN COUNT(DISTINCT pc.id) > 0 THEN '⚠️ Has contacts, needs emails'
        ELSE '❌ Needs enrichment'
    END as status
FROM prospects p
LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
LEFT JOIN prospect_signals ps ON p.id = ps.prospect_id
WHERE p.has_eos_titles = true
GROUP BY p.id, p.company_name, p.website, p.has_eos_titles
ORDER BY 
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN pc.id END) > 0 THEN 1
        WHEN COUNT(DISTINCT pc.id) > 0 THEN 2
        ELSE 3
    END,
    contacts DESC
LIMIT 100;

-- ========================================
-- 10. CROSS-TAB SUMMARY
-- ========================================
WITH summary AS (
    SELECT 
        p.id,
        p.has_eos_titles,
        CASE WHEN COUNT(pc.id) > 0 THEN 'Has Contacts' ELSE 'No Contacts' END as contact_status,
        CASE WHEN COUNT(ps.id) > 0 THEN 'Has Signals' ELSE 'No Signals' END as signal_status
    FROM prospects p
    LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
    LEFT JOIN prospect_signals ps ON p.id = ps.prospect_id
    GROUP BY p.id, p.has_eos_titles
)
SELECT 
    contact_status,
    signal_status,
    COUNT(*) as prospect_count,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles
FROM summary
GROUP BY contact_status, signal_status
ORDER BY contact_status, signal_status;