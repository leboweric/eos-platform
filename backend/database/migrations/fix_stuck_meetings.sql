-- Fix stuck meetings that should have been concluded
-- These are test meetings that are showing as 'in-progress' but should be 'completed'

-- First, let's see what we have
SELECT 
  id, 
  status, 
  created_at,
  completed_at,
  organization_id
FROM meetings 
WHERE status = 'in-progress' 
ORDER BY created_at DESC;

-- Update only the specific stuck test meetings to 'completed' status
-- These are the exact 7 meetings shown in the dashboard that are stuck
UPDATE meetings 
SET 
  status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE id IN (
    '664d607d-c283-4cb8-a41c-55a25a5f6b9f',
    'eb8e99d0-8d53-49f0-be75-6d40a01ac723',
    '924221b6-f037-4bf1-841d-5fbecc5b7285',
    '12dcd915-fb6a-42d6-bfc2-a326b838114a',
    'fa834b1a-5e8e-4120-90d0-96b3df83ba8e',
    'cd053b31-1266-492d-9651-00d239f3642a',
    '06ecf603-52c1-49fe-8550-58fb582ac9c7'
);

-- Verify the fix
SELECT 
  COUNT(*) as remaining_in_progress_meetings
FROM meetings 
WHERE status = 'in-progress';

-- Show summary
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM meetings 
GROUP BY status
ORDER BY status;