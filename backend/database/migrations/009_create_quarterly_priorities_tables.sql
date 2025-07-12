-- Create quarterly predictions table
CREATE TABLE IF NOT EXISTS quarterly_predictions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quarter VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    year INTEGER NOT NULL,
    revenue_target DECIMAL(15, 2) DEFAULT 0,
    revenue_current DECIMAL(15, 2) DEFAULT 0,
    profit_target DECIMAL(15, 2) DEFAULT 0,
    profit_current DECIMAL(15, 2) DEFAULT 0,
    measurables_on_track INTEGER DEFAULT 0,
    measurables_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, quarter, year)
);

-- Create quarterly priorities table
CREATE TABLE IF NOT EXISTS quarterly_priorities (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    due_date DATE NOT NULL,
    quarter VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    year INTEGER NOT NULL,
    is_company_priority BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'on-track' CHECK (status IN ('on-track', 'off-track', 'complete')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create priority milestones table
CREATE TABLE IF NOT EXISTS priority_milestones (
    id UUID PRIMARY KEY,
    priority_id UUID NOT NULL REFERENCES quarterly_priorities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create priority updates table
CREATE TABLE IF NOT EXISTS priority_updates (
    id UUID PRIMARY KEY,
    priority_id UUID NOT NULL REFERENCES quarterly_priorities(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    status_change VARCHAR(20) CHECK (status_change IN ('on-track', 'off-track', 'complete')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_org_quarter_year 
ON quarterly_priorities(organization_id, quarter, year);

CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_owner 
ON quarterly_priorities(owner_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_company 
ON quarterly_priorities(organization_id, is_company_priority);

CREATE INDEX IF NOT EXISTS idx_priority_milestones_priority 
ON priority_milestones(priority_id);

CREATE INDEX IF NOT EXISTS idx_priority_updates_priority 
ON priority_updates(priority_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_predictions_org_quarter 
ON quarterly_predictions(organization_id, quarter, year);