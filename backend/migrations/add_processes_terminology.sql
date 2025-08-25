-- Add processes terminology fields to organization_terminology table
ALTER TABLE organization_terminology 
ADD COLUMN IF NOT EXISTS processes_label VARCHAR(100) DEFAULT 'Processes',
ADD COLUMN IF NOT EXISTS process_singular VARCHAR(100) DEFAULT 'Process';

-- Update existing organizations with EOS terminology to use 'Core Processes'
UPDATE organization_terminology 
SET processes_label = 'Core Processes',
    process_singular = 'Core Process'
WHERE organization_id IN (
    SELECT id FROM organizations 
    WHERE terminology_set = 'eos'
);

-- Update for Scaling Up organizations
UPDATE organization_terminology 
SET processes_label = 'Process Maps',
    process_singular = 'Process Map'
WHERE organization_id IN (
    SELECT id FROM organizations 
    WHERE terminology_set = 'scaling_up'
);

-- Update for 4DX organizations
UPDATE organization_terminology 
SET processes_label = 'Standard Work',
    process_singular = 'Standard Work'
WHERE organization_id IN (
    SELECT id FROM organizations 
    WHERE terminology_set = '4dx'
);

-- Update for OKRs organizations
UPDATE organization_terminology 
SET processes_label = 'Playbooks',
    process_singular = 'Playbook'
WHERE organization_id IN (
    SELECT id FROM organizations 
    WHERE terminology_set = 'okrs'
);