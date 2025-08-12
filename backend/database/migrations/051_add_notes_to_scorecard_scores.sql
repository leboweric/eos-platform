-- Add notes column to scorecard_scores table
-- This allows users to add context to their weekly/monthly score entries

ALTER TABLE scorecard_scores 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better query performance when filtering by scores with notes
CREATE INDEX IF NOT EXISTS idx_scorecard_scores_notes 
ON scorecard_scores(metric_id, week_date) 
WHERE notes IS NOT NULL;