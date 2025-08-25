-- Update default scorecard terminology to be more generic
-- "Scorecard" is EOS-specific, "Metrics" is more universal

-- Update the column default for new organizations
ALTER TABLE organization_terminology 
ALTER COLUMN scorecard_label SET DEFAULT 'Metrics';

-- Update existing organizations that haven't customized from the old default
UPDATE organization_terminology 
SET scorecard_label = 'Metrics'
WHERE scorecard_label = 'Scorecard'
  AND business_blueprint_label = '2-Page Plan'; -- Only update generic orgs, not EOS orgs

-- Ensure EOS organizations keep "Scorecard"
UPDATE organization_terminology 
SET scorecard_label = 'Scorecard'
WHERE business_blueprint_label = 'V/TO';