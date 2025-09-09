// Team utility functions

// Note: This special UUID should NOT be used for creating new items
// It's a placeholder that doesn't map to any real team
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
  
  // For Leadership context, find the actual leadership team for this org
  if (context === 'leadership') {
    const leadershipTeam = user?.teams?.find(t => t.is_leadership_team);
    if (leadershipTeam) {
      return leadershipTeam.id;
    }
    // Fallback to special UUID if no leadership team found
    return LEADERSHIP_TEAM_ID;
  }
  
  // For department context, use the specific department team ID
  if (context && context !== 'leadership') {
    return context; // This should be the department team ID
  }
  
  // Auto-detect: If user is on leadership team, use that team's ID
  const leadershipTeam = user?.teams?.find(t => t.is_leadership_team);
  if (leadershipTeam) {
    return leadershipTeam.id;
  }
  
  // Otherwise use first available team
  return user?.teams?.[0]?.id || LEADERSHIP_TEAM_ID;
};

/**
 * Get the user's actual team ID for creating items (issues, todos, etc.)
 * This ensures items are created with a real team ID, not the placeholder
 * 
 * Priority:
 * 1. Non-leadership team (actual department)
 * 2. Leadership team (actual team, not placeholder)
 * 3. First available team
 * 4. null (never the placeholder UUID)
 * 
 * @param {Object} user - The user object from auth store
 * @returns {string|null} The team ID or null
 */
export const getUserTeamId = (user) => {
  if (!user?.teams || user.teams.length === 0) {
    return null;
  }

  // First try to find a non-leadership team (user's actual department)
  const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
  if (nonLeadershipTeam) {
    return nonLeadershipTeam.id;
  }

  // Fall back to leadership team (actual team, not the placeholder)
  const leadershipTeam = user.teams.find(team => team.is_leadership_team);
  if (leadershipTeam) {
    return leadershipTeam.id;
  }

  // Last resort: use first available team
  return user.teams[0].id;
};

/**
 * Get effective team ID for creating items, with proper fallbacks
 * Never returns the placeholder UUID '00000000-0000-0000-0000-000000000000'
 * 
 * @param {string} preferredTeamId - Preferred team ID (from URL or selection)
 * @param {Object} user - The user object from auth store
 * @returns {string|null} The effective team ID
 */
export const getEffectiveTeamId = (preferredTeamId, user) => {
  console.log('🔍 getEffectiveTeamId called with:', {
    preferredTeamId,
    userTeams: user?.teams?.map(t => ({ id: t.id, name: t.name, is_leadership: t.is_leadership_team }))
  });
  
  // Clean the preferred team ID
  const cleanId = (preferredTeamId === 'null' || preferredTeamId === 'undefined' || preferredTeamId === null) 
    ? null 
    : preferredTeamId;
    
  console.log('🧹 Cleaned ID:', cleanId);
    
  // If we have a valid preferred team ID (not null and not the placeholder), use it
  // This includes Leadership Team IDs - we should trust the URL parameter
  if (cleanId && cleanId !== LEADERSHIP_TEAM_ID) {
    console.log('📍 Have valid cleanId, checking if team exists for user');
    // Verify the team exists for the user
    const teamExists = user?.teams?.some(t => t.id === cleanId);
    if (teamExists) {
      const selectedTeam = user?.teams?.find(t => t.id === cleanId);
      console.log('✅ Team verified for user:', selectedTeam);
      return cleanId;
    } else {
      console.log('⚠️ Team ID not found in user teams, user teams are:', user?.teams);
    }
  } else {
    console.log('❌ No valid cleanId. cleanId:', cleanId, 'LEADERSHIP_TEAM_ID:', LEADERSHIP_TEAM_ID);
  }

  // Otherwise get the user's actual team
  console.log('⚠️ Falling back to getUserTeamId');
  const fallbackId = getUserTeamId(user);
  console.log('📍 Fallback team ID:', fallbackId);
  return fallbackId;
};