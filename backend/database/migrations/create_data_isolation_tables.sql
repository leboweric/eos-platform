-- Create data isolation violations tracking table
CREATE TABLE IF NOT EXISTS data_isolation_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_type VARCHAR(50) NOT NULL, -- 'orphaned_record', 'missing_org_filter', 'cross_tenant_access', 'unauthorized_access'
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    description TEXT NOT NULL,
    query_info JSONB, -- Additional context about the query/violation
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to avoid duplicate violations
    CONSTRAINT unique_violation UNIQUE (table_name, record_id, violation_type)
);

-- Create isolation check audit log
CREATE TABLE IF NOT EXISTS isolation_check_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type VARCHAR(50) NOT NULL, -- 'orphaned_records', 'missing_filters', 'cross_tenant', 'full_scan'
    table_name VARCHAR(100), -- NULL means all tables
    records_checked INTEGER DEFAULT 0,
    violations_found INTEGER DEFAULT 0,
    check_duration_ms INTEGER,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_violations_type ON data_isolation_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON data_isolation_violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_resolved ON data_isolation_violations(resolved);
CREATE INDEX IF NOT EXISTS idx_violations_table ON data_isolation_violations(table_name);
CREATE INDEX IF NOT EXISTS idx_violations_org ON data_isolation_violations(organization_id);
CREATE INDEX IF NOT EXISTS idx_violations_detected ON data_isolation_violations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_violations_composite ON data_isolation_violations(resolved, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_check_log_type ON isolation_check_log(check_type);
CREATE INDEX IF NOT EXISTS idx_check_log_performed ON isolation_check_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_log_table ON isolation_check_log(table_name);

-- Add comments
COMMENT ON TABLE data_isolation_violations IS 'Tracks multi-tenant data isolation violations and breaches';
COMMENT ON TABLE isolation_check_log IS 'Audit trail of data isolation checks performed';

COMMENT ON COLUMN data_isolation_violations.violation_type IS 'Type of isolation violation detected';
COMMENT ON COLUMN data_isolation_violations.severity IS 'Severity level: critical (immediate risk), high (potential risk), medium (policy violation), low (minor issue)';
COMMENT ON COLUMN data_isolation_violations.query_info IS 'JSON metadata about the query or context that led to violation detection';

-- Create a view for quick health status
CREATE OR REPLACE VIEW isolation_health_status AS
SELECT 
    COUNT(*) FILTER (WHERE resolved = false) as active_violations,
    COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high' AND resolved = false) as high_count,
    COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '24 hours') as violations_24h,
    COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '7 days') as violations_7d,
    MAX(detected_at) as last_violation_detected,
    (
        SELECT performed_at 
        FROM isolation_check_log 
        ORDER BY performed_at DESC 
        LIMIT 1
    ) as last_check_performed
FROM data_isolation_violations;

-- Create a function to get affected organizations
CREATE OR REPLACE FUNCTION get_affected_organizations()
RETURNS TABLE (
    organization_id UUID,
    organization_name VARCHAR(255),
    violation_count BIGINT,
    critical_count BIGINT,
    last_violation TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.organization_id,
        o.name as organization_name,
        COUNT(*) as violation_count,
        COUNT(*) FILTER (WHERE v.severity = 'critical') as critical_count,
        MAX(v.detected_at) as last_violation
    FROM data_isolation_violations v
    LEFT JOIN organizations o ON v.organization_id = o.id
    WHERE v.resolved = false
    GROUP BY v.organization_id, o.name
    ORDER BY violation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON data_isolation_violations TO authenticated;
GRANT INSERT, UPDATE ON data_isolation_violations TO authenticated;
GRANT SELECT ON isolation_check_log TO authenticated;
GRANT INSERT ON isolation_check_log TO authenticated;
GRANT SELECT ON isolation_health_status TO authenticated;