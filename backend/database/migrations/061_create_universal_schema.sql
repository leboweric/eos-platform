-- Migration: Create Universal Data Schema for Adaptive Framework Technology
-- This enables AXP to truly adapt between EOS, OKR, 4DX, Scaling Up, and custom frameworks
-- Patent Pending Serial No. 63/870,133

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- UNIVERSAL OBJECTIVES TABLE
-- ============================================
-- This replaces framework-specific tables (rocks, okrs, wigs, etc.)
-- with a single universal structure that can represent any framework

CREATE TABLE IF NOT EXISTS universal_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES universal_objectives(id) ON DELETE CASCADE,
  
  -- Universal fields that apply to all frameworks
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Flexible timeframe (quarters for EOS/OKR, weeks for 4DX, custom for others)
  timeframe_start DATE NOT NULL,
  timeframe_end DATE NOT NULL,
  timeframe_type VARCHAR(50), -- 'quarter', 'year', 'month', 'sprint', 'custom'
  
  -- Universal progress tracking
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  progress_method VARCHAR(50) NOT NULL DEFAULT 'percentage', -- 'binary', 'percentage', 'decimal', 'custom'
  
  -- Framework identification
  framework_type VARCHAR(50) NOT NULL, -- 'eos', 'okr', '4dx', 'scaling_up', 'custom'
  objective_type VARCHAR(50), -- 'rock', 'objective', 'key_result', 'wig', 'priority', etc.
  
  -- Framework-specific data stored as JSON
  framework_attributes JSONB DEFAULT '{}',
  /* Examples:
    EOS Rock: {"status": "on_track", "accountability_chart_role": "integrator", "milestones": [...]}
    OKR: {"confidence": 0.7, "type": "committed", "grading_scale": "0_to_1", "check_in_frequency": "weekly"}
    4DX WIG: {"lead_measures": [...], "lag_measures": [...], "scoreboard_type": "team", "commitment_tracking": true}
    Scaling Up: {"theme": "Q1 Customer Success", "critical_number": 150, "celebration_planned": true}
  */
  
  -- Calculation rules for this objective
  calculation_rules JSONB DEFAULT '{}',
  
  -- Visualization preferences
  visualization_config JSONB DEFAULT '{}',
  
  -- Status and tracking
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived', 'paused'
  completion_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Indexing for performance
  CONSTRAINT timeframe_check CHECK (timeframe_end >= timeframe_start)
);

-- Indexes for performance
CREATE INDEX idx_universal_objectives_org ON universal_objectives(organization_id);
CREATE INDEX idx_universal_objectives_owner ON universal_objectives(owner_id);
CREATE INDEX idx_universal_objectives_team ON universal_objectives(team_id);
CREATE INDEX idx_universal_objectives_framework ON universal_objectives(framework_type);
CREATE INDEX idx_universal_objectives_timeframe ON universal_objectives(timeframe_start, timeframe_end);
CREATE INDEX idx_universal_objectives_status ON universal_objectives(status);
CREATE INDEX idx_universal_objectives_parent ON universal_objectives(parent_id);

-- ============================================
-- FRAMEWORK MAPPINGS TABLE
-- ============================================
-- Defines how to translate between frameworks

CREATE TABLE IF NOT EXISTS framework_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What area of the business this mapping applies to
  business_area VARCHAR(100) NOT NULL, -- 'goals', 'meetings', 'metrics', 'planning', 'all'
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- Optional: specific department
  
  -- Framework transformation rules
  source_framework VARCHAR(50) NOT NULL,
  target_framework VARCHAR(50) NOT NULL,
  
  -- Mapping configuration
  mapping_rules JSONB NOT NULL,
  /* Example mapping rules:
  {
    "terminology": {
      "rock": "key_result",
      "vto": "strategic_plan",
      "level_10": "weekly_sync"
    },
    "progress_calculation": {
      "method": "convert_binary_to_decimal",
      "formula": "completed_milestones / total_milestones"
    },
    "visualization": {
      "from": "milestone_checklist",
      "to": "progress_bar"
    }
  }
  */
  
  -- For hybrid framework setups
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority mappings override lower ones
  applies_from DATE,
  applies_until DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_mapping UNIQUE (organization_id, business_area, source_framework, target_framework, department_id)
);

CREATE INDEX idx_framework_mappings_org ON framework_mappings(organization_id);
CREATE INDEX idx_framework_mappings_active ON framework_mappings(is_active);

-- ============================================
-- FRAMEWORK CONFIGURATIONS TABLE
-- ============================================
-- Stores organization/department framework preferences

CREATE TABLE IF NOT EXISTS framework_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Framework selection per business area (enables hybrid approach)
  strategic_planning_framework VARCHAR(50) DEFAULT 'eos',
  goal_setting_framework VARCHAR(50) DEFAULT 'eos', 
  meeting_framework VARCHAR(50) DEFAULT 'eos',
  metrics_framework VARCHAR(50) DEFAULT 'eos',
  execution_framework VARCHAR(50) DEFAULT 'eos',
  
  -- Custom framework definitions (for proprietary methodologies)
  custom_framework_definition JSONB DEFAULT '{}',
  
  -- Configuration flags
  allow_hybrid BOOLEAN DEFAULT false,
  auto_translate BOOLEAN DEFAULT true,
  preserve_history BOOLEAN DEFAULT true,
  
  -- Metadata
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_framework_config UNIQUE (organization_id, department_id, effective_date)
);

