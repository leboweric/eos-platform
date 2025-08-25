-- Add processes terminology fields to organization_terminology table
ALTER TABLE organization_terminology 
ADD COLUMN IF NOT EXISTS processes_label VARCHAR(100) DEFAULT 'Processes',
ADD COLUMN IF NOT EXISTS process_singular VARCHAR(100) DEFAULT 'Process';

-- Update existing organizations based on their current terminology to infer methodology
-- EOS organizations typically use "V/TO" for business blueprint
UPDATE organization_terminology 
SET processes_label = 'Core Processes',
    process_singular = 'Core Process'
WHERE business_blueprint_label = 'V/TO';

-- Scaling Up organizations typically use "One-Page Strategic Plan"
UPDATE organization_terminology 
SET processes_label = 'Process Maps',
    process_singular = 'Process Map'
WHERE business_blueprint_label = 'One-Page Strategic Plan';

-- 4DX organizations typically use "4DX Scoreboard" or similar
UPDATE organization_terminology 
SET processes_label = 'Standard Work',
    process_singular = 'Standard Work'
WHERE business_blueprint_label LIKE '%4DX%' OR business_blueprint_label LIKE '%WIG%';

-- OKRs organizations typically use "Strategy Document"
UPDATE organization_terminology 
SET processes_label = 'Playbooks',
    process_singular = 'Playbook'
WHERE business_blueprint_label = 'Strategy Document' OR priorities_label = 'Objectives';