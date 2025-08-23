-- FIX WEBSITE URLs - Version 2
-- Since LinkedIn URLs are numeric IDs, we'll generate from company names

-- 1. First, check current state
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN website ~ '^www\.[0-9]+\.com$' THEN 1 END) as numeric_websites,
    COUNT(CASE WHEN website IS NULL THEN 1 END) as no_website
FROM prospects
WHERE has_eos_titles = true;

-- 2. Generate websites from company names (more intelligent approach)
WITH website_generation AS (
    SELECT 
        id,
        company_name,
        website as current_website,
        -- Clean and generate domain from company name
        CASE 
            WHEN company_name IS NOT NULL THEN
                'www.' || 
                lower(
                    -- Remove special characters and common suffixes
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(
                                regexp_replace(
                                    regexp_replace(
                                        regexp_replace(company_name, 
                                            '™|®|©', '', 'g'),  -- Remove trademark symbols
                                        '\s*(-|–)\s*.*', '', 'g'),  -- Remove everything after dash
                                    '(,?\s+(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Limited|Corporation|Corp\.?|Company|Co\.?|Group|Services|Consulting|Solutions|Consultants|Associates|Partners|International|Global|Worldwide|Systems|Technologies|Software|Digital|Online|Media|Marketing|Capital|Ventures|Holdings|Enterprises|Industries)).*$', '', 'gi'),
                                '[^a-z0-9]', '', 'g'),  -- Remove non-alphanumeric
                            '^the', '', 'g'),  -- Remove leading 'the'
                        '^(.{2,30}).*', '\1', 'g')  -- Limit length
                ) || '.com'
            ELSE NULL
        END as generated_website
    FROM prospects
    WHERE has_eos_titles = true
        AND (website IS NULL OR website ~ '^www\.[0-9]+\.com$')
)
SELECT 
    company_name,
    current_website,
    generated_website
FROM website_generation
ORDER BY company_name
LIMIT 30;

-- 3. UPDATE with generated websites (REVIEW ABOVE FIRST!)
UPDATE prospects
SET website = 
    'www.' || 
    lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(company_name, 
                                '™|®|©', '', 'g'),
                            '\s*(-|–)\s*.*', '', 'g'),
                        '(,?\s+(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Limited|Corporation|Corp\.?|Company|Co\.?|Group|Services|Consulting|Solutions|Consultants|Associates|Partners|International|Global|Worldwide|Systems|Technologies|Software|Digital|Online|Media|Marketing|Capital|Ventures|Holdings|Enterprises|Industries)).*$', '', 'gi'),
                    '[^a-z0-9]', '', 'g'),
                '^the', '', 'g'),
            '^(.{2,30}).*', '\1', 'g')
    ) || '.com'
WHERE has_eos_titles = true
    AND (website IS NULL OR website ~ '^www\.[0-9]+\.com$')
    AND company_name IS NOT NULL
    AND LENGTH(company_name) > 2;

