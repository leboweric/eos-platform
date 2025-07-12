-- Add is_temporary_password flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_temporary_password ON users(is_temporary_password);