# Platform Rebrand - Trademark Replacement Mapping

## CRITICAL: Complete these replacements within 48 hours to avoid legal action

### Core Terminology Replacements

| Current Term | Replacement | Context |
|--------------|-------------|---------|
| EOS Platform | Strategic Execution Platform (SEP) | Platform name |
| EOS | Strategic Execution | General references |
| EOS Implementer | Strategy Consultant | User type |
| EOSI | SC (Strategy Consultant) | Abbreviated form |
| @eosworldwide.com | @strategyconsultant.com | Email domain validation |
| Rocks | Quarterly Priorities | Goal tracking |
| V/TO® or VTO | Business Blueprint | Vision/strategy document |
| Level 10 Meeting | Accountability Meeting | Meeting type |
| L10 | Accountability Meeting | Abbreviated form |

### Database Schema Changes

| Current Name | New Name |
|--------------|----------|
| rocks (table) | quarterly_priorities |
| vtos (table) | business_blueprints |
| is_eosi (column) | is_strategy_consultant |
| eosi_email (column) | consultant_email |
| eosi_organizations (table) | consultant_organizations |
| eosi_user_id (column) | consultant_user_id |

### Component/File Renames

| Current Name | New Name |
|--------------|----------|
| EOSIDashboard.jsx | ConsultantDashboard.jsx |
| EOSIRegisterPage.jsx | ConsultantRegisterPage.jsx |
| eosiController.js | consultantController.js |
| eosiRoutes.js | consultantRoutes.js |
| VTOPage.jsx | BusinessBlueprintPage.jsx |
| RocksPage.jsx | QuarterlyPrioritiesPage.jsx |
| vtoController.js | businessBlueprintController.js |
| rocksController.js | quarterlyPrioritiesController.js |

### Route Changes

| Current Route | New Route |
|---------------|-----------|
| /eosi | /consultant |
| /eosi-register | /consultant-register |
| /vto | /business-blueprint |
| /rocks | /quarterly-priorities |
| /api/v1/eosi/* | /api/v1/consultant/* |

### UI Text Replacements

| Current Text | New Text |
|--------------|----------|
| "Master Your EOS Implementation" | "Master Your Strategic Execution" |
| "EOS Platform helps you implement the Entrepreneurial Operating System" | "Strategic Execution Platform helps you implement proven business strategies" |
| "Are you an EOS Implementer?" | "Are you a Strategy Consultant?" |
| "Create your EOSI account" | "Create your Consultant account" |
| "Rocks Tracking" | "Quarterly Priority Tracking" |
| "Set your Rocks" | "Set your Quarterly Priorities" |
| "V/TO® Management" | "Business Blueprint Management" |
| "L10 Meetings" | "Accountability Meetings" |

### Email Domain Logic
- Remove all checks for `@eosworldwide.com`
- Replace with a configurable domain list or remove domain restrictions entirely
- Consider using an approval/invitation system instead

### Legal Compliance Notes
1. Remove ALL references to "Entrepreneurial Operating System"
2. Remove ALL ® and ™ symbols
3. Avoid any suggestion of affiliation with EOS Worldwide
4. Use generic business terminology throughout
5. Update all marketing materials and documentation

### Implementation Priority
1. **Immediate (Hour 1-4)**: Update all user-facing text and branding
2. **High (Hour 4-12)**: Update component names and routes
3. **Medium (Hour 12-24)**: Update backend logic and controllers
4. **Low (Hour 24-48)**: Update database schema with migrations

### Post-Rebrand Actions
1. Review all changes with IP attorney
2. Update Terms of Service and Privacy Policy
3. Notify existing users of rebrand
4. Update all external documentation
5. Monitor for any missed references

## IMPORTANT: This is not just a find-and-replace operation. Context matters. Ensure replacements make sense grammatically and maintain functionality.