-- 4. Manual fixes for known companies
UPDATE prospects
SET website = CASE 
    WHEN company_name = '360 Financial' THEN 'www.360financial.net'
    WHEN company_name = 'HARMAN International' THEN 'www.harman.com'
    WHEN company_name = 'Tim Hortons' THEN 'www.timhortons.com'
    WHEN company_name = 'Gallagher' THEN 'www.ajg.com'
    WHEN company_name = 'Colliers' THEN 'www.colliers.com'
    WHEN company_name = 'Raytheon Technologies' THEN 'www.rtx.com'
    WHEN company_name = 'IBMGlobal' THEN 'www.ibm.com'
    WHEN company_name = 'Bloom Growth™' THEN 'www.bloomgrowth.com'
    WHEN company_name = 'High Plains Bank' THEN 'www.hpbank.com'
    WHEN company_name = 'Bellweather Design-Build' THEN 'www.bellweatherdb.com'
    WHEN company_name = 'Onalytica' THEN 'www.onalytica.com'
    WHEN company_name = 'Four Kitchens' THEN 'www.fourkitchens.com'
    WHEN company_name = 'Derick Dermatology' THEN 'www.derickdermatology.com'
    WHEN company_name = 'AutoPayPlus' THEN 'www.autopayplus.com'
    WHEN company_name = 'AccuBuild Construction Software' THEN 'www.accubuild.com'
    WHEN company_name = 'Valve+Meter Performance Marketing' THEN 'www.valvemeter.com'
    WHEN company_name = 'VisionSpark' THEN 'www.visionspark.com'
    WHEN company_name LIKE '%VisionSpark%' THEN 'www.visionspark.com'
    WHEN company_name = 'AFS' THEN 'www.afs.net'
    WHEN company_name = 'ABM - Allen Business Machines' THEN 'www.abmabm.com'
    WHEN company_name = 'Acuity Marketing Inc. & CarPro' THEN 'www.acuitymarketing.com'
    WHEN company_name = 'Adair Homes- 2021 National Home Quality Award Winner' THEN 'www.adairhomes.com'
    WHEN company_name = 'addy' THEN 'www.addy.co'
    WHEN company_name = 'Angels on Call Homecare' THEN 'www.angelsoncallhomecare.com'
    WHEN company_name = 'Animal Hospital of Statesville' THEN 'www.animalhospitalofstatesville.com'
    WHEN company_name = 'Boulder Insight' THEN 'www.boulderinsight.com'
    WHEN company_name = 'Schneider Saddlery' THEN 'www.schneidersaddlery.com'
    WHEN company_name = 'Bollman Hat Company' THEN 'www.bollmanhats.com'
    WHEN company_name = 'Private Home Care LLC' THEN 'www.privatehomecare.com'
    WHEN company_name = 'Windsor Engineers' THEN 'www.windsorengineers.com'
    WHEN company_name = 'Schuil Coffee Company' THEN 'www.schuilcoffee.com'
    WHEN company_name = 'Retirement by Design' THEN 'www.retirementbydesign.com'
    WHEN company_name = 'Acoustic Evolution' THEN 'www.acousticevolution.com'
    WHEN company_name = 'Aleshire & Wynder, LLP' THEN 'www.awattorneys.com'
    ELSE website
END
WHERE company_name IN (
    '360 Financial', 'HARMAN International', 'Tim Hortons', 'Gallagher', 'Colliers',
    'Raytheon Technologies', 'IBMGlobal', 'Bloom Growth™', 'High Plains Bank',
    'Bellweather Design-Build', 'Onalytica', 'Four Kitchens', 'Derick Dermatology',
    'AutoPayPlus', 'AccuBuild Construction Software', 'Valve+Meter Performance Marketing',
    'VisionSpark', 'AFS', 'ABM - Allen Business Machines', 'Acuity Marketing Inc. & CarPro',
    'Adair Homes- 2021 National Home Quality Award Winner', 'addy', 'Angels on Call Homecare',
    'Animal Hospital of Statesville', 'Boulder Insight', 'Schneider Saddlery', 'Bollman Hat Company',
    'Private Home Care LLC', 'Windsor Engineers', 'Schuil Coffee Company', 'Retirement by Design',
    'Acoustic Evolution', 'Aleshire & Wynder, LLP'
)
OR company_name LIKE '%VisionSpark%';

-- 5. Handle special cases (Self-employed, Freelance, etc.)
UPDATE prospects
SET website = NULL
WHERE company_name IN ('Self-employed', 'Freelance', 'Independent', 'Confidentiel')
    AND has_eos_titles = true;

-- 6. Clean up any resulting bad websites
UPDATE prospects
SET website = NULL
WHERE website IN ('www..com', 'www.com', 'www.selfemployed.com', 'www.freelance.com')
   OR LENGTH(regexp_replace(website, '^www\.|\.[a-z]+$', '', 'g')) < 2;

-- 7. Verify the results
SELECT 
    COUNT(*) as total_eos_integrators,
    COUNT(website) as with_website,
    COUNT(CASE WHEN website !~ '^www\.[0-9]+\.com$' AND website IS NOT NULL THEN 1 END) as non_numeric_websites,
    ROUND(COUNT(website)::numeric / COUNT(*)::numeric * 100, 1) as website_coverage_pct
FROM prospects
WHERE has_eos_titles = true;

-- 8. Show sample of the websites
SELECT 
    company_name,
    website,
    CASE 
        WHEN website ~ '^www\.[0-9]+\.com$' THEN '❌ Still Numeric'
        WHEN website IS NULL THEN '⚠️ No Website'
        ELSE '✅ Fixed'
    END as status
FROM prospects
WHERE has_eos_titles = true
ORDER BY 
    CASE 
        WHEN website ~ '^www\.[0-9]+\.com$' THEN 1
        WHEN website IS NULL THEN 2
        ELSE 3
    END,
    company_name
LIMIT 50;