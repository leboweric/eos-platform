-- Quick Process Documentation Tables Creation
-- Run this in pgAdmin to get processes working immediately

-- Main process documentation table
CREATE TABLE IF NOT EXISTS process_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    team_id UUID,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    process_type VARCHAR(50) DEFAULT 'core_process',
    owner_user_id UUID,
    owner_name VARCHAR(255),
    description TEXT,
    purpose TEXT,
    outcomes TEXT,
    storage_type VARCHAR(50) DEFAULT 'internal',
    storage_config JSONB,
    content JSONB,
    external_url TEXT,
    external_file_id TEXT,
    external_last_synced TIMESTAMP WITH TIME ZONE,
    version VARCHAR(20) DEFAULT '1.0',
    followed_by_all_percentage INTEGER DEFAULT 0,
    last_reviewed_date DATE,
    review_frequency_days INTEGER DEFAULT 90,
    next_review_date DATE,
    methodology_type VARCHAR(50),
    is_core_process BOOLEAN DEFAULT false,
    complexity_level VARCHAR(20),
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Process steps (for internal storage)
CREATE TABLE IF NOT EXISTS process_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    bullets JSONB,
    responsible_role VARCHAR(255),
    estimated_time VARCHAR(100),
    tools_required TEXT[],
    resources JSONB,
    attachments JSONB, -- Store attachment data here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process attachments
CREATE TABLE IF NOT EXISTS process_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    step_id UUID REFERENCES process_steps(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_url TEXT,
    file_data BYTEA, -- Store file content in DB
    uploaded_by UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process acknowledgments
CREATE TABLE IF NOT EXISTS process_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_document_id UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quiz_score INTEGER,
    comments TEXT,
    UNIQUE(process_document_id, user_id)
);

-- Process templates
CREATE TABLE IF NOT EXISTS process_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    methodology_type VARCHAR(50),
    description TEXT,
    template_data JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    created_by UUID,
    is_system_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_process_documents_org ON process_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_process_documents_team ON process_documents(team_id);
CREATE INDEX IF NOT EXISTS idx_process_documents_owner ON process_documents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_process_steps_document ON process_steps(process_document_id);
CREATE INDEX IF NOT EXISTS idx_process_attachments_document ON process_attachments(process_document_id);
CREATE INDEX IF NOT EXISTS idx_process_acknowledgments_document ON process_acknowledgments(process_document_id);
CREATE INDEX IF NOT EXISTS idx_process_acknowledgments_user ON process_acknowledgments(user_id);