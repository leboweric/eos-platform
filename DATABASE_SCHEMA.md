# EOS Platform Database Schema Reference

## Core Tables Structure

### organizations
```sql
id              UUID PRIMARY KEY
name            VARCHAR(255) NOT NULL
slug            VARCHAR(100) UNIQUE NOT NULL  -- URL-safe identifier
settings        JSONB DEFAULT '{}'           -- Flexible settings storage
subscription_tier VARCHAR(50) DEFAULT 'free'  -- free, professional, enterprise
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### users
```sql
id              UUID PRIMARY KEY
organization_id UUID NOT NULL REFERENCES organizations(id)
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
first_name      VARCHAR(100) NOT NULL
last_name       VARCHAR(100) NOT NULL
role            VARCHAR(50) DEFAULT 'user'  -- user, admin, consultant
avatar_url      TEXT
settings        JSONB DEFAULT '{}'
last_login_at   TIMESTAMP WITH TIME ZONE
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```
**Note**: No `team_id`, `is_active`, or `requires_password_change` columns

### teams
```sql
id              UUID PRIMARY KEY
organization_id UUID NOT NULL REFERENCES organizations(id)
name            VARCHAR(255) NOT NULL
description     TEXT
is_leadership_team BOOLEAN DEFAULT FALSE  -- CRITICAL for UI display
department_id   UUID  -- Legacy, usually NULL
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```
**Special**: Leadership Team always uses UUID `'00000000-0000-0000-0000-000000000000'`

### team_members
```sql
id              UUID PRIMARY KEY
team_id         UUID NOT NULL REFERENCES teams(id)
user_id         UUID NOT NULL REFERENCES users(id)
role            VARCHAR(50) DEFAULT 'member'
joined_at       TIMESTAMP WITH TIME ZONE  -- NOT created_at/updated_at
UNIQUE(team_id, user_id)
```

### business_blueprints (formerly vtos)
```sql
id              UUID PRIMARY KEY
organization_id UUID NOT NULL REFERENCES organizations(id)
team_id         UUID REFERENCES teams(id)  -- NULL for org-level, UUID for team-level
department_id   UUID  -- Alternative to team_id
name            VARCHAR(255) DEFAULT 'Business Blueprint'
is_shared_with_all_teams BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```
**CRITICAL**: Organization-level blueprints MUST have `team_id = NULL`

### core_values
```sql
id              UUID PRIMARY KEY
vto_id          UUID NOT NULL REFERENCES business_blueprints(id)  -- Still named vto_id!
value_text      TEXT NOT NULL
description     TEXT
sort_order      INTEGER DEFAULT 0
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### core_focus
```sql
id              UUID PRIMARY KEY
vto_id          UUID NOT NULL REFERENCES business_blueprints(id)  -- Still named vto_id!
purpose_cause_passion TEXT
niche           TEXT
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### quarterly_priorities (formerly rocks)
```sql
id              UUID PRIMARY KEY
organization_id UUID NOT NULL REFERENCES organizations(id)
team_id         UUID REFERENCES teams(id)
title           VARCHAR(255) NOT NULL
description     TEXT
owner_id        UUID REFERENCES users(id)
quarter         INTEGER NOT NULL  -- 1-4
year            INTEGER NOT NULL
status          VARCHAR(50) DEFAULT 'on-track'  -- on-track, off-track, complete
priority_type   VARCHAR(50) DEFAULT 'individual'  -- company, individual
progress        INTEGER DEFAULT 0  -- 0-100
due_date        DATE
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
deleted_at      TIMESTAMP WITH TIME ZONE  -- Soft delete
```

### issues
```sql
id              UUID PRIMARY KEY
title           TEXT NOT NULL
description     TEXT
timeline        VARCHAR(50) DEFAULT 'short_term'  -- short_term, long_term
owner_id        UUID REFERENCES users(id)
organization_id UUID NOT NULL REFERENCES organizations(id)
team_id         UUID REFERENCES teams(id)
department_id   UUID  -- Alternative to team_id
status          VARCHAR(50) DEFAULT 'open'  -- open, closed
priority_level  VARCHAR(50) DEFAULT 'medium'  -- low, medium, high
vote_count      INTEGER DEFAULT 0
archived_at     TIMESTAMP WITH TIME ZONE  -- Soft archive
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### todos
```sql
id              UUID PRIMARY KEY
title           VARCHAR(255) NOT NULL
description     TEXT
assigned_to     UUID REFERENCES users(id)
created_by      UUID REFERENCES users(id)
due_date        DATE
status          VARCHAR(50) DEFAULT 'pending'  -- pending, in_progress, complete, cancelled
organization_id UUID NOT NULL REFERENCES organizations(id)
team_id         UUID REFERENCES teams(id)
department_id   UUID  -- Alternative to team_id
archived_at     TIMESTAMP WITH TIME ZONE
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### scorecard_metrics
```sql
id              UUID PRIMARY KEY
name            VARCHAR(255) NOT NULL
description     TEXT
target_value    TEXT  -- Can be numeric or text
target_operator VARCHAR(10)  -- '>=', '<=', '=', etc.
frequency       VARCHAR(50)  -- weekly, monthly
metric_type     VARCHAR(50)  -- number, percentage, currency, etc.
owner_id        UUID REFERENCES users(id)
organization_id UUID NOT NULL REFERENCES organizations(id)
team_id         UUID REFERENCES teams(id)
group_id        UUID REFERENCES scorecard_groups(id)
display_order   INTEGER DEFAULT 0
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### scorecard_scores
```sql
id              UUID PRIMARY KEY
metric_id       UUID NOT NULL REFERENCES scorecard_metrics(id)
actual_value    TEXT
week_ending     DATE
month           INTEGER
year            INTEGER
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

## Foreign Key Naming Inconsistencies

**Important**: Some foreign key columns have legacy names:
- `core_values.vto_id` → references `business_blueprints.id`
- `core_focus.vto_id` → references `business_blueprints.id`
- Other tables may have similar legacy naming

## Renamed Tables (Trademark Compliance)

| Old Name | New Name |
|----------|----------|
| vtos | business_blueprints |
| rocks | quarterly_priorities |
| eosi_organizations | consultant_organizations |

## Special UUIDs

- Leadership Team: `'00000000-0000-0000-0000-000000000000'`
- All other UUIDs: Use `gen_random_uuid()` or `uuid_generate_v4()`

## Common Pitfalls

1. **Business Blueprint Setup**: Must use `team_id = NULL` for organization-level
2. **Team Members**: Link users via `team_members` table, not direct `team_id` on users
3. **Leadership Team**: Must have `is_leadership_team = true` for UI to work
4. **Soft Deletes**: Use `deleted_at` or `archived_at` timestamps, don't hard delete
5. **Legacy Columns**: Check actual table structure, don't assume columns exist

## Checking Table Structure

Always verify before writing scripts:
```sql
-- List all columns for a table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'YOUR_TABLE_NAME'
ORDER BY ordinal_position;

-- Check foreign key relationships
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'YOUR_TABLE_NAME';
```