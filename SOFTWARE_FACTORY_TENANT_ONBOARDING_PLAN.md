# Software Factory Tenant Onboarding Plan

**Date**: October 2025 (or current)  
**Tenant Name**: Software Factory  
**Slug**: `software-factory`  
**Owner**: Eric LeBow (primary)  
**Status**: Planning Phase

---

## 1. Executive Summary

This plan outlines the complete process for adding "Software Factory" as a new tenant (organization) in the AXP platform. It covers creation methods, critical database rules, post-setup configuration, data population options, verification, and rollback.

**Key Goals**:
- Create a properly isolated, production-ready tenant following all current best practices.
- Avoid historical pitfalls (special UUID reuse, missing subscriptions, incorrect blueprint team_id).
- Provide both UI-driven and SQL-driven paths.
- Include tailored recommendations for a software/development-focused organization.

**Critical References** (read before executing):
- [Claude.md](/Users/ericlebow/github-repos/eos-platform/Claude.md) — especially "Creating Organizations - CRITICAL" section and "⚠️ NO LOCAL FILE STORAGE"
- [docs/migrations/creating-organizations.md](/Users/ericlebow/github-repos/eos-platform/docs/migrations/creating-organizations.md)
- [SPECIAL_UUID_MIGRATION_GUIDE.md](/Users/ericlebow/github-repos/eos-platform/SPECIAL_UUID_MIGRATION_GUIDE.md)
- [demo/DEMO_DATA_TEMPLATE.sql](/Users/ericlebow/github-repos/eos-platform/demo/DEMO_DATA_TEMPLATE.sql) + README

---

## 2. Tenant Profile Assumptions (Customize Before Execution)

| Item                  | Recommended Value                          | Notes |
|-----------------------|--------------------------------------------|-------|
| Organization Name     | Software Factory                           | Exact casing |
| Slug                  | software-factory                           | Auto-generated from name; unique |
| Subscription          | 30-day free trial → 'pro' plan             | Or Growth/Scale if known |
| Primary Admin         | TBD (name + email@softwarefactory.com or client domain) | Will be 'admin' role |
| Consultant Managed?   | Yes (Eric)                                 | Add to `consultant_organizations` |
| Initial Methodology   | EOS (default) or Hybrid (agile + EOS)      | Use terminology presets later |
| Initial Teams         | Leadership Team + Engineering, Product, Sales, Operations, QA | Software-specific |
| Branding              | Logo + primary/secondary/accent colors     | Request from client |
| Data Strategy         | Start empty OR seed with demo data         | Or Ninety.io import if migrating |

**Action**: Fill in actual admin details and branding before proceeding.

---

## 3. Creation Methods (Choose One)

### 3.1 Recommended: Consultant Dashboard (for Eric-managed clients)

**When to use**: Client is under consulting/managed service agreement.

