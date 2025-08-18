-- Add organization terminology customization table
-- This allows organizations to customize terminology to match their framework (EOS, OKRs, Scaling Up, etc.)

CREATE TABLE IF NOT EXISTS organization_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Core terminology customizations
  priorities_label VARCHAR(50) DEFAULT 'Quarterly Priorities',
  priority_singular VARCHAR(50) DEFAULT 'Priority',
  scorecard_label VARCHAR(50) DEFAULT 'Scorecard',
  issues_label VARCHAR(50) DEFAULT 'Issues',
  issue_singular VARCHAR(50) DEFAULT 'Issue',
  todos_label VARCHAR(50) DEFAULT 'To-Dos',
  todo_singular VARCHAR(50) DEFAULT 'To-Do',
  
  -- Meeting terminology
  weekly_meeting_label VARCHAR(100) DEFAULT 'Weekly Accountability Meeting',
  quarterly_meeting_label VARCHAR(100) DEFAULT 'Quarterly Planning Meeting',
  
  -- Planning terminology
  long_term_vision_label VARCHAR(50) DEFAULT 'Long-term Vision (3 Years)',
  annual_goals_label VARCHAR(50) DEFAULT 'Annual Goals',
  business_blueprint_label VARCHAR(50) DEFAULT 'Business Blueprint',
  
  -- Process terminology
  problem_solving_process VARCHAR(100) DEFAULT 'Issues & Problem Solving',
  
  -- Time periods
  quarter_label VARCHAR(30) DEFAULT 'Quarter',
  year_label VARCHAR(30) DEFAULT 'Year',
  
  -- Additional customizable terms
  organization_label VARCHAR(50) DEFAULT 'Organization',
  team_label VARCHAR(50) DEFAULT 'Team',
  department_label VARCHAR(50) DEFAULT 'Department',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_org_terminology UNIQUE(organization_id)
);

-- Create index for fast lookups
CREATE INDEX idx_org_terminology_org_id ON organization_terminology(organization_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_terminology_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_terminology_updated_at_trigger
BEFORE UPDATE ON organization_terminology
FOR EACH ROW
EXECUTE FUNCTION update_terminology_updated_at();

-- Insert default terminology for existing organizations
INSERT INTO organization_terminology (organization_id)
SELECT id FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM organization_terminology WHERE organization_id = organizations.id
);

-- Add comment explaining the table
COMMENT ON TABLE organization_terminology IS 'Stores customizable terminology for each organization to support different business frameworks (EOS, OKRs, Scaling Up, etc.)';