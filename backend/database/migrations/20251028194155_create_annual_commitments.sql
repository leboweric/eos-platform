-- Annual Commitments Table
CREATE TABLE IF NOT EXISTS annual_commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  commitment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_commitment_per_user_per_year 
    UNIQUE(organization_id, team_id, user_id, year)
);

-- Indexes for performance
CREATE INDEX idx_annual_commitments_team_year 
  ON annual_commitments(team_id, year);

CREATE INDEX idx_annual_commitments_user 
  ON annual_commitments(user_id);

-- Updated_at trigger
CREATE TRIGGER update_annual_commitments_updated_at
  BEFORE UPDATE ON annual_commitments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE annual_commitments IS 'Annual "One Thing" commitments made during Annual Planning meetings';
COMMENT ON COLUMN annual_commitments.commitment_text IS 'The commitment text, e.g., "In 2026 I commit to start..."';
COMMENT ON COLUMN annual_commitments.year IS 'The year this commitment is for (e.g., 2026)';