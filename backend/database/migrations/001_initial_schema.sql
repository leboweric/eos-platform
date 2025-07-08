-- Initial database schema for EOS Platform
-- This migration creates all the core tables for the multi-tenant EOS management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (tenant root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_team_id UUID REFERENCES teams(id),
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team memberships
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- V/TO main document
CREATE TABLE vtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'V/TO',
    is_shared_with_all_teams BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core Values
CREATE TABLE core_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vto_id UUID NOT NULL REFERENCES vtos(id) ON DELETE CASCADE,
    value_text TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core Focus
CREATE TABLE core_focus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vto_id UUID NOT NULL REFERENCES vtos(id) ON DELETE CASCADE,
    purpose_cause_passion TEXT,
    niche TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10 Year Target
CREATE TABLE ten_year_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vto_id UUID NOT NULL REFERENCES vtos(id) ON DELETE CASCADE,
    target_description TEXT NOT NULL,
    target_year INTEGER NOT NULL,
    running_total_description TEXT,
    current_running_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Strategy
CREATE TABLE marketing_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vto_id UUID NOT NULL REFERENCES vtos(id) ON DELETE CASCADE,
    target_market TEXT,
    three_uniques TEXT,
    proven_process TEXT,
    guarantee TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3 Year Picture
CREATE TABLE three_year_pictures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vto_id UUID NOT NULL REFERENCES vtos(id) ON DELETE CASCADE,
    future_date DATE NOT NULL,
    revenue_target DECIMAL(15,2),
    profit_target DECIMAL(15,2),
    profit_percentage DECIMAL(5,2),
    vision_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3 Year Picture Measurables
CREATE TABLE three_year_measurables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    three_year_picture_id UUID NOT NULL REFERENCES three_year_pictures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    unit VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1 Year Plan
CREATE TABLE one_year_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vto_id UUID NOT NULL REFERENCES vtos(id) ON DELETE CASCADE,
    future_date DATE NOT NULL,
    revenue_target DECIMAL(15,2),
    profit_target DECIMAL(15,2),
    profit_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1 Year Goals
CREATE TABLE one_year_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    one_year_plan_id UUID NOT NULL REFERENCES one_year_plans(id) ON DELETE CASCADE,
    goal_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1 Year Measurables
CREATE TABLE one_year_measurables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    one_year_plan_id UUID NOT NULL REFERENCES one_year_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    unit VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rocks (Quarterly Goals)
CREATE TABLE rocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'on-track' CHECK (status IN ('on-track', 'off-track', 'at-risk', 'complete')),
    is_company_rock BOOLEAN DEFAULT FALSE,
    quarter INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rock Milestones
CREATE TABLE rock_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rock_id UUID NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rock Updates/Comments
CREATE TABLE rock_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rock_id UUID NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    update_text TEXT NOT NULL,
    status_change VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scorecard Groups
CREATE TABLE scorecard_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Measurables (KPIs)
CREATE TABLE measurables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scorecard_group_id UUID NOT NULL REFERENCES scorecard_groups(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    goal_operator VARCHAR(5) CHECK (goal_operator IN ('>=', '<=', '=', '>', '<')),
    goal_value DECIMAL(15,2),
    frequency VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Measurable Values (Historical Data)
CREATE TABLE measurable_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    measurable_id UUID NOT NULL REFERENCES measurables(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    notes TEXT,
    entered_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(measurable_id, period_start, period_end)
);

-- Meeting Agendas (Templates)
CREATE TABLE meeting_agendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(50) NOT NULL,
    total_duration_minutes INTEGER DEFAULT 90,
    is_template BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agenda Sections
CREATE TABLE agenda_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agenda_id UUID NOT NULL REFERENCES meeting_agendas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    section_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings (Instances)
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agenda_id UUID NOT NULL REFERENCES meeting_agendas(id),
    team_id UUID NOT NULL REFERENCES teams(id),
    facilitator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Attendees
CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    attendance_status VARCHAR(20) DEFAULT 'invited' CHECK (attendance_status IN ('invited', 'accepted', 'declined', 'attended', 'absent')),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(meeting_id, user_id)
);

-- To-Dos
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'complete', 'cancelled')),
    is_private BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Todo Comments
CREATE TABLE todo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    owner_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority_rank INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issue Comments
CREATE TABLE issue_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_rocks_organization_id ON rocks(organization_id);
CREATE INDEX idx_rocks_owner_id ON rocks(owner_id);
CREATE INDEX idx_rocks_team_id ON rocks(team_id);
CREATE INDEX idx_rocks_quarter_year ON rocks(quarter, year);
CREATE INDEX idx_measurables_organization_id ON measurables(organization_id);
CREATE INDEX idx_measurable_values_measurable_id ON measurable_values(measurable_id);
CREATE INDEX idx_measurable_values_period ON measurable_values(period_start, period_end);
CREATE INDEX idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX idx_meetings_team_id ON meetings(team_id);
CREATE INDEX idx_meetings_scheduled_date ON meetings(scheduled_date);
CREATE INDEX idx_todos_organization_id ON todos(organization_id);
CREATE INDEX idx_todos_owner_id ON todos(owner_id);
CREATE INDEX idx_todos_assigned_to_id ON todos(assigned_to_id);
CREATE INDEX idx_issues_organization_id ON issues(organization_id);
CREATE INDEX idx_issues_team_id ON issues(team_id);
CREATE INDEX idx_issues_priority_rank ON issues(priority_rank);

