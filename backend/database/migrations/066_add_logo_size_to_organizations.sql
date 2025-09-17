-- Migration: Add logo_size to organizations table
-- Purpose: Store logo display size at organization level (not per-user)
-- Author: AXP Development Team
-- Date: 2024-12-17

-- Add logo_size column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_size INTEGER DEFAULT 100 CHECK (logo_size >= 25 AND logo_size <= 200);

COMMENT ON COLUMN organizations.logo_size IS 'Logo display size as percentage (25-200%), default 100%';