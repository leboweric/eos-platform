-- Create table for detailed user login tracking
-- This enables daily active user reports and engagement analytics

CREATE TABLE IF NOT EXISTS user_login_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    login_date DATE DEFAULT CURRENT_DATE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    auth_method VARCHAR(50), -- 'password', 'google', 'microsoft', 'refresh_token'
    session_duration_minutes INTEGER, -- Will be updated when user logs out or session expires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_login_tracking_date ON user_login_tracking(login_date);
CREATE INDEX idx_user_login_tracking_user_date ON user_login_tracking(user_id, login_date);
CREATE INDEX idx_user_login_tracking_org_date ON user_login_tracking(organization_id, login_date);
CREATE INDEX idx_user_login_tracking_timestamp ON user_login_tracking(login_timestamp);

-- Create a view for daily active users by organization
CREATE OR REPLACE VIEW daily_active_users AS
SELECT 
    organization_id,
    login_date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_logins
FROM user_login_tracking
GROUP BY organization_id, login_date;

-- Create a function to get yesterday's active users with details
CREATE OR REPLACE FUNCTION get_daily_login_report(report_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS TABLE (
    organization_name VARCHAR,
    user_email VARCHAR,
    user_name VARCHAR,
    login_count BIGINT,
    first_login_time TIME,
    last_login_time TIME,
    total_session_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name as organization_name,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        COUNT(ult.id) as login_count,
        MIN(ult.login_timestamp::TIME) as first_login_time,
        MAX(ult.login_timestamp::TIME) as last_login_time,
        SUM(COALESCE(ult.session_duration_minutes, 0))::INTEGER as total_session_minutes
    FROM user_login_tracking ult
    JOIN users u ON ult.user_id = u.id
    JOIN organizations o ON ult.organization_id = o.id
    WHERE ult.login_date = report_date
    GROUP BY o.name, u.email, u.first_name, u.last_name
    ORDER BY o.name, u.email;
END;
$$ LANGUAGE plpgsql;

-- Add column to users table to track who should receive daily reports
ALTER TABLE users ADD COLUMN IF NOT EXISTS receive_daily_login_reports BOOLEAN DEFAULT FALSE;

-- Create a function to get report recipients
CREATE OR REPLACE FUNCTION get_daily_report_recipients()
RETURNS TABLE (
    email VARCHAR,
    first_name VARCHAR,
    organization_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        u.first_name,
        o.name as organization_name
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.receive_daily_login_reports = TRUE
        AND u.role IN ('admin', 'owner');
END;
$$ LANGUAGE plpgsql;