-- Create SWOT items table
CREATE TABLE IF NOT EXISTS swot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('strength', 'weakness', 'opportunity', 'threat')),
  content TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_swot_items_org_team_year ON swot_items(organization_id, team_id, year) WHERE deleted_at IS NULL;
CREATE INDEX idx_swot_items_category ON swot_items(category) WHERE deleted_at IS NULL;

-- Add updated_at trigger
CREATE TRIGGER update_swot_items_updated_at
  BEFORE UPDATE ON swot_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE swot_items IS 'Stores SWOT analysis items for annual planning';
COMMENT ON COLUMN swot_items.category IS 'One of: strength, weakness, opportunity, threat';
COMMENT ON COLUMN swot_items.display_order IS 'Order of items within each category';