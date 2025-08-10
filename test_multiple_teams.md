# Multiple Team Assignment Feature - Testing Guide

## What's Been Implemented

### Backend Changes (userController.js)
1. **updateUser function**: Now accepts both `teamId` (single) and `teamIds` (array) for backward compatibility
2. **createUser function**: Now accepts both `teamId` (single) and `teamIds` (array) 
3. **getOrganizationUsers query**: Returns `team_ids` array for each user
4. **Database queries**: Updated to handle multiple team assignments via team_members table

### Frontend Changes (UsersPage.jsx)
1. **New MultiSelect component**: Custom multi-select UI component for selecting multiple teams
2. **Edit User Dialog**: Now uses MultiSelect to allow assigning users to multiple departments
3. **Create User Dialog**: Now uses MultiSelect for multiple department selection
4. **User listing**: Shows all departments a user belongs to (comma-separated)

## How to Test

### Testing Edit User Functionality
1. Navigate to Team Members page (http://localhost:5174/users)
2. Click the Edit button (pencil icon) on any user
3. In the Edit User dialog:
   - The "Departments" field now shows a multi-select dropdown
   - Click to open the dropdown
   - Check/uncheck multiple departments
   - Selected departments appear as badges
   - Click X on a badge to remove that department
4. Click "Update User" to save changes
5. Verify the user's departments column updates to show all selected departments

### Testing Create User Functionality
1. Click "Create User" button on Team Members page
2. Fill in user details
3. In the "Departments" field:
   - Select multiple departments using the multi-select
   - Each selected department appears as a badge
4. Click "Create User"
5. Verify the new user appears with all selected departments

### Database Verification
Check the team_members table to verify multiple team assignments:
```sql
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  STRING_AGG(t.name, ', ' ORDER BY t.name) as departments
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY u.last_name;
```

## Features
- **Backward Compatible**: Still supports single team assignment for existing code
- **Multi-Select UI**: Clean interface with checkboxes and badges
- **Database Ready**: Uses existing team_members many-to-many relationship
- **Visual Feedback**: Selected departments show as badges with remove option
- **Department Labels**: Shows "(Leadership)" tag for leadership team

## Next Steps (Optional)
1. Add bulk team assignment functionality
2. Add team filtering on the users list
3. Add validation for required team assignments
4. Add team-based permissions/access control