# Scorecard Data Mismatch Fix

## Issue
The scorecard was showing different data between the Scorecard page and the Weekly Accountability Meeting page for Bennett Material Handling.

## Root Causes Identified

### 1. Different Week Start Days
- **ScorecardPage.jsx**: Used Monday as the start of the week
- **ScorecardTable.jsx** (used in WeeklyAccountabilityMeetingPage): Used Sunday as the start of the week
- This caused the two pages to use different week identifiers for the same logical week

### 2. Different Team ID Handling
- **ScorecardPage.jsx**: Always used `user?.teamId || '00000000-0000-0000-0000-000000000000'`
- **WeeklyAccountabilityMeetingPage.jsx**: Used teamId from URL parameter (passed from MeetingsPage)
- If no teamId was in the URL, it could fetch data for a different team

### 3. Different Organization ID Logic
- **ScorecardPage.jsx**: Only used `user?.organizationId`
- **WeeklyAccountabilityMeetingPage.jsx**: Used `localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id`
- This could cause issues when consultants are impersonating client organizations

## Fixes Applied

### 1. Standardized Week Calculation (in ScorecardTable.jsx)
```javascript
// Added getWeekStartDate function to calculate Monday as start of week
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

// Updated getWeekDates to use Monday as start of week
const getWeekDates = () => {
  const weeks = [];
  const today = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (i * 7));
    const mondayOfWeek = getWeekStartDate(weekStart);
    
    // Store the week identifier in ISO format for consistent storage
    weeks.push(mondayOfWeek.toISOString().split('T')[0]);
  }
  
  return weeks;
};
```

### 2. Standardized Team ID Handling (in WeeklyAccountabilityMeetingPage.jsx)
```javascript
// Added fallback to use same default as ScorecardPage
const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
```

### 3. Standardized Organization ID Logic (in ScorecardPage.jsx)
```javascript
// Updated to check for impersonated org ID first
const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
```

## Testing Recommendations

1. Test scorecard data consistency between both pages for:
   - Regular users viewing their own organization
   - Consultants viewing client organizations (impersonation)
   - Different team selections in the Weekly Accountability Meeting

2. Verify that week dates align properly:
   - Check that the same weeks show the same data
   - Verify that "Current Week" is the same on both pages

3. Test edge cases:
   - Sunday/Monday boundary
   - Year transitions
   - Missing team IDs in URL

## Additional Notes

- Both pages now use Monday as the start of the week, which is consistent with business practices
- The impersonation logic is now consistent across both pages
- Team ID handling ensures both pages default to the same team when not specified