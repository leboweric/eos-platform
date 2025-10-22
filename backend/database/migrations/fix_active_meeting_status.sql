-- Fix specific meeting that is active but marked as completed
-- Meeting ID: f9db5ce9-d77d-4bda-8efc-9463e2e64fad
-- User reported they are actively in this meeting but it shows as 'completed'

-- First, let's see the current state
SELECT 
  id, 
  status, 
  created_at,
  completed_at,
  title,
  team_id,
  organization_id
FROM meetings 
WHERE id = 'f9db5ce9-d77d-4bda-8efc-9463e2e64fad';

-- Fix the status to reflect reality
UPDATE meetings 
SET 
  status = 'in-progress',
  completed_at = NULL,
  updated_at = NOW()
WHERE id = 'f9db5ce9-d77d-4bda-8efc-9463e2e64fad';

-- Verify the fix
SELECT 
  id, 
  status, 
  created_at,
  completed_at,
  title
FROM meetings 
WHERE id = 'f9db5ce9-d77d-4bda-8efc-9463e2e64fad';