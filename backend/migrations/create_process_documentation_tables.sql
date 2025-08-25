-- Process Documentation System for AXP
-- Supports EOS Core Processes, Scaling Up Process Maps, and other methodologies
-- Integrates with both internal storage and external cloud providers

-- Main process documentation table
CREATE TABLE IF NOT EXISTS process_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- NULL = organization-wide process
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- Sales, Operations, Finance, HR, etc.
    process_type VARCHAR(50) DEFAULT 'core_process', -- core_process, checklist, sop, playbook
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_name VARCHAR(255), -- Denormalized for display
    
    -- Process Content (stored in DB for quick access)
    description TEXT,
    purpose TEXT, -- Why this process exists
    outcomes TEXT, -- Expected results
    
    -- Storage Configuration
    storage_type VARCHAR(50) DEFAULT 'internal', -- internal, google_drive, onedrive, sharepoint
    storage_config JSONB, -- Provider-specific configuration
    
    -- For internal storage
    content JSONB, -- Full process steps stored as JSON
    
    -- For external storage
    external_url TEXT, -- Link to Google Doc, OneDrive file, etc.
    external_file_id TEXT, -- Provider's file ID for API access
    external_last_synced TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    version VARCHAR(20) DEFAULT '1.0',
    followed_by_all_percentage INTEGER DEFAULT 0 CHECK (followed_by_all_percentage >= 0 AND followed_by_all_percentage <= 100),
    last_reviewed_date DATE,
    review_frequency_days INTEGER DEFAULT 90, -- How often to review
    next_review_date DATE, -- Will be calculated via trigger or in application
    
    -- Methodology-specific fields
    methodology_type VARCHAR(50), -- eos, scaling_up, 4dx, okr, custom
    is_core_process BOOLEAN DEFAULT false, -- For EOS: is this one of the 6-10 core processes?
    complexity_level VARCHAR(20), -- simple, detailed, comprehensive
    
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived, under_review
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_process_name_per_org UNIQUE(organization_id, name)
);

-- Process steps (for internal storage)
CREATE TABLE IF NOT EXISTS process_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    
    -- Step Information
    step_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Detailed bullets/sub-steps
    bullets JSONB, -- Array of bullet points
    
    -- Additional details
    responsible_role VARCHAR(255), -- Who performs this step
    estimated_time VARCHAR(100), -- How long this step typically takes
    tools_required TEXT[], -- Software, equipment, etc.
    
    -- Attachments/Resources
    resources JSONB, -- Links to templates, examples, videos
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_step_number_per_process UNIQUE(process_document_id, step_number)
);

-- Process attachments (for supporting documents)
CREATE TABLE IF NOT EXISTS process_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    
    -- Attachment details
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50), -- pdf, doc, xlsx, png, etc.
    file_size INTEGER, -- in bytes
    
    -- Storage (follows same pattern as main documents)
    storage_type VARCHAR(50) DEFAULT 'internal',
    
    -- For internal storage
    file_content BYTEA,
    
    -- For external storage
    external_url TEXT,
    external_file_id TEXT,
    
    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_storage_type CHECK (
        (storage_type = 'internal' AND file_content IS NOT NULL) OR
        (storage_type != 'internal' AND external_url IS NOT NULL)
    )
);

-- Process training/acknowledgments
CREATE TABLE IF NOT EXISTS process_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Acknowledgment details
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version_acknowledged VARCHAR(20), -- Which version they acknowledged
    
    -- Training tracking
    training_completed BOOLEAN DEFAULT false,
    training_completed_date DATE,
    quiz_score INTEGER, -- Optional quiz/test score
    
    -- Comments/Feedback
    feedback TEXT,
    needs_clarification BOOLEAN DEFAULT false,
    clarification_notes TEXT,
    
    CONSTRAINT unique_user_process_ack UNIQUE(process_document_id, user_id)
);

-- Process change history
CREATE TABLE IF NOT EXISTS process_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    
    -- Change details
    version_from VARCHAR(20),
    version_to VARCHAR(20),
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- What changed
    change_type VARCHAR(50), -- content, owner, status, etc.
    change_summary TEXT,
    change_details JSONB, -- Detailed diff of changes
    
    -- Snapshot of previous version
    previous_content JSONB
);

-- Process templates (pre-built processes for different industries/methodologies)
CREATE TABLE IF NOT EXISTS process_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template information
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    methodology_type VARCHAR(50), -- eos, scaling_up, 4dx, okr
    industry VARCHAR(100), -- manufacturing, saas, services, retail, etc.
    
    -- Template content
    description TEXT,
    content JSONB, -- Full template structure
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    
    -- Metadata
    is_public BOOLEAN DEFAULT true,
    created_by VARCHAR(255), -- Could be 'AXP Team' or user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process categories configuration (customizable per organization)
CREATE TABLE IF NOT EXISTS process_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color for UI
    icon VARCHAR(50), -- Icon name for UI
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_category_per_org UNIQUE(organization_id, name)
);

