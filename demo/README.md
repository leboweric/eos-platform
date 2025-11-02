# Demo Data Template - Usage Instructions

## Overview

The `DEMO_DATA_TEMPLATE.sql` script creates a complete, professional demo environment for any prospect organization in minutes. It populates all EOS platform components with realistic, industry-specific data.

## What Gets Created

- **8 Users**: CEO (existing) + 7 team members with @company.com emails
- **5 Teams**: Leadership Team + Sales, Product & Engineering, Marketing, Customer Success
- **Complete Business Blueprint (VTO)**: Core values, core focus, 10-year target, marketing strategy, 3-year picture, 1-year plan
- **10 Quarterly Priorities (Rocks)**: Q4 2025 priorities with milestones (2 owned by CEO)
- **12 Scorecard Metrics**: Leadership Team metrics with 13 weeks of historical trend data (156 data points)
- **12 To-Dos**: Distributed across teams with various priorities and due dates
- **10 Issues**: For IDS (Identify, Discuss, Solve) demonstration
- **8 Headlines**: Customer and employee wins (good news)
- **Organizational Chart**: 8 positions with proper hierarchy, assignments, and responsibilities

## Prerequisites

Before running the template, you must have:

1. **Organization created** in the system
2. **CEO user account created** (this will be the main demo user)
3. **Organization ID** (UUID)
4. **CEO User ID** (UUID)

## Step-by-Step Usage

### Step 1: Get Required IDs

Run these queries to get the necessary IDs:

```sql
-- Get organization ID
SELECT id, name FROM organizations WHERE name LIKE '%[CompanyName]%';

-- Get CEO user ID
SELECT id, email, first_name, last_name 
FROM users 
WHERE email = '[ceo-email]@[company-domain].com';
```

### Step 2: Customize the Template

Open `DEMO_DATA_TEMPLATE.sql` and replace the placeholders in the **STEP 1: CUSTOMIZE THESE VARIABLES** section:

#### Required Variables

```sql
v_org_id UUID := '{{ORGANIZATION_ID}}';  -- Replace with actual org ID from Step 1
v_ceo_user_id UUID := '{{CEO_USER_ID}}'; -- Replace with actual CEO user ID from Step 1
```

#### Company Information

```sql
v_company_name VARCHAR := '{{COMPANY_NAME}}';  -- e.g., 'Carousel Signage'
v_company_domain VARCHAR := '{{COMPANY_DOMAIN}}';  -- e.g., 'carouselsignage.com'
v_industry VARCHAR := '{{INDUSTRY}}';  -- e.g., 'Digital Signage Software'
```

#### CEO Information

```sql
v_ceo_first_name VARCHAR := '{{CEO_FIRST_NAME}}';  -- e.g., 'JJ'
v_ceo_last_name VARCHAR := '{{CEO_LAST_NAME}}';  -- e.g., 'Parker'
v_ceo_email VARCHAR := '{{CEO_EMAIL}}';  -- e.g., 'jj.parker@company.com'
```

#### Business Context (Industry-Specific)

```sql
v_target_market VARCHAR := '{{TARGET_MARKET}}';  
-- e.g., 'K-12 schools, higher education, government, corporate'

v_core_product VARCHAR := '{{CORE_PRODUCT}}';  
-- e.g., 'Cloud-based digital signage platform'
```

### Step 3: Execute the Script

Run the customized SQL script in your PostgreSQL database:

```bash
psql -h [host] -U [user] -d [database] -f DEMO_DATA_TEMPLATE.sql
```

Or execute directly in pgAdmin/SQL client.

### Step 4: Verify the Data

The script includes progress notifications. You should see output like:

```
NOTICE:  ========================================
NOTICE:  Creating demo data for: [Company Name]
NOTICE:  Organization ID: [UUID]
NOTICE:  CEO User ID: [UUID]
NOTICE:  ========================================
NOTICE:  Creating users...
NOTICE:  Created 7 team member users
NOTICE:  Creating teams...
NOTICE:  Created 5 teams
...
NOTICE:  Demo data creation COMPLETE!
```

Run verification queries:

```sql
-- Verify users
SELECT COUNT(*) FROM user_organizations WHERE organization_id = '[org-id]';
-- Should return 8

-- Verify teams
SELECT COUNT(*) FROM teams WHERE organization_id = '[org-id]';
-- Should return 5

-- Verify rocks
SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = '[org-id]';
-- Should return 10

-- Verify scorecard data
SELECT COUNT(*) FROM scorecard_scores WHERE organization_id = '[org-id]';
-- Should return 156 (13 weeks × 12 metrics)

-- Verify org chart
SELECT COUNT(*) FROM positions WHERE chart_id IN 
  (SELECT id FROM organizational_charts WHERE organization_id = '[org-id]');
-- Should return 8
```

## Example: Carousel Signage

