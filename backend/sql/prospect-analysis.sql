-- PROSPECT ANALYSIS QUERIES FOR EOS INTEGRATORS
-- Run these in pgAdmin to analyze your 580 prospects

-- ========================================
-- 1. EXECUTIVE SUMMARY
-- ========================================
SELECT 
    COUNT(*) as total_prospects,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as confirmed_eos_integrators,
    COUNT(CASE WHEN eos_keywords_found IS NOT NULL AND array_length(eos_keywords_found, 1) > 0 THEN 1 END) as with_eos_keywords,
    COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as with_website,
    COUNT(CASE WHEN employee_count IS NOT NULL THEN 1 END) as with_employee_data,
    ROUND(COUNT(CASE WHEN has_eos_titles = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as eos_percentage
FROM prospects;

-- ========================================
-- 2. TOP EOS PROSPECTS (HIGHEST VALUE)
-- ========================================
SELECT 
    company_name,
    website,
    employee_count,
    industry,
    has_eos_titles,
    CASE 
        WHEN eos_keywords_found IS NOT NULL 
        THEN array_to_string(eos_keywords_found, ', ')
        ELSE 'None'
    END as eos_keywords,
    prospect_score,
    prospect_tier,
    created_at::date as added_date
FROM prospects
WHERE has_eos_titles = true 
   OR (eos_keywords_found IS NOT NULL AND array_length(eos_keywords_found, 1) > 0)
ORDER BY 
    has_eos_titles DESC,
    prospect_score DESC NULLS LAST,
    employee_count DESC NULLS LAST
LIMIT 30;

-- ========================================
-- 3. COMPANY SIZE DISTRIBUTION
-- ========================================
SELECT 
    CASE 
        WHEN employee_count IS NULL THEN 'Unknown'
        WHEN employee_count < 10 THEN '01. Micro (1-9)'
        WHEN employee_count < 20 THEN '02. Small (10-19)'
        WHEN employee_count < 50 THEN '03. SMB (20-49)'
        WHEN employee_count < 100 THEN '04. Mid-Market (50-99)'
        WHEN employee_count < 250 THEN '05. Upper Mid (100-249)'
        WHEN employee_count < 500 THEN '06. Enterprise (250-499)'
        ELSE '07. Large Enterprise (500+)'
    END as company_size,
    COUNT(*) as count,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles,
    ROUND(AVG(prospect_score), 1) as avg_score,
    ROUND(COUNT(CASE WHEN has_eos_titles = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as eos_percentage
FROM prospects
GROUP BY company_size
ORDER BY company_size;

-- ========================================
-- 4. INDUSTRY BREAKDOWN (EOS PENETRATION)
-- ========================================
SELECT 
    COALESCE(industry, 'Not Specified') as industry,
    COUNT(*) as total_companies,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as eos_companies,
    ROUND(COUNT(CASE WHEN has_eos_titles = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as eos_adoption_rate,
    ROUND(AVG(COALESCE(employee_count, 0)), 0) as avg_employees,
    STRING_AGG(DISTINCT 
        CASE WHEN has_eos_titles = true 
        THEN company_name 
        END, ', ' 
        ORDER BY CASE WHEN has_eos_titles = true THEN company_name END
    ) as example_eos_companies
FROM prospects
GROUP BY industry
HAVING COUNT(*) >= 3  -- Only show industries with at least 3 companies
ORDER BY eos_adoption_rate DESC, total_companies DESC;

-- ========================================
-- 5. EOS KEYWORD ANALYSIS
-- ========================================
WITH keyword_expanded AS (
    SELECT 
        company_name,
        unnest(eos_keywords_found) as keyword
    FROM prospects
    WHERE eos_keywords_found IS NOT NULL 
    AND array_length(eos_keywords_found, 1) > 0
)
SELECT 
    keyword,
    COUNT(*) as frequency,
    STRING_AGG(company_name, ', ' ORDER BY company_name) as companies_with_keyword
FROM keyword_expanded
GROUP BY keyword
ORDER BY frequency DESC;

-- ========================================
-- 6. PROSPECT SCORING DISTRIBUTION
-- ========================================
SELECT 
    CASE 
        WHEN prospect_score IS NULL THEN 'Not Scored'
        WHEN prospect_score >= 8 THEN 'Hot (8-10)'
        WHEN prospect_score >= 5 THEN 'Warm (5-7)'
        WHEN prospect_score >= 3 THEN 'Cool (3-4)'
        ELSE 'Cold (0-2)'
    END as score_category,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage,
    STRING_AGG(
        CASE 
            WHEN prospect_score >= 8 THEN company_name 
        END, ', ' 
        ORDER BY company_name
        LIMIT 5
    ) as top_hot_prospects
FROM prospects
GROUP BY score_category
ORDER BY 
    CASE score_category
        WHEN 'Hot (8-10)' THEN 1
        WHEN 'Warm (5-7)' THEN 2
        WHEN 'Cool (3-4)' THEN 3
        WHEN 'Cold (0-2)' THEN 4
        ELSE 5
    END;

-- ========================================
-- 7. DATA QUALITY REPORT
-- ========================================
SELECT 
    'Company Name' as field,
    COUNT(*) as total,
    COUNT(company_name) as populated,
    ROUND(COUNT(company_name)::numeric / COUNT(*)::numeric * 100, 1) as completeness
FROM prospects
UNION ALL
SELECT 'Website', COUNT(*), COUNT(website), ROUND(COUNT(website)::numeric / COUNT(*)::numeric * 100, 1) FROM prospects
UNION ALL
SELECT 'LinkedIn URL', COUNT(*), COUNT(linkedin_url), ROUND(COUNT(linkedin_url)::numeric / COUNT(*)::numeric * 100, 1) FROM prospects
UNION ALL
SELECT 'Employee Count', COUNT(*), COUNT(employee_count), ROUND(COUNT(employee_count)::numeric / COUNT(*)::numeric * 100, 1) FROM prospects
UNION ALL
SELECT 'Industry', COUNT(*), COUNT(industry), ROUND(COUNT(industry)::numeric / COUNT(*)::numeric * 100, 1) FROM prospects
UNION ALL
SELECT 'Has EOS Titles', COUNT(*), COUNT(CASE WHEN has_eos_titles = true THEN 1 END), ROUND(COUNT(CASE WHEN has_eos_titles = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) FROM prospects
UNION ALL
SELECT 'EOS Keywords', COUNT(*), COUNT(CASE WHEN eos_keywords_found IS NOT NULL AND array_length(eos_keywords_found, 1) > 0 THEN 1 END), ROUND(COUNT(CASE WHEN eos_keywords_found IS NOT NULL AND array_length(eos_keywords_found, 1) > 0 THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) FROM prospects
ORDER BY completeness DESC;

-- ========================================
-- 8. ENRICHMENT OPPORTUNITIES
-- ========================================
SELECT 
    'Missing Website' as data_gap,
    COUNT(*) as count,
    STRING_AGG(company_name, ', ' ORDER BY company_name LIMIT 10) as example_companies
FROM prospects
WHERE website IS NULL
UNION ALL
SELECT 
    'Missing Employee Count',
    COUNT(*),
    STRING_AGG(company_name, ', ' ORDER BY company_name LIMIT 10)
FROM prospects
WHERE employee_count IS NULL
UNION ALL
SELECT 
    'Missing Industry',
    COUNT(*),
    STRING_AGG(company_name, ', ' ORDER BY company_name LIMIT 10)
FROM prospects
WHERE industry IS NULL
ORDER BY count DESC;

-- ========================================
-- 9. CONTACTS AND OUTREACH READINESS
-- ========================================
WITH contact_summary AS (
    SELECT 
        p.id,
        p.company_name,
        p.has_eos_titles,
        COUNT(pc.id) as contact_count,
        COUNT(CASE WHEN pc.email IS NOT NULL THEN 1 END) as emails_count,
        COUNT(CASE WHEN pc.is_eos_role = true THEN 1 END) as eos_contacts
    FROM prospects p
    LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
    GROUP BY p.id, p.company_name, p.has_eos_titles
)
SELECT 
    CASE 
        WHEN contact_count = 0 THEN 'No Contacts'
        WHEN emails_count = 0 THEN 'Contacts without Email'
        WHEN emails_count > 0 AND eos_contacts > 0 THEN 'Ready - Has EOS Contact Emails'
        WHEN emails_count > 0 THEN 'Ready - Has Contact Emails'
        ELSE 'Other'
    END as outreach_status,
    COUNT(*) as companies,
    STRING_AGG(
        CASE WHEN has_eos_titles = true THEN company_name END, 
        ', ' 
        ORDER BY company_name 
        LIMIT 5
    ) as example_eos_companies
FROM contact_summary
GROUP BY outreach_status
ORDER BY 
    CASE outreach_status
        WHEN 'Ready - Has EOS Contact Emails' THEN 1
        WHEN 'Ready - Has Contact Emails' THEN 2
        WHEN 'Contacts without Email' THEN 3
        WHEN 'No Contacts' THEN 4
        ELSE 5
    END;

-- ========================================
-- 10. WEEKLY COHORT ANALYSIS
-- ========================================
SELECT 
    DATE_TRUNC('week', created_at) as week_added,
    COUNT(*) as prospects_added,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as eos_integrators,
    ROUND(AVG(COALESCE(employee_count, 0)), 0) as avg_company_size,
    STRING_AGG(
        DISTINCT COALESCE(source, 'unknown'), 
        ', '
    ) as sources
FROM prospects
GROUP BY week_added
ORDER BY week_added DESC;

-- ========================================
-- 11. COMPETITOR ANALYSIS (IF USING)
-- ========================================
SELECT 
    COALESCE(using_competitor, 'None/Unknown') as competitor_tool,
    COUNT(*) as count,
    COUNT(CASE WHEN has_eos_titles = true THEN 1 END) as with_eos_titles,
    ROUND(AVG(COALESCE(employee_count, 0)), 0) as avg_size,
    STRING_AGG(company_name, ', ' ORDER BY employee_count DESC NULLS LAST LIMIT 5) as example_companies
FROM prospects
GROUP BY using_competitor
ORDER BY count DESC;

-- ========================================
-- 12. TOP PROSPECTS FOR IMMEDIATE OUTREACH
-- ========================================
WITH scored_prospects AS (
    SELECT 
        p.*,
        COUNT(pc.id) as contact_count,
        COUNT(CASE WHEN pc.email IS NOT NULL THEN 1 END) as email_count,
        -- Calculate priority score
        (
            CASE WHEN has_eos_titles THEN 10 ELSE 0 END +
            CASE WHEN eos_keywords_found IS NOT NULL THEN 5 ELSE 0 END +
            CASE WHEN employee_count BETWEEN 20 AND 250 THEN 5 ELSE 2 END +
            CASE WHEN website IS NOT NULL THEN 2 ELSE 0 END
        ) as priority_score
    FROM prospects p
    LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
    GROUP BY p.id
)
SELECT 
    company_name,
    website,
    employee_count,
    industry,
    has_eos_titles,
    contact_count,
    email_count,
    priority_score,
    CASE 
        WHEN priority_score >= 15 AND email_count > 0 THEN '🔥 HOT - Ready'
        WHEN priority_score >= 15 THEN '🔥 HOT - Need Emails'
        WHEN priority_score >= 10 AND email_count > 0 THEN '✅ WARM - Ready'
        WHEN priority_score >= 10 THEN '✅ WARM - Need Emails'
        ELSE '❄️ COOL'
    END as action_status
FROM scored_prospects
WHERE has_eos_titles = true OR eos_keywords_found IS NOT NULL
ORDER BY priority_score DESC, email_count DESC
LIMIT 50;

-- ========================================
-- 13. DUPLICATE CHECK
-- ========================================
WITH potential_dupes AS (
    SELECT 
        company_name,
        COUNT(*) as occurrence_count,
        STRING_AGG(id::text, ', ') as duplicate_ids,
        STRING_AGG(website, ', ') as websites
    FROM prospects
    GROUP BY company_name
    HAVING COUNT(*) > 1
)
SELECT * FROM potential_dupes
ORDER BY occurrence_count DESC;

-- ========================================
-- 14. SIGNAL STRENGTH ANALYSIS
-- ========================================
SELECT 
    ps.signal_type,
    COUNT(DISTINCT ps.prospect_id) as prospects_with_signal,
    ROUND(AVG(ps.signal_strength), 1) as avg_strength,
    MAX(ps.signal_strength) as max_strength,
    STRING_AGG(DISTINCT p.company_name, ', ' ORDER BY p.company_name LIMIT 5) as example_companies
FROM prospect_signals ps
JOIN prospects p ON ps.prospect_id = p.id
GROUP BY ps.signal_type
ORDER BY prospects_with_signal DESC;