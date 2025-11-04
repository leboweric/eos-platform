-- Migration: Add AI tracking fields to meeting_conclusions table
-- Date: 2025-11-03

-- Add columns to track AI usage and other meeting metadata
ALTER TABLE meeting_conclusions 
ADD COLUMN IF NOT EXISTS used_ai_notes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_notes_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS participant_count INTEGER,
ADD COLUMN IF NOT EXISTS meeting_duration_minutes INTEGER;

-- Add index for efficient querying of AI usage
CREATE INDEX IF NOT EXISTS idx_meeting_conclusions_ai_usage 
  ON meeting_conclusions(used_ai_notes, concluded_at);

-- Add comments for documentation
COMMENT ON COLUMN meeting_conclusions.used_ai_notes IS 'Whether AI note-taking assistant was used during this meeting';
COMMENT ON COLUMN meeting_conclusions.ai_notes_started_at IS 'When AI transcription was started';
COMMENT ON COLUMN meeting_conclusions.participant_count IS 'Number of participants in the meeting';
COMMENT ON COLUMN meeting_conclusions.meeting_duration_minutes IS 'Total duration of the meeting in minutes';