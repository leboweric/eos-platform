-- Organizational Chart Database Schema
-- Phase 1: Core structure implementation

BEGIN;

-- 1. Create organizational_charts table
CREATE TABLE organizational_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    is_template BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one type of scope is set
    CONSTRAINT check_chart_scope CHECK (
        (team_id IS NULL AND department_id IS NULL) OR  -- Organization level
        (team_id IS NOT NULL AND department_id IS NULL) OR  -- Team level
        (team_id IS NULL AND department_id IS NOT NULL)  -- Department level
    )
);

-- 2. Create positions table (seats in the organizational structure)
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES organizational_charts(id) ON DELETE CASCADE,
    parent_position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    position_type VARCHAR(50) CHECK (position_type IN ('leadership', 'management', 'individual_contributor')),
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create position_holders table (who sits in each seat)
CREATE TABLE position_holders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    external_name VARCHAR(255), -- For people not in the system
    external_email VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either user_id or external info is provided
    CONSTRAINT check_holder_info CHECK (
        user_id IS NOT NULL OR 
        (external_name IS NOT NULL AND external_email IS NOT NULL)
    )
);

-- 4. Create skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('technical', 'leadership', 'communication', 'analytical', 'other')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique skill names per organization
    CONSTRAINT unique_org_skill UNIQUE (organization_id, name)
);

-- 5. Create position_skills table (required skills for positions)
CREATE TABLE position_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    importance_level VARCHAR(20) CHECK (importance_level IN ('required', 'preferred', 'nice_to_have')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate skills per position
    CONSTRAINT unique_position_skill UNIQUE (position_id, skill_id)
);

-- 6. Create user_skills table (skills that users/holders have)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    position_holder_id UUID REFERENCES position_holders(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Either user or position holder
    CONSTRAINT check_skill_owner CHECK (
        (user_id IS NOT NULL AND position_holder_id IS NULL) OR 
        (user_id IS NULL AND position_holder_id IS NOT NULL)
    ),
    
    -- Unique skill per user/holder
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_id),
    CONSTRAINT unique_holder_skill UNIQUE (position_holder_id, skill_id)
);

-- 7. Create position_responsibilities table
CREATE TABLE position_responsibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    responsibility TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create chart_sharing table
CREATE TABLE chart_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES organizational_charts(id) ON DELETE CASCADE,
    shared_with_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) CHECK (permission_level IN ('view', 'comment', 'edit')),
    shared_by UUID NOT NULL REFERENCES users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Share with either org or user
    CONSTRAINT check_share_target CHECK (
        (shared_with_organization_id IS NOT NULL AND shared_with_user_id IS NULL) OR 
        (shared_with_organization_id IS NULL AND shared_with_user_id IS NOT NULL)
    ),
    
    -- Unique sharing per target
    CONSTRAINT unique_org_share UNIQUE (chart_id, shared_with_organization_id),
    CONSTRAINT unique_user_share UNIQUE (chart_id, shared_with_user_id)
);

-- 9. Create chart_comments table
CREATE TABLE chart_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES organizational_charts(id) ON DELETE CASCADE,
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES chart_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create chart_history table for version tracking
CREATE TABLE chart_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES organizational_charts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    change_type VARCHAR(50) CHECK (change_type IN ('created', 'position_added', 'position_removed', 'position_updated', 'holder_changed', 'structure_changed')),
    change_description TEXT,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique version per chart
    CONSTRAINT unique_chart_version UNIQUE (chart_id, version)
);

-- Create indexes for performance
CREATE INDEX idx_positions_chart_id ON positions(chart_id);
CREATE INDEX idx_positions_parent_id ON positions(parent_position_id);
CREATE INDEX idx_position_holders_position_id ON position_holders(position_id);
CREATE INDEX idx_position_holders_user_id ON position_holders(user_id);
CREATE INDEX idx_position_skills_position_id ON position_skills(position_id);
CREATE INDEX idx_position_skills_skill_id ON position_skills(skill_id);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_chart_sharing_chart_id ON chart_sharing(chart_id);
CREATE INDEX idx_chart_comments_chart_id ON chart_comments(chart_id);
CREATE INDEX idx_chart_history_chart_id ON chart_history(chart_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizational_charts_updated_at BEFORE UPDATE ON organizational_charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_position_holders_updated_at BEFORE UPDATE ON position_holders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_position_responsibilities_updated_at BEFORE UPDATE ON position_responsibilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_comments_updated_at BEFORE UPDATE ON chart_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;