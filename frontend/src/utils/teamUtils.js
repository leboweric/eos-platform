// Team utility functions

export const LEADERSHIP_TEAM_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Get the team ID to use for API calls
 * For main pages (not department-specific), always use Leadership Team ID
 * @param {Object} user - The user object
 * @param {boolean} forceLeadership - Force using Leadership Team ID
 * @returns {string} The team ID to use
 */
export const getTeamId = (user, forceLeadership = false) => {
  if (forceLeadership) {
    return LEADERSHIP_TEAM_ID;
  }
  
  // Check if user is on leadership team
  const leadershipTeam = user?.teams?.find(t => t.is_leadership_team);
  if (leadershipTeam) {
    return leadershipTeam.id;
  }
  
  // Default to Leadership Team ID for backward compatibility
  return LEADERSHIP_TEAM_ID;
};