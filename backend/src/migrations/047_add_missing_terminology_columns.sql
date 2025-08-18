-- Add missing terminology columns for accountability chart and milestones
-- These are needed for proper framework terminology support (EOS, OKRs, etc.)

-- Add accountability_chart_label column
ALTER TABLE organization_terminology 
ADD COLUMN IF NOT EXISTS accountability_chart_label VARCHAR(100) DEFAULT 'Organizational Chart';

-- Add milestones_label column  
ALTER TABLE organization_terminology
ADD COLUMN IF NOT EXISTS milestones_label VARCHAR(50) DEFAULT 'Milestones';

-- Update existing rows with framework-specific defaults where applicable
-- This is a one-time update based on current business_blueprint_label to infer framework

-- EOS organizations (identified by V/TO)
UPDATE organization_terminology
SET 
  accountability_chart_label = 'Accountability Chart',
  quarterly_meeting_label = 'Quarterly Pulsing Meeting'
WHERE business_blueprint_label = 'V/TO';

-- OKRs organizations (identified by Strategy Document)
UPDATE organization_terminology
SET 
  accountability_chart_label = 'Organizational Chart',
  milestones_label = 'Key Results'
WHERE business_blueprint_label = 'Strategy Document';

-- Scaling Up organizations (identified by One-Page Strategic Plan)
UPDATE organization_terminology
SET 
  accountability_chart_label = 'Functional Accountability Chart',
  milestones_label = 'Milestones'
WHERE business_blueprint_label = 'One-Page Strategic Plan';

-- 4DX organizations (identified by Execution Plan)
UPDATE organization_terminology
SET 
  accountability_chart_label = 'Accountability Chart',
  milestones_label = 'Lead Measures'
WHERE business_blueprint_label = 'Execution Plan';

-- Add comments for new columns
COMMENT ON COLUMN organization_terminology.accountability_chart_label IS 'Label for organizational/accountability chart (e.g., "Accountability Chart" for EOS)';
COMMENT ON COLUMN organization_terminology.milestones_label IS 'Label for milestones/sub-goals (e.g., "Key Results" for OKRs, "Lead Measures" for 4DX)';