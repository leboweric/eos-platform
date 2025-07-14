// Team utility functions

export const LEADERSHIP_TEAM_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Get the team ID to use for API calls
 * NINETY.IO MODEL: Explicit context-based team selection
 * @param {Object} user - The user object
 * @param {string|null} context - The context ('leadership' or department team ID)
 * @returns {string} The team ID to use
 */
export const getTeamId = (user, context = null) => {
  // NINETY.IO MODEL: Explicit context-based team selection
  
  // For Leadership context, always use Leadership Team ID
  if (context === 'leadership') {
    return LEADERSHIP_TEAM_ID;
  }
  
  // For department context, use the specific department team ID
  if (context && context !== 'leadership') {
    return context; // This should be the department team ID
  }
  
  // Auto-detect: If user is on leadership team, use Leadership ID
  const leadershipTeam = user?.teams?.find(t => t.is_leadership_team);
  if (leadershipTeam) {
    return LEADERSHIP_TEAM_ID;
  }
  
  // Otherwise use first available team
  return user?.teams?.[0]?.id || LEADERSHIP_TEAM_ID;
};