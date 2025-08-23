-- DEBUG WHY ENRICHMENT ISN'T MATCHING

-- 1. Check if we have duplicate contacts or name variations
SELECT 
    pc.first_name,
    pc.last_name,
    COUNT(*) as count,
    STRING_AGG(p.company_name, ', ') as companies
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
GROUP BY pc.first_name, pc.last_name
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- 2. Sample of contacts we're trying to match
SELECT 
    pc.first_name,
    pc.last_name,
    pc.title,
    p.company_name,
    p.website
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
    AND pc.email IS NULL
ORDER BY p.prospect_score DESC
LIMIT 10;

-- 3. Check the one contact that DID get an email
SELECT 
    p.company_name,
    pc.first_name,
    pc.last_name,
    pc.title,
    pc.email,
    pc.last_updated
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.email IS NOT NULL
    AND p.has_eos_titles = true;

-- 4. Check if names have special characters or formatting issues
SELECT 
    pc.first_name,
    pc.last_name,
    LENGTH(pc.first_name) as fname_length,
    LENGTH(pc.last_name) as lname_length,
    CASE 
        WHEN pc.first_name ~ '[^A-Za-z\s-]' THEN 'Has special chars'
        ELSE 'Clean'
    END as fname_status,
    CASE 
        WHEN pc.last_name ~ '[^A-Za-z\s-]' THEN 'Has special chars'
        ELSE 'Clean'
    END as lname_status
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
    AND (
        pc.first_name ~ '[^A-Za-z\s-]' OR
        pc.last_name ~ '[^A-Za-z\s-]' OR
        LENGTH(pc.first_name) < 2 OR
        LENGTH(pc.last_name) < 2
    )
LIMIT 20;