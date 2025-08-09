-- Create user preferences table for storing user-specific settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- UI Preferences
  scorecard_rtl BOOLEAN DEFAULT false,
  scorecard_show_total BOOLEAN DEFAULT true,
  
  -- Default selections
  default_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  default_department_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Other preferences (JSON for flexibility)
  ui_preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one preference record per user
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add comment for clarity
COMMENT ON TABLE user_preferences IS 'Stores user-specific preferences and UI settings';
COMMENT ON COLUMN user_preferences.ui_preferences IS 'Flexible JSON storage for additional UI preferences';

-- Create a table for tracking temporary UI state that needs to persist across sessions
-- but is not critical data (like selected items for bulk operations)
CREATE TABLE IF NOT EXISTS user_ui_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_key VARCHAR(100) NOT NULL,
  state_value JSONB NOT NULL,
  expires_at TIMESTAMP, -- Optional expiration for temporary states
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique state keys per user
  CONSTRAINT unique_user_ui_state UNIQUE(user_id, state_key)
);

-- Create index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_user_ui_state_user_key ON user_ui_state(user_id, state_key);
CREATE INDEX IF NOT EXISTS idx_user_ui_state_expires ON user_ui_state(expires_at) WHERE expires_at IS NOT NULL;

-- Add comment for clarity
COMMENT ON TABLE user_ui_state IS 'Stores temporary UI state that persists across sessions';
COMMENT ON COLUMN user_ui_state.state_key IS 'Key identifying the type of state (e.g., selected_todo_ids, expanded_sections)';
COMMENT ON COLUMN user_ui_state.expires_at IS 'Optional expiration time for temporary states';