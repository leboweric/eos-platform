-- CREATE PROSPECT SCORING FUNCTION (Version 2)
-- This version just calculates and returns the score without updating

-- 1. Drop the old function if it exists
DROP FUNCTION IF EXISTS calculate_prospect_score(UUID);

-- 2. Create simplified scoring function
CREATE OR REPLACE FUNCTION calculate_prospect_score(p_prospect_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_prospect RECORD;
    v_signal_count INTEGER;
    v_contact_count INTEGER;
    v_email_count INTEGER;
BEGIN
    -- Get prospect data
    SELECT * INTO v_prospect FROM prospects WHERE id = p_prospect_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Base score from EOS indicators
    IF v_prospect.has_eos_titles THEN
        v_score := v_score + 10;
    END IF;
    
    IF v_prospect.eos_keywords_found IS NOT NULL AND array_length(v_prospect.eos_keywords_found, 1) > 0 THEN
        v_score := v_score + (array_length(v_prospect.eos_keywords_found, 1) * 2);
    END IF;
    
    -- Score from company data
    IF v_prospect.website IS NOT NULL THEN
        v_score := v_score + 2;
    END IF;
    
    IF v_prospect.employee_count BETWEEN 20 AND 250 THEN
        v_score := v_score + 5; -- Sweet spot for EOS
    ELSIF v_prospect.employee_count IS NOT NULL THEN
        v_score := v_score + 2;
    END IF;
    
    IF v_prospect.industry IS NOT NULL THEN
        v_score := v_score + 1;
    END IF;
    
    IF v_prospect.using_competitor IS NOT NULL THEN
        v_score := v_score + 8; -- High value if using competitor
    END IF;
    
    -- Score from contacts
    SELECT COUNT(*) INTO v_contact_count 
    FROM prospect_contacts 
    WHERE prospect_id = p_prospect_id;
    
    SELECT COUNT(*) INTO v_email_count 
    FROM prospect_contacts 
    WHERE prospect_id = p_prospect_id AND email IS NOT NULL;
    
    IF v_contact_count > 0 THEN
        v_score := v_score + 2;
    END IF;
    
    IF v_email_count > 0 THEN
        v_score := v_score + 5;
    END IF;
    
    -- Score from signals
    SELECT COUNT(*) INTO v_signal_count 
    FROM prospect_signals 
    WHERE prospect_id = p_prospect_id;
    
    v_score := v_score + LEAST(v_signal_count * 2, 10);
    
    -- Just return the score, don't update
    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- 3. Test the function
SELECT 
    company_name,
    calculate_prospect_score(id) as calculated_score,
    prospect_score as current_score
FROM prospects
WHERE has_eos_titles = true
LIMIT 10;

-- 4. Manually update scores in a separate transaction
UPDATE prospects
SET 
    prospect_score = calculate_prospect_score(id),
    prospect_tier = CASE 
        WHEN calculate_prospect_score(id) >= 20 THEN 'hot'
        WHEN calculate_prospect_score(id) >= 10 THEN 'warm'
        WHEN calculate_prospect_score(id) >= 5 THEN 'cool'
        ELSE 'cold'
    END
WHERE has_eos_titles = true;

-- 5. Check the results
SELECT 
    prospect_tier,
    COUNT(*) as count,
    AVG(prospect_score) as avg_score,
    MIN(prospect_score) as min_score,
    MAX(prospect_score) as max_score
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

-- 6. Show top scored prospects
SELECT 
    company_name,
    prospect_score,
    prospect_tier,
    has_eos_titles,
    array_length(eos_keywords_found, 1) as keyword_count,
    CASE WHEN website IS NOT NULL THEN '✓' ELSE '✗' END as has_website
FROM prospects
WHERE has_eos_titles = true
ORDER BY prospect_score DESC
LIMIT 20;