-- Indexes for performance
CREATE INDEX idx_process_documents_org ON process_documents(organization_id);
CREATE INDEX idx_process_documents_status ON process_documents(status);
CREATE INDEX idx_process_documents_owner ON process_documents(owner_user_id);
CREATE INDEX idx_process_documents_next_review ON process_documents(next_review_date);
CREATE INDEX idx_process_steps_document ON process_steps(process_document_id);
CREATE INDEX idx_process_attachments_document ON process_attachments(process_document_id);
CREATE INDEX idx_process_acknowledgments_user ON process_acknowledgments(user_id);
CREATE INDEX idx_process_acknowledgments_document ON process_acknowledgments(process_document_id);
CREATE INDEX idx_process_change_history_document ON process_change_history(process_document_id);

-- Function to calculate next review date
CREATE OR REPLACE FUNCTION update_next_review_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_reviewed_date IS NOT NULL AND NEW.review_frequency_days IS NOT NULL THEN
        NEW.next_review_date := NEW.last_reviewed_date + (NEW.review_frequency_days || ' days')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update next_review_date
CREATE TRIGGER trigger_update_next_review_date
BEFORE INSERT OR UPDATE OF last_reviewed_date, review_frequency_days
ON process_documents
FOR EACH ROW
EXECUTE FUNCTION update_next_review_date();

-- Default categories for new organizations
INSERT INTO process_categories (organization_id, name, color, icon, display_order)
SELECT 
    o.id,
    cat.name,
    cat.color,
    cat.icon,
    cat.display_order
FROM organizations o
CROSS JOIN (VALUES 
    ('Sales & Marketing', '#3B82F6', 'trending-up', 1),
    ('Operations', '#10B981', 'settings', 2),
    ('Finance', '#F59E0B', 'dollar-sign', 3),
    ('Human Resources', '#8B5CF6', 'users', 4),
    ('Customer Success', '#EC4899', 'heart', 5),
    ('Technology', '#6B7280', 'cpu', 6)
) AS cat(name, color, icon, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM process_categories pc 
    WHERE pc.organization_id = o.id 
    AND pc.name = cat.name
);

-- Sample process templates
INSERT INTO process_templates (name, category, methodology_type, industry, description, content)
VALUES 
(
    'EOS Sales Process',
    'Sales & Marketing',
    'eos',
    'general',
    'Standard EOS-style sales process with qualifying steps',
    '{
        "steps": [
            {
                "number": 1,
                "title": "Identify",
                "bullets": ["Target market criteria", "Referral or inbound", "Initial research"]
            },
            {
                "number": 2,
                "title": "Connect",
                "bullets": ["First contact within 24 hours", "Understand their pain", "Schedule discovery call"]
            },
            {
                "number": 3,
                "title": "Qualify",
                "bullets": ["Budget confirmed", "Decision maker identified", "Timeline established", "Need validated"]
            },
            {
                "number": 4,
                "title": "Present",
                "bullets": ["Customized demo", "ROI calculation", "Reference provided", "Q&A addressed"]
            },
            {
                "number": 5,
                "title": "Close",
                "bullets": ["Proposal sent", "Terms negotiated", "Contract signed", "Kickoff scheduled"]
            },
            {
                "number": 6,
                "title": "Deliver",
                "bullets": ["Onboarding completed", "Success metrics tracked", "Regular check-ins", "Upsell opportunities"]
            }
        ]
    }'
),
(
    'Employee Onboarding Process',
    'Human Resources',
    'eos',
    'general',
    'Comprehensive employee onboarding following EOS principles',
    '{
        "steps": [
            {
                "number": 1,
                "title": "Pre-Arrival",
                "bullets": ["Send welcome package", "IT equipment ordered", "Workspace prepared", "Team notified"]
            },
            {
                "number": 2,
                "title": "Day 1",
                "bullets": ["Office tour", "IT setup", "Paperwork completed", "Meet manager", "Review role"]
            },
            {
                "number": 3,
                "title": "Week 1",
                "bullets": ["Core values training", "Meet team members", "Review accountability chart", "Initial projects assigned"]
            },
            {
                "number": 4,
                "title": "Month 1",
                "bullets": ["Complete training modules", "Shadow team members", "First L10 meeting", "30-day check-in"]
            },
            {
                "number": 5,
                "title": "Quarter 1",
                "bullets": ["Own first rock", "Contribute to scorecard", "90-day review", "Full integration"]
            }
        ]
    }'
);

-- Comments for documentation
COMMENT ON TABLE process_documents IS 'Core process documentation supporting multiple storage providers and methodologies';
COMMENT ON TABLE process_steps IS 'Detailed steps for internally stored processes';
COMMENT ON TABLE process_attachments IS 'Supporting files and resources for processes';
COMMENT ON TABLE process_acknowledgments IS 'Track who has read and been trained on processes';
COMMENT ON TABLE process_change_history IS 'Audit trail of process changes';
COMMENT ON TABLE process_templates IS 'Pre-built process templates for quick setup';
COMMENT ON TABLE process_categories IS 'Customizable process categories per organization';