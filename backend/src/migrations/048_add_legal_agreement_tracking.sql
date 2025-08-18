-- Add legal agreement tracking to users table and create audit log
-- This tracks user acceptance of Terms of Service and Privacy Policy for legal compliance

-- Add columns to users table for agreement tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS agreement_ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS agreement_user_agent TEXT;

-- Create legal agreement audit log table for comprehensive tracking
CREATE TABLE IF NOT EXISTS legal_agreement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agreement_type VARCHAR(50) NOT NULL, -- 'terms_of_service' or 'privacy_policy'
  version VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'accepted', 'updated', 'rejected'
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  browser_info JSONB, -- Additional browser/device info
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_legal_agreement_log_user_id ON legal_agreement_log(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_agreement_log_accepted_at ON legal_agreement_log(accepted_at);
CREATE INDEX IF NOT EXISTS idx_legal_agreement_log_agreement_type ON legal_agreement_log(agreement_type);

-- Create a function to track agreement acceptance
CREATE OR REPLACE FUNCTION track_legal_agreement(
  p_user_id UUID,
  p_agreement_type VARCHAR(50),
  p_version VARCHAR(20),
  p_ip_address VARCHAR(45),
  p_user_agent TEXT,
  p_browser_info JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert into audit log
  INSERT INTO legal_agreement_log (
    user_id,
    agreement_type,
    version,
    action,
    ip_address,
    user_agent,
    browser_info
  ) VALUES (
    p_user_id,
    p_agreement_type,
    p_version,
    'accepted',
    p_ip_address,
    p_user_agent,
    p_browser_info
  );
  
  -- Update user record based on agreement type
  IF p_agreement_type = 'terms_of_service' THEN
    UPDATE users 
    SET 
      terms_accepted_at = CURRENT_TIMESTAMP,
      terms_version = p_version,
      agreement_ip_address = COALESCE(agreement_ip_address, p_ip_address),
      agreement_user_agent = COALESCE(agreement_user_agent, p_user_agent)
    WHERE id = p_user_id;
  ELSIF p_agreement_type = 'privacy_policy' THEN
    UPDATE users 
    SET 
      privacy_accepted_at = CURRENT_TIMESTAMP,
      privacy_version = p_version,
      agreement_ip_address = COALESCE(agreement_ip_address, p_ip_address),
      agreement_user_agent = COALESCE(agreement_user_agent, p_user_agent)
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE legal_agreement_log IS 'Audit log for all legal agreement acceptances for compliance and legal protection';
COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted Terms of Service';
COMMENT ON COLUMN users.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy';
COMMENT ON COLUMN users.terms_version IS 'Version of Terms of Service accepted';
COMMENT ON COLUMN users.privacy_version IS 'Version of Privacy Policy accepted';
COMMENT ON COLUMN users.agreement_ip_address IS 'IP address from which agreements were accepted';
COMMENT ON COLUMN users.agreement_user_agent IS 'User agent string when agreements were accepted';

-- Create a view for easy compliance reporting
CREATE OR REPLACE VIEW user_legal_compliance AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.created_at AS user_created_at,
  u.terms_accepted_at,
  u.privacy_accepted_at,
  u.terms_version,
  u.privacy_version,
  u.agreement_ip_address,
  CASE 
    WHEN u.terms_accepted_at IS NOT NULL AND u.privacy_accepted_at IS NOT NULL 
    THEN 'compliant'
    ELSE 'non_compliant'
  END AS compliance_status,
  (SELECT COUNT(*) FROM legal_agreement_log WHERE user_id = u.id) AS total_agreement_actions
FROM users u;

COMMENT ON VIEW user_legal_compliance IS 'View for monitoring user legal agreement compliance';