Here's a complete example for Carousel Signage (digital signage software company):

```sql
-- Required IDs
v_org_id UUID := '137b3624-f7e9-4768-92a7-e61714f97622';
v_ceo_user_id UUID := 'f57a6639-3b65-404f-b6e7-f4a1ff019129';

-- Company Information
v_company_name VARCHAR := 'Carousel Signage';
v_company_domain VARCHAR := 'carouselsignage.com';
v_industry VARCHAR := 'Digital Signage Software';

-- CEO Information
v_ceo_first_name VARCHAR := 'JJ';
v_ceo_last_name VARCHAR := 'Parker';
v_ceo_email VARCHAR := 'jj.parker@carouselsignage.com';

-- Business Context
v_target_market VARCHAR := 'K-12 schools, higher education, government, and corporate organizations';
v_core_product VARCHAR := 'Cloud-based digital signage platform';
```

## Industry-Specific Examples

### SaaS Company (Project Management)

```sql
v_company_name VARCHAR := 'TaskFlow Pro';
v_company_domain VARCHAR := 'taskflowpro.com';
v_industry VARCHAR := 'Project Management Software';
v_target_market VARCHAR := 'SMBs, agencies, and enterprise teams';
v_core_product VARCHAR := 'AI-powered project management platform';
```

### Manufacturing Company

```sql
v_company_name VARCHAR := 'Precision Parts Inc';
v_company_domain VARCHAR := 'precisionparts.com';
v_industry VARCHAR := 'Precision Manufacturing';
v_target_market VARCHAR := 'Aerospace, automotive, and medical device industries';
v_core_product VARCHAR := 'Custom precision-machined components';
```

### Professional Services

```sql
v_company_name VARCHAR := 'Summit Consulting';
v_company_domain VARCHAR := 'summitconsult.com';
v_industry VARCHAR := 'Management Consulting';
v_target_market VARCHAR := 'Mid-market and enterprise organizations';
v_core_product VARCHAR := 'Strategic consulting and organizational transformation services';
```

## Customization Tips

### Adjusting Team Names

The template creates standard teams (Sales, Product, Marketing, CS). To customize:

1. Edit the team names in **STEP 3: CREATE TEAMS**
2. Update team member assignments in **STEP 4: ADD TEAM MEMBERS**
3. Adjust rocks and to-dos to reference new team IDs

### Changing Metrics

To customize scorecard metrics:

1. Edit metric names, owners, and goals in **STEP 7: CREATE SCORECARD METRICS**
2. Adjust historical data trends to match your demo story
3. Ensure data aligns with the rocks (e.g., if rock is "Hit $3.5M revenue", show revenue trending toward that)

### Modifying Rocks

To customize quarterly priorities:

1. Edit rock titles and descriptions in **STEP 6: CREATE QUARTERLY PRIORITIES**
2. Adjust owners, status, and progress percentages
3. Modify milestones to match the rock objectives
4. Ensure at least 2 rocks are owned by the CEO for demo purposes

### Adjusting Organizational Chart

To modify the org chart structure:

1. Edit position titles and descriptions in **STEP 11: CREATE ORGANIZATIONAL CHART**
2. Adjust the hierarchy by changing `parent_position_id` references
3. Add or remove positions as needed
4. Update responsibilities to match your industry

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause**: Data already exists for this organization.

**Solution**: Either:
- Delete existing demo data first
- Use a different organization ID
- Modify the script to use `INSERT ... ON CONFLICT DO NOTHING`

### Error: "null value in column violates not-null constraint"

**Cause**: Missing required variable or incorrect UUID format.

**Solution**: 
- Verify all `{{PLACEHOLDER}}` values are replaced
- Ensure UUIDs are in correct format (lowercase, with hyphens)
- Check that organization and CEO user exist in database

### No data showing in UI

**Cause**: User not assigned to organization or teams.

**Solution**:
- Verify CEO user is in `user_organizations` table
- Check team memberships in `team_members` table
- Ensure organization ID matches in all tables

### Organizational chart not displaying

**Cause**: Positions not linked to chart correctly.

**Solution**:
- Verify `chart_id` matches in `positions` table
- Check that `position_holders` have valid `user_id` references
- Ensure hierarchy is correct (no circular references in `parent_position_id`)

## Time Estimate

- **Customization**: 5-10 minutes
- **Execution**: 1-2 seconds
- **Verification**: 2-3 minutes
- **Total**: ~10-15 minutes for complete demo setup

## Support

For issues or questions:
- Check DATABASE_SCHEMA.md for table structure reference
- Review DATABASE_SCHEMA_CORRECTIONS.md for known schema quirks
- Verify data using the verification queries above

## Version History

- **v1.0** (Nov 2, 2025): Initial template based on Carousel Signage demo
  - All schema corrections applied
  - Tested and verified with actual database
  - Includes all EOS platform components