CREATE INDEX idx_framework_config_org ON framework_configurations(organization_id);
CREATE INDEX idx_framework_config_dept ON framework_configurations(department_id);

-- ============================================
-- OBJECTIVE HISTORY TABLE
-- ============================================
-- Tracks changes for historical analysis and framework evolution

CREATE TABLE IF NOT EXISTS objective_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES universal_objectives(id) ON DELETE CASCADE,
  
  -- Snapshot of objective at this point
  snapshot_data JSONB NOT NULL,
  framework_type VARCHAR(50) NOT NULL,
  
  -- What changed
  change_type VARCHAR(50) NOT NULL, -- 'progress_update', 'framework_switch', 'status_change', etc.
  previous_value JSONB,
  new_value JSONB,
  
  -- When and who
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by UUID REFERENCES users(id),
  
  -- Context
  notes TEXT
);

CREATE INDEX idx_objective_history_objective ON objective_history(objective_id);
CREATE INDEX idx_objective_history_changed_at ON objective_history(changed_at);

-- ============================================
-- FRAMEWORK PERFORMANCE METRICS TABLE
-- ============================================
-- Track effectiveness of different frameworks for intelligent recommendations

CREATE TABLE IF NOT EXISTS framework_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  
  -- Framework being measured
  framework_type VARCHAR(50) NOT NULL,
  measurement_period_start DATE NOT NULL,
  measurement_period_end DATE NOT NULL,
  
  -- Performance metrics
  objectives_completed INTEGER DEFAULT 0,
  objectives_total INTEGER DEFAULT 0,
  average_completion_rate DECIMAL(5,2),
  average_progress_velocity DECIMAL(5,2), -- Progress per week
  
  -- Engagement metrics
  user_engagement_score DECIMAL(5,2),
  meeting_attendance_rate DECIMAL(5,2),
  update_frequency DECIMAL(5,2), -- Updates per objective per week
  
  -- Outcomes
  revenue_impact DECIMAL(12,2),
  efficiency_score DECIMAL(5,2),
  team_satisfaction_score DECIMAL(5,2),
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_performance_metric UNIQUE (organization_id, framework_type, measurement_period_start, department_id)
);

CREATE INDEX idx_performance_metrics_org ON framework_performance_metrics(organization_id);
CREATE INDEX idx_performance_metrics_framework ON framework_performance_metrics(framework_type);

-- ============================================
-- MIGRATION HELPERS
-- ============================================

-- Function to migrate existing quarterly_priorities (rocks) to universal format
CREATE OR REPLACE FUNCTION migrate_quarterly_priorities_to_universal()
RETURNS void AS $$
BEGIN
  INSERT INTO universal_objectives (
    id,
    organization_id,
    title,
    description,
    owner_id,
    team_id,
    department_id,
    timeframe_start,
    timeframe_end,
    timeframe_type,
    target_value,
    current_value,
    progress_method,
    framework_type,
    objective_type,
    framework_attributes,
    status,
    created_at,
    updated_at
  )
  SELECT 
    id,
    organization_id,
    title,
    description,
    owner_id,
    team_id,
    department_id,
    DATE_TRUNC('quarter', CURRENT_DATE),
    DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day',
    'quarter',
    100, -- Target is 100% complete
    progress, -- Current progress
    'percentage',
    'eos', -- Mark as EOS framework
    'rock', -- EOS terminology
    jsonb_build_object(
      'status', status,
      'quarter', quarter,
      'year', year,
      'milestones', COALESCE(milestones, '[]'::jsonb),
      'legacy_id', id
    ),
    CASE 
      WHEN status = 'completed' THEN 'completed'
      WHEN status = 'off-track' THEN 'at_risk'
      ELSE 'active'
    END,
    created_at,
    updated_at
  FROM quarterly_priorities
  WHERE NOT EXISTS (
    SELECT 1 FROM universal_objectives WHERE id = quarterly_priorities.id
  );
END;
$$ LANGUAGE plpgsql;

-- Create view for backwards compatibility
CREATE OR REPLACE VIEW quarterly_priorities_view AS
SELECT 
  id,
  organization_id,
  title,
  description,
  owner_id,
  team_id,
  department_id,
  EXTRACT(QUARTER FROM timeframe_start)::INTEGER as quarter,
  EXTRACT(YEAR FROM timeframe_start)::INTEGER as year,
  current_value as progress,
  framework_attributes->>'status' as status,
  framework_attributes->'milestones' as milestones,
  created_at,
  updated_at
FROM universal_objectives
WHERE framework_type = 'eos' AND objective_type = 'rock';

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Sample framework mapping for EOS to OKR translation
INSERT INTO framework_mappings (organization_id, business_area, source_framework, target_framework, mapping_rules)
SELECT 
  id,
  'goals',
  'eos',
  'okr',
  '{
    "terminology": {
      "rock": "key_result",
      "vto": "objectives",
      "scorecard": "metrics_dashboard",
      "level_10": "weekly_check_in"
    },
    "progress_calculation": {
      "method": "percentage_to_decimal",
      "formula": "progress / 100"
    },
    "structure": {
      "rocks_to_objectives": "group_by_quarter",
      "owner_mapping": "preserve"
    }
  }'::jsonb
FROM organizations
LIMIT 1;

-- Add comment explaining the schema
COMMENT ON TABLE universal_objectives IS 'Patent-pending universal data schema that enables seamless framework switching between EOS, OKR, 4DX, Scaling Up, and custom methodologies without data migration';