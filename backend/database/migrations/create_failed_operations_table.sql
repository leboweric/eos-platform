-- Create failed_operations table for tracking silent failures
CREATE TABLE IF NOT EXISTS failed_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'email', 'stripe', 'oauth', 'file', 'socket'
    operation_name VARCHAR(100) NOT NULL, -- e.g., 'send_welcome_email', 'process_webhook'
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB, -- Additional debugging context
    severity VARCHAR(20) DEFAULT 'error', -- 'warning', 'error', 'critical'
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_failed_operations_organization ON failed_operations(organization_id);
CREATE INDEX idx_failed_operations_operation_type ON failed_operations(operation_type);
CREATE INDEX idx_failed_operations_severity ON failed_operations(severity);
CREATE INDEX idx_failed_operations_created_at ON failed_operations(created_at DESC);
CREATE INDEX idx_failed_operations_resolved ON failed_operations(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_failed_operations_context ON failed_operations USING GIN(context);

-- Comment the table and columns
COMMENT ON TABLE failed_operations IS 'Tracks all silent failures in the system for proactive monitoring';
COMMENT ON COLUMN failed_operations.operation_type IS 'Category of operation that failed';
COMMENT ON COLUMN failed_operations.operation_name IS 'Specific operation or function that failed';
COMMENT ON COLUMN failed_operations.context IS 'JSONB field with flexible debugging information';
COMMENT ON COLUMN failed_operations.severity IS 'Severity level: warning, error, or critical';
COMMENT ON COLUMN failed_operations.resolved_at IS 'Timestamp when the issue was marked as resolved';
COMMENT ON COLUMN failed_operations.resolved_by IS 'User who marked the issue as resolved';
