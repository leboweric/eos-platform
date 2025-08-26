-- Universal Data Schema for Adaptive Framework Technology
-- Patent Pending Serial No. 63/870,133
-- STANDALONE VERSION - Run this directly in pgAdmin

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, let's check what tables exist
DO $$ 
BEGIN
    -- Check if organizations table exists, if not create a minimal version
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        CREATE TABLE organizations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created organizations table';
    END IF;
    
    -- Check if users table exists, if not create a minimal version
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID REFERENCES organizations(id),
            email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created users table';
    END IF;
    
    -- Check if teams table exists, if not create a minimal version
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        CREATE TABLE teams (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID REFERENCES organizations(id),
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created teams table';
    END IF;
    
    -- Check if departments table exists, if not create a minimal version
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        CREATE TABLE departments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID REFERENCES organizations(id),
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created departments table';
    END IF;
END $$;

-- ============================================
-- UNIVERSAL OBJECTIVES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS universal_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  parent_id UUID REFERENCES universal_objectives(id) ON DELETE CASCADE,
  
  -- Universal fields that apply to all frameworks
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  team_id UUID,
  department_id UUID,
  
  -- Flexible timeframe
  timeframe_start DATE NOT NULL,
  timeframe_end DATE NOT NULL,
  timeframe_type VARCHAR(50),
  
  -- Universal progress tracking
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  progress_method VARCHAR(50) NOT NULL DEFAULT 'percentage',
  
  -- Framework identification
  framework_type VARCHAR(50) NOT NULL,
  objective_type VARCHAR(50),
  
  -- Framework-specific data stored as JSON
  framework_attributes JSONB DEFAULT '{}',
  calculation_rules JSONB DEFAULT '{}',
  visualization_config JSONB DEFAULT '{}',
  
  -- Status and tracking
  status VARCHAR(50) DEFAULT 'active',
  completion_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  
  CONSTRAINT timeframe_check CHECK (timeframe_end >= timeframe_start)
);

-- Add foreign key constraints only if tables exist
DO $$ 
BEGIN
    -- Add organization foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE universal_objectives 
        ADD CONSTRAINT fk_universal_objectives_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- Add user foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE universal_objectives 
        ADD CONSTRAINT fk_universal_objectives_owner 
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
        
        ALTER TABLE universal_objectives 
        ADD CONSTRAINT fk_universal_objectives_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        
        ALTER TABLE universal_objectives 
        ADD CONSTRAINT fk_universal_objectives_updated_by 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add team foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        ALTER TABLE universal_objectives 
        ADD CONSTRAINT fk_universal_objectives_team 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
    END IF;
    
    -- Add department foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE universal_objectives 
        ADD CONSTRAINT fk_universal_objectives_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some foreign key constraints could not be added: %', SQLERRM;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_universal_objectives_org ON universal_objectives(organization_id);
CREATE INDEX IF NOT EXISTS idx_universal_objectives_owner ON universal_objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_universal_objectives_team ON universal_objectives(team_id);
CREATE INDEX IF NOT EXISTS idx_universal_objectives_framework ON universal_objectives(framework_type);
CREATE INDEX IF NOT EXISTS idx_universal_objectives_timeframe ON universal_objectives(timeframe_start, timeframe_end);
CREATE INDEX IF NOT EXISTS idx_universal_objectives_status ON universal_objectives(status);
CREATE INDEX IF NOT EXISTS idx_universal_objectives_parent ON universal_objectives(parent_id);

-- ============================================
-- FRAMEWORK MAPPINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS framework_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  
  business_area VARCHAR(100) NOT NULL,
  department_id UUID,
  
  source_framework VARCHAR(50) NOT NULL,
  target_framework VARCHAR(50) NOT NULL,
  
  mapping_rules JSONB NOT NULL DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  applies_from DATE,
  applies_until DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

