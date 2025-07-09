-- Migration: Add Departments, EOS Implementer role, and Accountability Chart
-- This migration adds support for departmental structure and accountability charts

-- Add implementer role to users
ALTER TABLE users 
ADD COLUMN is_implementer BOOLEAN DEFAULT FALSE;

-- Create implementer_clients table for implementers to access multiple organizations
CREATE TABLE implementer_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    implementer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    access_level VARCHAR(50) DEFAULT 'full', -- full, read-only, limited
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(implementer_id, organization_id)
);

-- Create departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id),
    leader_id UUID REFERENCES users(id),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add department_id to existing tables for department-level items
ALTER TABLE teams ADD COLUMN department_id UUID REFERENCES departments(id);
ALTER TABLE vtos ADD COLUMN department_id UUID REFERENCES departments(id);
ALTER TABLE rocks ADD COLUMN department_id UUID REFERENCES departments(id);

-- Create accountability chart seats
CREATE TABLE accountability_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    parent_seat_id UUID REFERENCES accountability_seats(id),
    seat_name VARCHAR(255) NOT NULL,
    seat_description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_leadership_team BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roles/responsibilities for seats
CREATE TABLE seat_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seat_id UUID NOT NULL REFERENCES accountability_seats(id) ON DELETE CASCADE,
    responsibility TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seat assignments (users assigned to seats)
CREATE TABLE seat_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seat_id UUID NOT NULL REFERENCES accountability_seats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE, -- Primary person in the seat
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seat_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_implementer_clients_implementer ON implementer_clients(implementer_id);
CREATE INDEX idx_implementer_clients_organization ON implementer_clients(organization_id);
CREATE INDEX idx_departments_organization ON departments(organization_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_accountability_seats_organization ON accountability_seats(organization_id);
CREATE INDEX idx_accountability_seats_department ON accountability_seats(department_id);
CREATE INDEX idx_accountability_seats_parent ON accountability_seats(parent_seat_id);
CREATE INDEX idx_seat_assignments_seat ON seat_assignments(seat_id);
CREATE INDEX idx_seat_assignments_user ON seat_assignments(user_id);

-- Add comments for documentation
COMMENT ON TABLE departments IS 'Organizational departments that can have their own VTOs, Rocks, etc.';
COMMENT ON TABLE implementer_clients IS 'Allows EOS Implementers to access multiple client organizations';
COMMENT ON TABLE accountability_seats IS 'Seats in the accountability chart with defined roles/responsibilities';
COMMENT ON TABLE seat_responsibilities IS '3-7 key responsibilities for each accountability seat';
COMMENT ON TABLE seat_assignments IS 'Users assigned to accountability seats';