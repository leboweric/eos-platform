-- CRITICAL MIGRATION: Prevent null team_id in meeting-related operations
-- This prevents email summaries from going to wrong recipients
-- Run this in pgAdmin on the production database

-- ===============================================
-- 1. Add CHECK constraints to prevent null/invalid team_ids
-- ===============================================

-- Ensure cascading_messages always has a valid from_team_id
ALTER TABLE cascading_messages 
ADD CONSTRAINT check_from_team_id_not_null 
CHECK (from_team_id IS NOT NULL);

-- Ensure cascading_message_recipients has valid team_ids
ALTER TABLE cascading_message_recipients
ADD CONSTRAINT check_to_team_id_not_null 
CHECK (to_team_id IS NOT NULL);

-- ===============================================
-- 2. Add CHECK constraints to prevent zero UUID
-- ===============================================

-- Prevent the shared zero UUID in cascading messages
ALTER TABLE cascading_messages
ADD CONSTRAINT check_from_team_not_zero_uuid 
CHECK (from_team_id != '00000000-0000-0000-0000-000000000000');

ALTER TABLE cascading_message_recipients
ADD CONSTRAINT check_to_team_not_zero_uuid 
CHECK (to_team_id != '00000000-0000-0000-0000-000000000000');

-- ===============================================
-- 3. Add similar constraints to other team-related tables
-- ===============================================

-- Quarterly priorities (Rocks)
ALTER TABLE quarterly_priorities
ADD CONSTRAINT check_priority_team_not_zero_uuid 
CHECK (team_id IS NULL OR team_id != '00000000-0000-0000-0000-000000000000');

-- Issues
ALTER TABLE issues
ADD CONSTRAINT check_issue_team_not_zero_uuid 
CHECK (team_id IS NULL OR team_id != '00000000-0000-0000-0000-000000000000');

-- Todos
ALTER TABLE todos
ADD CONSTRAINT check_todo_team_not_zero_uuid 
CHECK (team_id IS NULL OR team_id != '00000000-0000-0000-0000-000000000000');

-- Scorecard metrics
ALTER TABLE scorecard_metrics
ADD CONSTRAINT check_metric_team_not_zero_uuid 
CHECK (team_id IS NULL OR team_id != '00000000-0000-0000-0000-000000000000');

-- Meeting conclusions (for tracking)
ALTER TABLE meeting_conclusions
ADD CONSTRAINT check_conclusion_team_not_zero_uuid 
CHECK (team_id != '00000000-0000-0000-0000-000000000000');

-- ===============================================
-- 4. Create trigger to validate team_id belongs to correct organization
-- ===============================================

CREATE OR REPLACE FUNCTION validate_team_organization()
RETURNS TRIGGER AS $$
DECLARE
    team_org_id UUID;
    record_org_id UUID;
BEGIN
    -- Skip if team_id is NULL (some tables allow this)
    IF NEW.team_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get the organization_id from the teams table
    SELECT organization_id INTO team_org_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- If team doesn't exist, reject
    IF team_org_id IS NULL THEN
        RAISE EXCEPTION 'Team ID % does not exist', NEW.team_id;
    END IF;
    
    -- Get the organization_id from the record
    IF TG_TABLE_NAME IN ('quarterly_priorities', 'issues', 'todos', 'scorecard_metrics') THEN
        record_org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'cascading_messages' THEN
        record_org_id := NEW.organization_id;
    ELSE
        -- For tables without organization_id, skip validation
        RETURN NEW;
    END IF;
    
    -- Validate team belongs to the same organization
    IF team_org_id != record_org_id THEN
        RAISE EXCEPTION 'Team % does not belong to organization %', NEW.team_id, record_org_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to critical tables
CREATE TRIGGER validate_team_org_quarterly_priorities
    BEFORE INSERT OR UPDATE ON quarterly_priorities
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_organization();

CREATE TRIGGER validate_team_org_issues
    BEFORE INSERT OR UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_organization();

CREATE TRIGGER validate_team_org_todos
    BEFORE INSERT OR UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_organization();

CREATE TRIGGER validate_team_org_scorecard_metrics
    BEFORE INSERT OR UPDATE ON scorecard_metrics
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_organization();

CREATE TRIGGER validate_team_org_cascading_messages
    BEFORE INSERT OR UPDATE ON cascading_messages
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_organization();

-- ===============================================
-- 5. Create audit log for meeting conclusions
-- ===============================================

CREATE TABLE IF NOT EXISTS meeting_conclusion_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_type VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    team_id UUID NOT NULL,
    concluded_by UUID NOT NULL,
    concluded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_recipients TEXT[],
    email_sent BOOLEAN DEFAULT false,
    email_error TEXT,
    meeting_data JSONB,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (concluded_by) REFERENCES users(id)
);

-- Index for quick lookups
CREATE INDEX idx_meeting_audit_org_team ON meeting_conclusion_audit(organization_id, team_id);
CREATE INDEX idx_meeting_audit_concluded_at ON meeting_conclusion_audit(concluded_at DESC);

-- ===============================================
-- 6. Add comment explaining the critical nature
-- ===============================================

COMMENT ON CONSTRAINT check_from_team_id_not_null ON cascading_messages IS 
'CRITICAL: Prevents null team_id which could cause meeting summaries to go to wrong recipients';

COMMENT ON CONSTRAINT check_from_team_not_zero_uuid ON cascading_messages IS 
'CRITICAL: Prevents shared zero UUID which causes cross-organization data leakage';

-- ===============================================
-- 7. Verification queries (run these to check)
-- ===============================================

-- Check for any existing null team_ids in critical tables
SELECT 'cascading_messages with null from_team_id' as issue, COUNT(*) 
FROM cascading_messages 
WHERE from_team_id IS NULL;

SELECT 'cascading_message_recipients with null to_team_id' as issue, COUNT(*) 
FROM cascading_message_recipients 
WHERE to_team_id IS NULL;

-- Check for any zero UUIDs still in use
SELECT 'Records using zero UUID' as issue, 
       'cascading_messages' as table_name, COUNT(*) 
FROM cascading_messages 
WHERE from_team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Records using zero UUID', 'quarterly_priorities', COUNT(*) 
FROM quarterly_priorities 
WHERE team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Records using zero UUID', 'issues', COUNT(*) 
FROM issues 
WHERE team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Records using zero UUID', 'todos', COUNT(*) 
FROM todos 
WHERE team_id = '00000000-0000-0000-0000-000000000000';

-- ===============================================
-- END OF CRITICAL MIGRATION
-- ===============================================