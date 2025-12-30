-- Migration: Create meeting_errors table for tracking and alerting on meeting issues
-- This enables proactive monitoring and alerting when users experience meeting problems

CREATE TABLE IF NOT EXISTS meeting_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    session_id UUID REFERENCES meeting_sessions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Error classification
    error_type VARCHAR(50) NOT NULL, -- 'start_failed', 'conclude_failed', 'websocket_disconnect', 'transcription_failed', 'snapshot_failed', 'data_loss'
    severity VARCHAR(20) NOT NULL DEFAULT 'error', -- 'warning', 'error', 'critical'
    
    -- Error details
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB, -- Additional context like request body, user agent, etc.
    
    -- Meeting context
    meeting_type VARCHAR(50), -- 'level10', 'quarterly', 'annual', etc.
    meeting_phase VARCHAR(100), -- Which phase/section the error occurred in
    participants_count INTEGER,
    
    -- Alert tracking
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_meeting_errors_org ON meeting_errors(organization_id);
CREATE INDEX idx_meeting_errors_type ON meeting_errors(error_type);
CREATE INDEX idx_meeting_errors_severity ON meeting_errors(severity);
CREATE INDEX idx_meeting_errors_created ON meeting_errors(created_at DESC);
CREATE INDEX idx_meeting_errors_unacknowledged ON meeting_errors(acknowledged, created_at DESC) WHERE acknowledged = FALSE;
CREATE INDEX idx_meeting_errors_meeting ON meeting_errors(meeting_id) WHERE meeting_id IS NOT NULL;

-- Comment on table
COMMENT ON TABLE meeting_errors IS 'Tracks meeting-related errors for monitoring and alerting';
