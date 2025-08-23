-- FIX BROKEN WEBSITE URLs
-- Run this in pgAdmin to fix the website URLs

-- 1. First, see what we're dealing with
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN website ~ '^[0-9]+\.com$' THEN 1 END) as numeric_websites,
    COUNT(CASE WHEN website IS NULL THEN 1 END) as no_website,
    COUNT(CASE WHEN website IS NOT NULL AND website !~ '^[0-9]+\.com$' THEN 1 END) as valid_websites
FROM prospects
WHERE has_eos_titles = true;

-- 2. Preview the fixes we'll make (based on LinkedIn URLs)
WITH website_fixes AS (
    SELECT 
        id,
        company_name,
        website as old_website,
        linkedin_url,
        CASE 
            -- Extract from LinkedIn URL
            WHEN linkedin_url ~ 'linkedin.com/company/([^/]+)' 
            THEN 'www.' || regexp_replace(
                regexp_replace(linkedin_url, '.*linkedin.com/company/([^/]+).*', '\1', 'g'),
                '-', '', 'g'
            ) || '.com'
            -- Generate from company name
            ELSE 'www.' || lower(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(company_name, '\s*(LLC|Inc\.?|Ltd\.?|Corporation|Corp\.?|Company|Co\.?|Group|Services|Consulting|Solutions)$', '', 'gi'),
                        '[^a-zA-Z0-9]', '', 'g'
                    ),
                    '^(.{1,30}).*', '\1', 'g'
                )
            ) || '.com'
        END as new_website
    FROM prospects
    WHERE has_eos_titles = true
        AND (
            website IS NULL 
            OR website ~ '^[0-9]+\.com$'
            OR LENGTH(website) < 5
        )
)
SELECT 
    company_name,
    old_website,
    new_website,
    linkedin_url
FROM website_fixes
LIMIT 20;

-- 3. ACTUAL FIX - Update websites based on LinkedIn URLs
-- IMPORTANT: Review the preview above before running this!
UPDATE prospects
SET website = 
    CASE 
        -- Extract from LinkedIn URL if available
        WHEN linkedin_url ~ 'linkedin.com/company/([^/]+)' 
        THEN 'www.' || regexp_replace(
            regexp_replace(linkedin_url, '.*linkedin.com/company/([^/]+).*', '\1', 'g'),
            '-', '', 'g'
        ) || '.com'
        -- Otherwise generate from company name
        ELSE 'www.' || lower(
            regexp_replace(
                regexp_replace(
                    regexp_replace(company_name, '\s*(LLC|Inc\.?|Ltd\.?|Corporation|Corp\.?|Company|Co\.?|Group|Services|Consulting|Solutions)$', '', 'gi'),
                    '[^a-zA-Z0-9]', '', 'g'
                ),
                '^(.{1,30}).*', '\1', 'g'
            )
        ) || '.com'
    END
WHERE has_eos_titles = true
    AND (
        website IS NULL 
        OR website ~ '^[0-9]+\.com$'  -- Numeric websites
        OR LENGTH(website) < 5
    );

-- 4. Fix known companies with specific domains
UPDATE prospects
SET website = CASE company_name
    WHEN 'HARMAN International' THEN 'www.harman.com'
    WHEN 'Tim Hortons' THEN 'www.timhortons.com'
    WHEN 'Gallagher' THEN 'www.ajg.com'
    WHEN 'Colliers' THEN 'www.colliers.com'
    WHEN 'Raytheon Technologies' THEN 'www.rtx.com'
    WHEN 'IBMGlobal' THEN 'www.ibm.com'
    WHEN 'Bloom Growth™' THEN 'www.bloomgrowth.com'
    WHEN 'High Plains Bank' THEN 'www.hpbank.com'
    WHEN 'Bellweather Design-Build' THEN 'www.bellweatherdb.com'
    WHEN 'Onalytica' THEN 'www.onalytica.com'
    WHEN 'Four Kitchens' THEN 'www.fourkitchens.com'
    WHEN 'Derick Dermatology' THEN 'www.derickdermatology.com'
    WHEN 'AutoPayPlus' THEN 'www.autopayplus.com'
    WHEN 'AccuBuild Construction Software' THEN 'www.accubuild.com'
    ELSE website
END
WHERE company_name IN (
    'HARMAN International', 'Tim Hortons', 'Gallagher', 'Colliers',
    'Raytheon Technologies', 'IBMGlobal', 'Bloom Growth™', 'High Plains Bank',
    'Bellweather Design-Build', 'Onalytica', 'Four Kitchens', 'Derick Dermatology',
    'AutoPayPlus', 'AccuBuild Construction Software'
);

-- 5. Clean up website format (remove http://, add www. if missing)
UPDATE prospects
SET website = 
    CASE 
        WHEN website ~ '^https?://' THEN regexp_replace(website, '^https?://', '', 'g')
        WHEN website !~ '^www\.' THEN 'www.' || website
        ELSE website
    END
WHERE website IS NOT NULL
    AND has_eos_titles = true;

-- 6. Verify the results
SELECT 
    COUNT(*) as total_eos_integrators,
    COUNT(website) as with_website,
    COUNT(CASE WHEN website ~ '^www\.' THEN 1 END) as proper_format,
    ROUND(COUNT(website)::numeric / COUNT(*)::numeric * 100, 1) as website_coverage_pct
FROM prospects
WHERE has_eos_titles = true;

-- 7. Show sample of fixed websites
SELECT 
    company_name,
    website,
    linkedin_url
FROM prospects
WHERE has_eos_titles = true
    AND website IS NOT NULL
ORDER BY company_name
LIMIT 30;

-- 8. Show prospects that still need manual website lookup
SELECT 
    company_name,
    website,
    linkedin_url
FROM prospects
WHERE has_eos_titles = true
    AND (
        website IS NULL
        OR website = 'www..com'
        OR LENGTH(regexp_replace(website, '^www\.', '', 'g')) < 5
    )
ORDER BY company_name
LIMIT 20;