-- Add foreign keys if tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE framework_mappings 
        ADD CONSTRAINT fk_framework_mappings_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE framework_mappings 
        ADD CONSTRAINT fk_framework_mappings_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE framework_mappings 
        ADD CONSTRAINT fk_framework_mappings_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some foreign key constraints could not be added: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_framework_mappings_org ON framework_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_framework_mappings_active ON framework_mappings(is_active);

-- ============================================
-- FRAMEWORK CONFIGURATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS framework_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  department_id UUID,
  
  strategic_planning_framework VARCHAR(50) DEFAULT 'eos',
  goal_setting_framework VARCHAR(50) DEFAULT 'eos', 
  meeting_framework VARCHAR(50) DEFAULT 'eos',
  metrics_framework VARCHAR(50) DEFAULT 'eos',
  execution_framework VARCHAR(50) DEFAULT 'eos',
  
  custom_framework_definition JSONB DEFAULT '{}',
  
  allow_hybrid BOOLEAN DEFAULT false,
  auto_translate BOOLEAN DEFAULT true,
  preserve_history BOOLEAN DEFAULT true,
  
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign keys if tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE framework_configurations 
        ADD CONSTRAINT fk_framework_configurations_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE framework_configurations 
        ADD CONSTRAINT fk_framework_configurations_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some foreign key constraints could not be added: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_framework_config_org ON framework_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_framework_config_dept ON framework_configurations(department_id);

-- ============================================
-- OBJECTIVE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS objective_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL,
  
  snapshot_data JSONB NOT NULL,
  framework_type VARCHAR(50) NOT NULL,
  
  change_type VARCHAR(50) NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by UUID,
  
  notes TEXT
);

-- Add foreign keys if tables exist
DO $$ 
BEGIN
    -- Only add objective foreign key after universal_objectives exists
    ALTER TABLE objective_history 
    ADD CONSTRAINT fk_objective_history_objective 
    FOREIGN KEY (objective_id) REFERENCES universal_objectives(id) ON DELETE CASCADE;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE objective_history 
        ADD CONSTRAINT fk_objective_history_changed_by 
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some foreign key constraints could not be added: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_objective_history_objective ON objective_history(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_history_changed_at ON objective_history(changed_at);

-- ============================================
-- FRAMEWORK PERFORMANCE METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS framework_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  department_id UUID,
  
  framework_type VARCHAR(50) NOT NULL,
  measurement_period_start DATE NOT NULL,
  measurement_period_end DATE NOT NULL,
  
  objectives_completed INTEGER DEFAULT 0,
  objectives_total INTEGER DEFAULT 0,
  average_completion_rate DECIMAL(5,2),
  average_progress_velocity DECIMAL(5,2),
  
  user_engagement_score DECIMAL(5,2),
  meeting_attendance_rate DECIMAL(5,2),
  update_frequency DECIMAL(5,2),
  
  revenue_impact DECIMAL(12,2),
  efficiency_score DECIMAL(5,2),
  team_satisfaction_score DECIMAL(5,2),
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign keys if tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE framework_performance_metrics 
        ADD CONSTRAINT fk_performance_metrics_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE framework_performance_metrics 
        ADD CONSTRAINT fk_performance_metrics_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some foreign key constraints could not be added: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_performance_metrics_org ON framework_performance_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_framework ON framework_performance_metrics(framework_type);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================================';
    RAISE NOTICE 'Universal Schema for Adaptive Framework Technology Created';
    RAISE NOTICE 'Patent Pending Serial No. 63/870,133';
    RAISE NOTICE '===========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✓ universal_objectives - Framework-agnostic goal storage';
    RAISE NOTICE '  ✓ framework_mappings - Translation rules between frameworks';
    RAISE NOTICE '  ✓ framework_configurations - Hybrid framework settings';
    RAISE NOTICE '  ✓ objective_history - Change tracking for analysis';
    RAISE NOTICE '  ✓ framework_performance_metrics - Intelligence data';
    RAISE NOTICE '';
    RAISE NOTICE 'Your AXP platform now has true adaptive framework capability!';
    RAISE NOTICE '';
END $$;