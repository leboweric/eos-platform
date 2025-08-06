-- Create rock_suggestions table for storing AI-generated suggestions
CREATE TABLE IF NOT EXISTS rock_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    priority_id UUID REFERENCES quarterly_priorities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('smart_improvement', 'milestone', 'alignment', 'general')),
    original_text TEXT,
    suggested_text TEXT,
    reasoning TEXT,
    metadata JSONB, -- Store additional data like scores, specific improvements, etc.
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rock_suggestions_priority_id ON rock_suggestions(priority_id);
CREATE INDEX IF NOT EXISTS idx_rock_suggestions_organization_id ON rock_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_rock_suggestions_suggestion_type ON rock_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_rock_suggestions_applied ON rock_suggestions(applied);
CREATE INDEX IF NOT EXISTS idx_rock_suggestions_created_at ON rock_suggestions(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE rock_suggestions IS 'Stores AI-generated suggestions for improving Rocks/Priorities';
COMMENT ON COLUMN rock_suggestions.suggestion_type IS 'Type of suggestion: smart_improvement, milestone, alignment, or general';
COMMENT ON COLUMN rock_suggestions.metadata IS 'JSON data containing scores, detailed improvements, etc.';
COMMENT ON COLUMN rock_suggestions.applied IS 'Whether the suggestion was applied by the user';
COMMENT ON COLUMN rock_suggestions.applied_at IS 'When the suggestion was applied';
COMMENT ON COLUMN rock_suggestions.applied_by IS 'User who applied the suggestion';