# Creating New Organizations via SQL

## CRITICAL: Leadership Team UUID Warning

### ⚠️ NEVER use the special UUID for new Leadership Teams!

When creating organizations via SQL:
```sql
-- ✅ CORRECT: Use gen_random_uuid() for Leadership Team
INSERT INTO teams (id, name, organization_id, is_leadership_team)
VALUES (gen_random_uuid(), 'Leadership Team', <org_id>, true);

-- ❌ WRONG: Never use the special UUID
-- VALUES ('00000000-0000-0000-0000-000000000000', ...) -- NO!
```

**Why this matters:**
- Only ONE organization can own the special UUID at a time
- Using it will steal the UUID from another org, breaking their system
- Each org MUST have its own unique Leadership Team ID
- The `is_leadership_team = true` flag is what makes the UI work, not the UUID

**See `SPECIAL_UUID_MIGRATION_GUIDE.md` for full details if an org is broken.**

## Database Schema Reference

### Organizations Table
- `id`: UUID
- `name`: Organization name
- `slug`: URL-safe unique identifier (lowercase, hyphens)
- `subscription_tier`: 'free', 'professional', or 'enterprise'
- `created_at`, `updated_at`: Timestamps

### Teams Table  
- `id`: UUID
- `organization_id`: References organizations(id)
- `name`: Team/Department name
- `is_leadership_team`: Boolean flag for leadership team
- `created_at`, `updated_at`: Timestamps

### Users Table
- `id`: UUID
- `email`: Unique email address
- `password_hash`: Encrypted password
- `first_name`, `last_name`: User names
- `role`: 'admin' or 'member'
- `organization_id`: References organizations(id)
- `created_at`, `updated_at`: Timestamps

### Team Members Table
- Links users to teams
- `user_id`: References users(id)
- `team_id`: References teams(id)
- `role`: Usually 'member'
- `joined_at`: Timestamp

## Creating a New Organization

Use the template in `/migrate_boyum_simple.sql` as a reference. Key steps:

1. Generate organization with unique slug
2. Create Leadership Team with gen_random_uuid() and is_leadership_team = true
3. Create additional teams/departments
4. Create users with hashed password ($2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq = 'Abc123!@#')
5. Link users to teams via team_members table

## Important Notes

### Business Blueprint Setup
**IMPORTANT**: The business blueprint MUST have `team_id = NULL` for organization-level blueprints!
- The API looks for blueprints with `team_id IS NULL` (not Leadership Team UUID)
- The backend auto-creates an empty blueprint if it doesn't find one with NULL team_id
- Always check for and remove duplicate blueprints after creation

### Scorecard Metrics Requirements
**IMPORTANT**: Scorecard metrics MUST have the `owner` field populated to display in the UI!
- Metrics with NULL owner won't display
- Update with: `UPDATE scorecard_metrics SET owner = 'Team Name' WHERE owner IS NULL;`

### Valid Comparison Operators
Only three operators are supported:
- `greater_equal` (≥) - Use for "greater than or equal to" goals
- `less_equal` (≤) - Use for "less than or equal to" goals  
- `equal` (=) - Use for exact match goals

**Note**: `greater` and `less` are NOT valid and will cause constraint violations