**Steps**:
1. Log in with a user that has `is_consultant = true` (e.g. Eric's account).
2. The dashboard auto-redirects consultants to `/consultant` (see `DashboardRedesigned.jsx` / `DashboardOriginal.jsx`).
3. In the Consultant Dashboard UI:
   - Click the **+ Create** / "New Client Organization" button (opens dialog).
   - Fill:
     - Organization Name: `Software Factory`
     - Admin First Name / Last Name
     - Admin Email (must be unique across entire platform)
   - Submit.
4. System actions (see `consultantController.js:8`):
   - Creates `organizations` row (triggers subscription/trial setup if active).
   - Creates `consultant_organizations` link.
   - Creates admin `users` row with temporary password (UUID slice).
   - Creates `teams` "Leadership Team" with `is_leadership_team = true`.
   - Creates `team_members` entry (role 'admin').
   - Sends welcome email with temp password + login URL.
5. Client receives email, logs in, is forced to change password (if `requires_password_change` set — currently not in this flow; consider enhancing).

**Post-creation**: Immediately verify subscription and run any missing setup from Section 6.

**Advantages**: Proper consultant linkage, email notification, UI convenience.

### 3.2 Self-Service Registration (for independent clients)

**When to use**: Client signs up themselves; no immediate consulting relationship.

**Steps**:
1. Direct client to: `https://axplatform.app/register` (or your Netlify frontend).
2. They enter:
   - Organization Name: `Software Factory`
   - Their details (they become the first admin)
   - Password
   - Accept legal agreements (terms + privacy)
3. System (see `authController.js:38` — `register`):
   - Creates org + slug (makes unique if collision).
   - Creates user (role 'admin').
   - Creates Leadership Team (`is_leadership_team = true`).
   - Links via `team_members`.
   - Explicitly creates `subscriptions` row (trialing, pro, 30 days, price 0).
   - Sends new trial notification.
   - Returns JWT; user is logged in.
4. No consultant link created (add manually later via SQL if needed).

**Note**: Legal agreement logs are written. This is the most "official" self-serve path.

### 3.3 Manual SQL (Maximum Control — for demos, bulk, special cases, pre-seeding)

**Use this** when you need:
- Pre-populated demo data immediately.
- Multiple initial users/teams.
- Exact control over IDs (for testing).
- Bypassing email flows.

**Best Practice Template**: See Section 10 below for a ready-to-customize SQL script.

**Must Follow** (from Claude.md + recent scripts like `migrate_field_outdoor_services.sql`):
- Use `gen_random_uuid()` for **both** organization and Leadership Team.
- **NEVER** reuse `'00000000-0000-0000-0000-000000000000'`.
- Create `business_blueprints` with `team_id = NULL` (org-level).
- Insert `subscriptions` row using current column set (or rely on trigger + verify).
- If consultant-managed: INSERT into `consultant_organizations`.

---

## 4. Critical Rules (Do Not Violate)

From Claude.md:

1. **NO special UUID for Leadership Teams** on new orgs.
2. **Business Blueprint**: `team_id IS NULL` for organization-level (the API queries this exactly; auto-creates if missing on GET but explicit creation is safer).
3. **Scorecard Metrics**: Must populate `owner` column or they won't display.
4. **Quarterly Priorities**: Never filter by quarter/year in queries — use active + deleted_at IS NULL.
5. **ES6 modules** in any new backend code (not relevant for SQL).
6. **"Clean" components** are production — not touching UI here.
7. **Logo/Files**: Stored in DB (`logo_data` BYTEA etc.), never filesystem.

Additional from research:
- Subscriptions often missing or incomplete on non-self-registered orgs → always verify + fix.
- `team_members.role` vs `users.role` — both used.
- Run `npm run lint` before any backend changes (if extending flows).

---

## 5. Post-Creation Configuration Checklist

After creation (any method), complete these in order:

### 5.1 Database Verification (pgAdmin on Railway `railway` DB)

Run these queries and confirm:

```sql
-- 1. Organization
SELECT id, name, slug, created_at, subscription_tier, trial_ends_at, has_active_subscription 
FROM organizations WHERE slug = 'software-factory';

-- 2. Leadership Team (MUST have is_leadership_team = true, unique UUID)
SELECT id, name, is_leadership_team FROM teams 
WHERE organization_id = '<org-uuid>' ORDER BY created_at;

-- 3. Business Blueprint (MUST have team_id IS NULL)
SELECT id, organization_id, team_id, created_at FROM business_blueprints 
WHERE organization_id = '<org-uuid>';

-- 4. Subscription (critical for billing)
SELECT * FROM subscriptions WHERE organization_id = '<org-uuid>';

-- 5. Users + team membership
SELECT u.email, u.role, tm.role as team_role, t.name as team
FROM users u
JOIN team_members tm ON tm.user_id = u.id
JOIN teams t ON t.id = tm.team_id
WHERE u.organization_id = '<org-uuid>';

-- 6. Consultant link (if applicable)
SELECT * FROM consultant_organizations WHERE organization_id = '<org-uuid>';
```

**Fixes if broken**:
- Missing subscription: Run INSERT from `authController.js` pattern or migration 046.
- Wrong leadership UUID: See SPECIAL_UUID_MIGRATION_GUIDE.md (rare for new orgs).
- Missing blueprint: `INSERT INTO business_blueprints (id, organization_id) VALUES (gen_random_uuid(), '<org-uuid>');`
- No consultant link: `INSERT INTO consultant_organizations (consultant_user_id, organization_id) VALUES ('<your-eric-uuid>', '<org-uuid>');`

### 5.2 First Login & Admin Tasks (UI)

1. Admin logs in with temp password (consultant path) or chosen password.
2. Change password immediately.
3. Complete any profile/organization basics.
4. **Upload Logo**:
   - Settings → Organization → Logo upload (uses `POST /api/v1/organizations/current/logo` → stored as BYTEA).
   - Optionally set `logoSize` % via localStorage/UI helper.
5. **Set Theme Colors** (highly recommended for branding):
   - Use organization settings form (if exposed) or direct SQL:
     ```sql
     UPDATE organizations 
     SET theme_primary_color = '#0EA5E9',   -- e.g. sky blue for tech
         theme_secondary_color = '#6366F1', -- indigo
         theme_accent_color = '#22C55E'     -- green for "factory" success
     WHERE slug = 'software-factory';
     ```
   - See `frontend/src/update_theme.sh` and `fix_theme_storage.py` for patterns.
6. Invite additional users (Users page).
7. Create additional teams (e.g. "Engineering", "Platform", "Client Delivery").

### 5.3 Data Population Strategy (Choose One)

**Option A: Empty Start (Cleanest for real clients)**
- Client populates VTO, Rocks, Scorecard, etc. themselves.
- Best for production clients.

**Option B: Demo Data Seed (Great for sales demos / training)**
- Use [demo/DEMO_DATA_TEMPLATE.sql](/Users/ericlebow/github-repos/eos-platform/demo/DEMO_DATA_TEMPLATE.sql).
- **Customize heavily for Software Factory**:
  - Industry: "Software Development / DevOps Platform" or "Internal Tools Factory"
  - Teams: Leadership, Engineering (Frontend/Backend/Platform), Product, Design, QA/SRE, Sales/GTM, Customer Success
  - Metrics examples: Sprint Velocity, PR Cycle Time, Deploy Frequency (DORA), Bug Escape Rate, Uptime %, Story Points Delivered, NPS, MRR Growth
  - Rocks: "Launch v2.3 platform", "Reduce MTTR to <15min", "Achieve SOC2 Type II", "Hire 3 senior engineers", etc.
  - 10-year target: "The operating system for modern software factories"
- Follow demo/README.md exactly (get org_id + CEO user_id first).

**Option C: Ninety.io / Other Migration**
- Use the existing **Scorecard Import** feature (Ninety.io CSV monthly import).
- See `backend/src/services/ninetyImportService.js` + `ScorecardImportPage.jsx`.
- Handles dedup, owner mapping, correct Monday week dates, etc.
- Run maintenance SQL afterwards if dates/years are off (see Claude.md "Ninety.io Scorecard Import System").

**Option D: Hybrid** — Seed lightweight org chart + core VTO + a few rocks/scorecard, let client fill rest.

### 5.4 Advanced / Nice-to-Have

- **Terminology Preset**: If they primarily use OKRs or custom agile terms, go to Terminology settings (routes in `terminology.js`) and apply preset or custom.
- **Organizational Chart**: Create via UI or seed via `add_demo_org_chart.sql` pattern.
- **Cloud Storage Integration**: Connect Google Drive / OneDrive / SharePoint (see docs/setup/cloud-storage.md).
- **Email-to-Issue**: Configure forwarding (docs/setup/email-to-issue-setup.md).
- **Custom Processes**: If they want documented Core Processes / Playbooks.
- **Stripe / Billing**: If moving off trial, create customer in Stripe dashboard, update `subscriptions` row with stripe ids, or let them self-serve via billing portal.
- **Subdomain**: Client subdomains like `softwarefactory.axplatform.app` are supported via Netlify + wildcard? (verify current DNS).

---

## 6. Software Factory-Specific Recommendations

**Why tailored?** Name implies software development, tooling, or "factory" for building software (high process maturity, metrics-driven, possibly agile + EOS hybrid).

**Suggested Structure**:
- **Teams**:
  - Leadership Team (core)
  - Engineering (or split: Platform, Product Engineering, Infrastructure)
  - Product Management
  - Design / UX
  - Quality & SRE
  - Growth / Sales
  - Customer Success / Support
- **Core Focus Ideas**: "Build reliable, observable software platforms at scale" + "Developer experience as competitive advantage"
- **Scorecard (DORA + Business)**: Deploy Freq, Lead Time, Change Fail Rate, MTTR, Velocity, Code Coverage, Security Vulns, Customer Incidents, Revenue per Engineer, etc.
- **Meeting Cadence**: Weekly tactical + Quarterly planning + possibly bi-weekly architecture reviews.
- **Leverage Adaptive Framework**: Start in EOS mode for Rocks/IDS/Scorecard, later experiment with OKR translation for engineering OKRs without data loss.

**Branding Suggestions** (ask client for hex):
- Primary: Tech blue or vibrant purple
- Secondary: Clean slate/gray + accent green for "done" states

---

## 7. Verification Checklist (Before Handover)

**Database**:
- [ ] Org exists with correct slug
- [ ] Exactly one Leadership Team with `is_leadership_team = true` and non-special UUID
- [ ] At least one `business_blueprints` row with `team_id IS NULL`
- [ ] `subscriptions` row exists with realistic trial dates + plan
- [ ] No duplicate blueprints or teams
- [ ] All users have `organization_id` set correctly

**UI (as admin + test user)**:
- [ ] Can log in
- [ ] Dashboard loads without errors
- [ ] VTO / Business Blueprint page works and shows org-level content
- [ ] Can create/edit Rocks (follows "Review Prior Quarter" elegant pattern per Claude.md)
- [ ] Scorecard loads (metrics have `owner`)
- [ ] To-Dos / Issues / Headlines / Meetings all functional
- [ ] Logo displays (upper left, sized correctly)
- [ ] Theme colors applied across app
- [ ] Real-time meeting collab works (if `ENABLE_MEETINGS=true`)
- [ ] Can invite users and switch teams
- [ ] (If consultant) Can switchToClientOrganization from Consultant Dashboard and back

**Billing / Access**:
- [ ] Trial end date visible / correct
- [ ] Consultant can impersonate (if applicable)
- [ ] No cross-org data leakage (test with another tenant)

**Performance / Polish**:
- [ ] No console errors on key pages
- [ ] Mobile responsive (basic)
- [ ] Export (Excel/PDF) works for their data

---

## 8. Timeline Estimate

| Phase                        | Time     | Owner     |
|------------------------------|----------|-----------|
| Gather details + branding    | 1-2 days | Eric + Client |
| Creation (UI or SQL)         | 15 min   | Eric      |
| DB + basic config verification | 30 min | Eric      |
| Logo + Theme                 | 30 min   | Eric      |
| Additional users/teams       | 1 hr     | Eric/Client |
| Data seeding decision + exec | 30min - 2hrs | Eric |
| Full verification + training | 1-2 hrs  | Eric + Client |
| Handover / first real meeting| 1 hr     | Eric + Client |

**Total for basic**: < 1 day  
**Total with rich demo data**: 1-2 days

---

## 9. Rollback / Cleanup

If the tenant must be removed (test org, wrong name, etc.):

**Safe deletion order** (cascades help but be explicit):

```sql
-- 1. Remove consultant link (if any)
DELETE FROM consultant_organizations WHERE organization_id = '<org-uuid>';

-- 2. (Optional) Soft-delete critical items first if you want recoverable
-- UPDATE quarterly_priorities SET deleted_at = NOW() WHERE organization_id = '<org-uuid>';
-- ... same for todos, issues, scorecard_metrics, etc. (see soft-delete migrations)

-- 3. Hard delete org (cascades to users, teams, team_members, blueprints, subscriptions, etc. via FKs)
-- WARNING: Irreversible for most data
DELETE FROM organizations WHERE id = '<org-uuid>';
```

**Better for tests**: Use a dedicated test org and reset scripts (see `reset_demo_org.sql` patterns).

Always back up via `pg_dump` or Railway snapshots before destructive actions on production.

---

## 10. Ready-to-Use SQL Template (for Manual Creation)

Copy this into a new file e.g. `create_software_factory_org.sql`, customize variables, and run in pgAdmin against the Railway DB.

```sql
-- =====================================================
-- Create Software Factory Tenant
-- Follows all 2025 best practices (gen_random_uuid, NULL team_id, etc.)
-- =====================================================

BEGIN;

-- ========================================
-- CUSTOMIZE THESE
-- ========================================
DO $$
DECLARE
    v_org_name TEXT := 'Software Factory';
    v_slug TEXT := 'software-factory';  -- Will be uniquified if needed
    v_admin_email TEXT := 'founder@softwarefactory.com';  -- CHANGE
    v_admin_first TEXT := 'Alex';                       -- CHANGE
    v_admin_last TEXT := 'Rivera';                      -- CHANGE
    v_consultant_user_id UUID := '<ERIC_USER_UUID>';    -- Optional: set if consultant-managed

    v_org_id UUID;
    v_leadership_team_id UUID;
    v_admin_user_id UUID;
    v_blueprint_id UUID;
BEGIN
    -- 1. Create Organization
    INSERT INTO organizations (name, slug, created_at, updated_at)
    VALUES (v_org_name, v_slug, NOW(), NOW())
    RETURNING id INTO v_org_id;

    RAISE NOTICE 'Created organization % with ID %', v_org_name, v_org_id;

    -- 2. Create Leadership Team (CRITICAL: gen_random_uuid + is_leadership_team=true)
    INSERT INTO teams (id, name, organization_id, is_leadership_team, description, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Leadership Team', v_org_id, true, 'Executive leadership team', NOW(), NOW())
    RETURNING id INTO v_leadership_team_id;

    RAISE NOTICE 'Created Leadership Team ID %', v_leadership_team_id;

    -- 3. Create Admin User (password = Abc123!@#  -- force change recommended)
    INSERT INTO users (
        id, organization_id, email, password_hash, first_name, last_name, role,
        created_at, updated_at, is_active, requires_password_change
    )
    VALUES (
        gen_random_uuid(), v_org_id, v_admin_email,
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',  -- Abc123!@#
        v_admin_first, v_admin_last, 'admin',
        NOW(), NOW(), true, true
    )
    RETURNING id INTO v_admin_user_id;

    -- Link admin to Leadership Team
    INSERT INTO team_members (team_id, user_id, role, joined_at)
    VALUES (v_leadership_team_id, v_admin_user_id, 'admin', NOW());

    RAISE NOTICE 'Created admin user %', v_admin_email;

    -- 4. Create Org-Level Business Blueprint (CRITICAL: team_id = NULL)
    INSERT INTO business_blueprints (id, organization_id, team_id, created_at, updated_at)
    VALUES (gen_random_uuid(), v_org_id, NULL, NOW(), NOW())
    RETURNING id INTO v_blueprint_id;

    RAISE NOTICE 'Created org-level blueprint ID % (team_id=NULL)', v_blueprint_id;

    -- 5. Ensure Subscription exists (in case trigger is disabled)
    INSERT INTO subscriptions (
        organization_id, status, plan_id, trial_type,
        trial_start_date, trial_end_date,
        billing_email, user_count, price_per_user,
        created_at, updated_at
    )
    VALUES (
        v_org_id, 'trialing', 'pro', 'free',
        NOW(), NOW() + INTERVAL '30 days',
        v_admin_email, 1, 0,
        NOW(), NOW()
    )
    ON CONFLICT (organization_id) DO NOTHING;

    -- 6. Optional: Link to Consultant (uncomment and set v_consultant_user_id)
    /*
    IF v_consultant_user_id IS NOT NULL THEN
        INSERT INTO consultant_organizations (consultant_user_id, organization_id)
        VALUES (v_consultant_user_id, v_org_id);
        RAISE NOTICE 'Linked to consultant %', v_consultant_user_id;
    END IF;
    */

    -- 7. Optional: Add a couple more teams immediately
    INSERT INTO teams (name, organization_id, is_leadership_team, created_at, updated_at)
    VALUES 
        ('Engineering', v_org_id, false, NOW(), NOW()),
        ('Product', v_org_id, false, NOW(), NOW()),
        ('Operations', v_org_id, false, NOW(), NOW());

    RAISE NOTICE 'Added sample teams';

    -- Final summary
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUCCESS: Software Factory tenant created';
    RAISE NOTICE 'Org ID: %', v_org_id;
    RAISE NOTICE 'Leadership Team ID: %', v_leadership_team_id;
    RAISE NOTICE 'Admin: % / Abc123!@# (change on first login)', v_admin_email;
    RAISE NOTICE 'Blueprint (org-level): %', v_blueprint_id;
    RAISE NOTICE 'Next: Verify in pgAdmin, upload logo, set theme';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Post-run verification (run separately)
-- SELECT * FROM organizations WHERE slug = 'software-factory';
```

**Customize**:
- Emails, names, consultant UUID (query your own user id first: `SELECT id FROM users WHERE email LIKE '%lebow%' OR is_consultant = true;`)
- Add more teams/users as needed in the DO block.
- For demo seeding, **stop here**, note the IDs, then run customized `DEMO_DATA_TEMPLATE.sql`.

---

## 11. Next Actions & Open Questions

**Immediate (Eric)**:
- [ ] Confirm exact admin details and branding assets from client/stakeholder.
- [ ] Decide creation method (UI vs SQL vs self-reg).
- [ ] Decide data population approach (empty vs demo vs import).
- [ ] Update this plan with actual values.
- [ ] Execute creation + verification.
- [ ] (Optional but recommended) Modernize `docs/migrations/creating-organizations.md` to reference current patterns (Field Outdoor Services script + this plan).

**Open Questions for Client**:
- Exact legal company name for billing?
- Preferred billing: monthly/annual? plan tier?
- Current tools (Ninety, Excel, Notion, Jira + Confluence, etc.)?
- Target go-live date for first real meeting in AXP?
- Any must-have custom terminology or processes?

**Future Improvements** (out of scope for this tenant but noted):
- Enhance consultant create flow to also set `requires_password_change` and better onboarding email.
- Add one-click "Provision Demo Tenant" button for sales.
- Auto-apply sensible default scorecard for software teams.

---

## 12. References & Related Files

- Critical Rules: `Claude.md`
- Creating Orgs Doc (needs update): `docs/migrations/creating-organizations.md`
- Demo Seeding: `demo/DEMO_DATA_TEMPLATE.sql` + `demo/README.md`
- Special UUID History: `SPECIAL_UUID_MIGRATION_GUIDE.md`
- Ninety Import Deep Dive: `Claude.md` (Ninety.io section)
- Subscription Fixes: `fix_sentient_wealth_subscription.sql`, migration `046_update_trial_infrastructure.sql`
- Theme/Logo: `organizationController.js`, `add_organization_logo.sql`, `frontend/src/update_theme.sh`
- Consultant Flow Code: `backend/src/controllers/consultantController.js`, `frontend/src/pages/ConsultantDashboard.jsx`
- Self-Reg Flow: `backend/src/controllers/authController.js`

---

**Final Exact Requirements (executed)**:
- **No Consultant Dashboard / no `consultant_organizations` linkage**.
- Standalone tenant for Software Factory (AIOPs / The Software Factory at https://softwarefactory.one/).
- **Only** a Leadership Team (no other teams whatsoever).
- **Exactly three users**, all on the Leadership Team:
  - eric@aiop.one (admin)
  - rick@aiop.one (member)
  - charlie@aiop.one (member)
- Modelled on Bennett Material Handling's clean production setup (unique Leadership Team UUID + `is_leadership_team = true`, org-level blueprint with `team_id = NULL`).
- Use the real SF logo from the landing page (see `logos/software-factory/icon-192.png` — blue "SF" with yellow chevron).

**Ready-to-run script**: `create_software_factory_tenant.sql` (already updated with the exact spec above).

**New Focused Artifacts Created** (use these instead of the old general template):
- [create_software_factory_tenant.sql](/Users/ericlebow/github-repos/eos-platform/create_software_factory_tenant.sql) — Ready-to-run standalone creation script (Bennett-style).
- [seed_software_factory_vto.sql](/Users/ericlebow/github-repos/eos-platform/seed_software_factory_vto.sql) — Optional but highly recommended starter Business Blueprint content pulled directly from the https://softwarefactory.one/ messaging (gives instant professional look).
- `logos/software-factory/` — Downloaded production icons (icon-192.png is the key branded asset).

**Plan Status**: Ready for immediate execution. The focused SQL files above supersede the older general template in Section 10.

**Owner**: Eric LeBow  
**Last Updated**: Current session (post-clarification)

---

*This plan was generated following the full current architecture, database patterns, and hard-won lessons documented across the repository (Oct 2025 context), with Bennett as the explicit production reference.*
