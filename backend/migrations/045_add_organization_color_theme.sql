-- Migration: Add color theme fields to organizations table
-- This allows organizations to customize their brand colors

-- Add color theme columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS theme_primary_color VARCHAR(7) DEFAULT '#3B82F6',  -- Default blue
ADD COLUMN IF NOT EXISTS theme_secondary_color VARCHAR(7) DEFAULT '#1E40AF', -- Darker blue
ADD COLUMN IF NOT EXISTS theme_accent_color VARCHAR(7) DEFAULT '#60A5FA';    -- Light blue

-- Add some preset themes for quick selection
CREATE TABLE IF NOT EXISTS color_theme_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  accent_color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default preset themes
INSERT INTO color_theme_presets (name, primary_color, secondary_color, accent_color) VALUES
('Blue (Default)', '#3B82F6', '#1E40AF', '#60A5FA'),
('Orange (Vibrant)', '#FB923C', '#C2410C', '#FED7AA'),
('Green (Growth)', '#10B981', '#047857', '#86EFAC'),
('Purple (Professional)', '#8B5CF6', '#5B21B6', '#C4B5FD'),
('Red (Energy)', '#EF4444', '#B91C1C', '#FCA5A5'),
('Teal (Modern)', '#14B8A6', '#0F766E', '#5EEAD4'),
('Gray (Neutral)', '#6B7280', '#374151', '#D1D5DB'),
('Indigo (Trust)', '#6366F1', '#4338CA', '#A5B4FC');

-- Set Boyum's theme to orange if they exist
UPDATE organizations 
SET 
  theme_primary_color = '#FB923C',
  theme_secondary_color = '#C2410C',
  theme_accent_color = '#FED7AA'
WHERE slug = 'boyum';

-- Add index for faster preset lookups
CREATE INDEX IF NOT EXISTS idx_color_theme_presets_name ON color_theme_presets(name);