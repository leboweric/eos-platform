-- Add 'weekly-express' as a valid meeting type
-- This allows Express meetings to have their own distinct meeting type

-- Drop the existing constraint
ALTER TABLE meeting_sessions DROP CONSTRAINT meeting_sessions_meeting_type_check;

-- Add the new constraint with 'weekly-express' included
ALTER TABLE meeting_sessions ADD CONSTRAINT meeting_sessions_meeting_type_check 
  CHECK (meeting_type IN ('weekly', 'weekly-express', 'quarterly', 'annual'));