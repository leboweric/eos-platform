-- Prospect Tracking System Schema
-- For identifying and scoring potential AXP customers

-- Main prospects table
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    linkedin_url VARCHAR(500),
    employee_count INT,
    revenue_estimate DECIMAL(15,2),
    industry VARCHAR(100),
    
    -- EOS/Competitor signals
    using_competitor VARCHAR(100), -- 'ninety.io', 'bloom_growth', 'traction_tools'
    competitor_review_rating INT, -- 1-5 stars
    competitor_pain_points TEXT,
    has_eos_titles BOOLEAN DEFAULT FALSE,
    eos_keywords_found TEXT[], -- Array of found keywords like 'L10', 'Rocks', etc
    
    -- Scoring
    prospect_score INT DEFAULT 0,
    prospect_tier VARCHAR(20), -- 'hot', 'warm', 'cold'
    
    -- Enrichment data
    technologies_used JSONB, -- Full tech stack from Apollo
    recent_funding JSONB, -- Funding events
    growth_rate DECIMAL(5,2), -- Year over year %
    
    -- Source tracking
    source VARCHAR(50), -- 'linkedin', 'review_site', 'apollo', 'manual'
    source_date TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'qualified', 'contacted', 'demo_scheduled', 'lost', 'customer'
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_name, website)
);

-- Prospect contacts table
CREATE TABLE IF NOT EXISTS prospect_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    is_decision_maker BOOLEAN DEFAULT FALSE,
    is_eos_role BOOLEAN DEFAULT FALSE, -- Integrator, Visionary, etc
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(email)
);

-- Prospect signals/events table (track all signals over time)
CREATE TABLE IF NOT EXISTS prospect_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    signal_type VARCHAR(50), -- 'job_posting', 'review', 'linkedin_post', 'tech_detected'
    signal_strength INT, -- 1-10 points
    signal_data JSONB, -- Full details of the signal
    source VARCHAR(50),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competitor monitoring table
CREATE TABLE IF NOT EXISTS competitor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
    competitor_name VARCHAR(100),
    review_platform VARCHAR(50), -- 'g2', 'capterra', 'getapp'
    rating INT,
    review_title VARCHAR(500),
    review_text TEXT,
    reviewer_name VARCHAR(200),
    reviewer_company VARCHAR(255),
    review_date DATE,
    pain_points TEXT[],
    
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(competitor_name, review_platform, reviewer_company, review_date)
);

-- Outreach tracking
CREATE TABLE IF NOT EXISTS prospect_outreach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES prospect_contacts(id) ON DELETE CASCADE,
    outreach_type VARCHAR(50), -- 'email', 'linkedin', 'phone'
    outreach_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subject VARCHAR(500),
    message TEXT,
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP,
    response_text TEXT,
    outcome VARCHAR(50) -- 'interested', 'not_interested', 'no_response', 'demo_scheduled'
);

-- Daily prospect summary for reporting
CREATE TABLE IF NOT EXISTS prospect_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE DEFAULT CURRENT_DATE,
    total_prospects INT,
    new_prospects_today INT,
    hot_prospects INT,
    warm_prospects INT,
    competitor_users_found INT,
    reviews_scraped INT,
    outreach_sent INT,
    demos_scheduled INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(summary_date)
);

-- Indexes for performance
CREATE INDEX idx_prospects_score ON prospects(prospect_score DESC);
CREATE INDEX idx_prospects_tier ON prospects(prospect_tier);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_competitor ON prospects(using_competitor);
CREATE INDEX idx_prospects_created ON prospects(created_at DESC);
CREATE INDEX idx_signals_prospect ON prospect_signals(prospect_id);
CREATE INDEX idx_signals_type ON prospect_signals(signal_type);
CREATE INDEX idx_contacts_prospect ON prospect_contacts(prospect_id);
CREATE INDEX idx_reviews_competitor ON competitor_reviews(competitor_name);

-- Function to calculate prospect score
CREATE OR REPLACE FUNCTION calculate_prospect_score(prospect_id UUID)
RETURNS INT AS $$
DECLARE
    total_score INT := 0;
    rec RECORD;
BEGIN
    SELECT * INTO rec FROM prospects WHERE id = prospect_id;
    
    -- Using competitor (10 points)
    IF rec.using_competitor IS NOT NULL THEN
        total_score := total_score + 10;
    END IF;
    
    -- Bad competitor review (10 points)
    IF rec.competitor_review_rating IS NOT NULL AND rec.competitor_review_rating <= 3 THEN
        total_score := total_score + 10;
    END IF;
    
    -- Has EOS titles (8 points)
    IF rec.has_eos_titles THEN
        total_score := total_score + 8;
    END IF;
    
    -- Right company size (5 points)
    IF rec.employee_count BETWEEN 10 AND 250 THEN
        total_score := total_score + 5;
    END IF;
    
    -- High growth rate (5 points)
    IF rec.growth_rate > 20 THEN
        total_score := total_score + 5;
    END IF;
    
    -- Recent funding (3 points)
    IF rec.recent_funding IS NOT NULL THEN
        total_score := total_score + 3;
    END IF;
    
    -- Update the prospect record
    UPDATE prospects 
    SET 
        prospect_score = total_score,
        prospect_tier = CASE
            WHEN total_score >= 15 THEN 'hot'
            WHEN total_score >= 8 THEN 'warm'
            ELSE 'cold'
        END
    WHERE id = prospect_id;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate score on insert/update
CREATE OR REPLACE FUNCTION trigger_calculate_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_prospect_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_score
AFTER INSERT OR UPDATE ON prospects
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_score();