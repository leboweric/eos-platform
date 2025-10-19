-- Add is_active column to users table for soft deactivation
-- This allows administrators to deactivate users without deleting them

-- Add the is_active column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set all existing users to active
UPDATE users 
SET is_active = true 
WHERE is_active IS NULL;

-- Create index for performance when filtering inactive users
CREATE INDEX IF NOT EXISTS idx_users_is_active 
ON users(is_active) 
WHERE is_active = false;

-- Add comment for documentation
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active. Inactive users cannot log in but their data is preserved.';