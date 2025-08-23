-- Create missing prospect tables if they don't exist
-- Run this in pgAdmin on Railway database

-- Check what tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'prospect%'
ORDER BY tablename;

-- Create prospects table if missing
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    linkedin_url VARCHAR(500),
    employee_count INTEGER,
    revenue_estimate DECIMAL(12,2),
    industry VARCHAR(100),
    location VARCHAR(255),
    description TEXT,
    technologies_used JSONB,
    growth_rate DECIMAL(5,2),
    recent_funding JSONB,
    using_competitor VARCHAR(50),
    has_eos_titles BOOLEAN DEFAULT false,
    eos_keywords_found TEXT[],
    eos_implementer VARCHAR(255),
    prospect_score INTEGER DEFAULT 0,
    prospect_tier VARCHAR(20) DEFAULT 'cold',
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(100),
    source_date TIMESTAMP,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_date TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospects_company ON prospects(company_name);
CREATE INDEX IF NOT EXISTS idx_prospects_tier ON prospects(prospect_tier);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(prospect_score DESC);

-- Create prospect_contacts table
CREATE TABLE IF NOT EXISTS prospect_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    is_decision_maker BOOLEAN DEFAULT false,
    is_eos_role BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_prospect ON prospect_contacts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON prospect_contacts(email);

-- Create prospect_signals table
CREATE TABLE IF NOT EXISTS prospect_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    signal_type VARCHAR(100),
    signal_strength INTEGER DEFAULT 5,
    signal_data JSONB,
    source VARCHAR(100),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signals_prospect ON prospect_signals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON prospect_signals(signal_type);

-- Create competitor_reviews table
CREATE TABLE IF NOT EXISTS competitor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    competitor VARCHAR(50),
    review_platform VARCHAR(50),
    rating DECIMAL(2,1),
    review_text TEXT,
    review_date DATE,
    reviewer_name VARCHAR(255),
    reviewer_company VARCHAR(255),
    mentions_switching BOOLEAN DEFAULT false,
    pain_points TEXT[],
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create prospect_outreach table
CREATE TABLE IF NOT EXISTS prospect_outreach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES prospect_contacts(id),
    outreach_type VARCHAR(50),
    outreach_date TIMESTAMP,
    subject VARCHAR(500),
    message TEXT,
    status VARCHAR(50),
    response_date TIMESTAMP,
    response_text TEXT,
    next_action VARCHAR(200),
    next_action_date DATE,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily summary table
CREATE TABLE IF NOT EXISTS prospect_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE UNIQUE,
    total_prospects INTEGER DEFAULT 0,
    new_prospects_today INTEGER DEFAULT 0,
    hot_prospects INTEGER DEFAULT 0,
    warm_prospects INTEGER DEFAULT 0,
    cold_prospects INTEGER DEFAULT 0,
    enriched_today INTEGER DEFAULT 0,
    emails_found_today INTEGER DEFAULT 0,
    competitor_users_found INTEGER DEFAULT 0,
    reviews_scraped INTEGER DEFAULT 0,
    outreach_sent_today INTEGER DEFAULT 0,
    responses_received_today INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify all tables were created
SELECT 
    'prospects' as table_name,
    EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospects') as exists
UNION ALL
SELECT 
    'prospect_contacts',
    EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_contacts')
UNION ALL
SELECT 
    'prospect_signals',
    EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_signals')
UNION ALL
SELECT 
    'competitor_reviews',
    EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competitor_reviews')
UNION ALL
SELECT 
    'prospect_outreach',
    EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_outreach')
UNION ALL
SELECT 
    'prospect_daily_summary',
    EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_daily_summary');