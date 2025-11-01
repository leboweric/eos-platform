-- Create user_activity table for tracking user engagement and feature usage
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    page_path VARCHAR(255),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for time-range queries
CREATE INDEX IF NOT EXISTS user_activity_org_created_idx 
ON user_activity (organization_id, created_at DESC);

-- Create index for user activity queries
CREATE INDEX IF NOT EXISTS user_activity_user_created_idx 
ON user_activity (user_id, created_at DESC);

-- Create index for feature usage analysis
CREATE INDEX IF NOT EXISTS user_activity_feature_org_idx 
ON user_activity (feature_name, organization_id, created_at DESC);

-- Create index for session tracking
CREATE INDEX IF NOT EXISTS user_activity_session_idx 
ON user_activity (session_id, created_at);

-- Add comment
COMMENT ON TABLE user_activity IS 'Tracks user actions and feature usage for analytics and monitoring';