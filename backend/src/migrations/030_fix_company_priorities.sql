-- Fix Company Priorities team assignment
-- Company Priorities should always belong to the Leadership Team

-- First, let's identify Company Priorities that have incorrect team assignments
-- (i.e., not assigned to Leadership Team UUID)
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    -- Update Company Priorities to belong to Leadership Team
    UPDATE quarterly_priorities
    SET 
        team_id = '00000000-0000-0000-0000-000000000000'::uuid,
        updated_at = NOW()
    WHERE 
        is_company_priority = true 
        AND (team_id != '00000000-0000-0000-0000-000000000000'::uuid OR team_id IS NULL);
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    IF fixed_count > 0 THEN
        RAISE NOTICE 'Fixed % Company Priorities with incorrect team assignments', fixed_count;
    ELSE
        RAISE NOTICE 'No Company Priorities needed fixing';
    END IF;
END $$;

-- Add a check constraint to enforce this business rule going forward
-- (This will prevent future data integrity issues)
ALTER TABLE quarterly_priorities 
ADD CONSTRAINT company_priorities_must_be_leadership_team
CHECK (
    (is_company_priority = false) OR 
    (is_company_priority = true AND team_id = '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Create an index to optimize queries for Company Priorities
CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_company_priority 
ON quarterly_priorities(is_company_priority) 
WHERE is_company_priority = true;