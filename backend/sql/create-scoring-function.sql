-- CREATE PROSPECT SCORING FUNCTION
-- Run this in pgAdmin to create the missing function

-- 1. Create the calculate_prospect_score function
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
    
    -- Update the prospect's score and tier
    UPDATE prospects 
    SET 
        prospect_score = LEAST(v_score, 100),
        prospect_tier = CASE 
            WHEN v_score >= 20 THEN 'hot'
            WHEN v_score >= 10 THEN 'warm'
            WHEN v_score >= 5 THEN 'cool'
            ELSE 'cold'
        END
    WHERE id = p_prospect_id;
    
    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- 2. Test the function
SELECT calculate_prospect_score(id) as score, company_name
FROM prospects
WHERE has_eos_titles = true
LIMIT 5;

-- 3. Update all prospect scores
UPDATE prospects
SET prospect_score = calculate_prospect_score(id);

-- 4. Check score distribution
SELECT 
    prospect_tier,
    COUNT(*) as count,
    AVG(prospect_score) as avg_score
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