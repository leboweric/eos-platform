-- Create cascading_messages table to store messages that cascade between teams
CREATE TABLE IF NOT EXISTS cascading_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    from_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create indexes for cascading_messages
CREATE INDEX IF NOT EXISTS idx_cascading_messages_org ON cascading_messages (organization_id);
CREATE INDEX IF NOT EXISTS idx_cascading_messages_from_team ON cascading_messages (from_team_id);
CREATE INDEX IF NOT EXISTS idx_cascading_messages_meeting_date ON cascading_messages (meeting_date);

-- Create cascading_message_recipients table to track which teams receive each message
CREATE TABLE IF NOT EXISTS cascading_message_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES cascading_messages(id) ON DELETE CASCADE,
    to_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID REFERENCES users(id),
    
    -- Ensure a message is only sent once to each team
    UNIQUE(message_id, to_team_id)
);

-- Create indexes for cascading_message_recipients
CREATE INDEX IF NOT EXISTS idx_cascade_recipients_message ON cascading_message_recipients (message_id);
CREATE INDEX IF NOT EXISTS idx_cascade_recipients_team ON cascading_message_recipients (to_team_id);
CREATE INDEX IF NOT EXISTS idx_cascade_recipients_unread ON cascading_message_recipients (to_team_id, is_read) WHERE is_read = FALSE;

-- Add comments
COMMENT ON TABLE cascading_messages IS 'Stores messages that cascade from one team to others during weekly meetings';
COMMENT ON TABLE cascading_message_recipients IS 'Tracks which teams receive each cascading message and read status';
COMMENT ON COLUMN cascading_messages.meeting_date IS 'The date of the meeting when this message was created';
COMMENT ON COLUMN cascading_message_recipients.is_read IS 'Whether the receiving team has acknowledged seeing this message';