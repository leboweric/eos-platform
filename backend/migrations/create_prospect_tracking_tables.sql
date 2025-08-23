-- Prospect Tracking System Tables
-- Run this in Railway's PostgreSQL database

-- Main prospects table
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
    
    -- EOS-specific fields
    using_competitor VARCHAR(50),
    has_eos_titles BOOLEAN DEFAULT false,
    eos_keywords_found TEXT[],
    eos_implementer VARCHAR(255),
    
    -- Scoring and status
    prospect_score INTEGER DEFAULT 0,
    prospect_tier VARCHAR(20) DEFAULT 'cold',
    status VARCHAR(50) DEFAULT 'new',
    
    -- Source tracking
    source VARCHAR(100),
    source_date TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_date TIMESTAMP
);

-- Contacts at prospect companies
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

-- Signals and trigger events
CREATE TABLE IF NOT EXISTS prospect_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    signal_type VARCHAR(100),
    signal_strength INTEGER DEFAULT 5,
    signal_data JSONB,
    source VARCHAR(100),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospects_company ON prospects(company_name);
CREATE INDEX IF NOT EXISTS idx_prospects_tier ON prospects(prospect_tier);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_competitor ON prospects(using_competitor);
CREATE INDEX IF NOT EXISTS idx_contacts_prospect ON prospect_contacts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_signals_prospect ON prospect_signals(prospect_id);
