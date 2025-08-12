-- Run migration to add notes column to scorecard_scores table
-- This allows users to add context to their weekly/monthly score entries

ALTER TABLE scorecard_scores 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better query performance when filtering by scores with notes
CREATE INDEX IF NOT EXISTS idx_scorecard_scores_notes 
ON scorecard_scores(metric_id, week_date) 
WHERE notes IS NOT NULL;

-- Check if the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scorecard_scores' 
AND column_name = 'notes';

-- Test: Check a few recent scores to see if notes column exists
SELECT id, metric_id, week_date, value, notes 
FROM scorecard_scores 
ORDER BY updated_at DESC 
LIMIT 5;