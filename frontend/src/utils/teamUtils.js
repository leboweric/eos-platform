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
 * Priority (important for dual-team users):
 * 1. Leadership team if the user is on it — avoids routing Leadership work to a department
 * 2. First non-leadership team (actual department)
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

  // Prefer leadership when dual-membered so fallbacks never silently pick Delivery/Finance
  const leadershipTeam = user.teams.find(team => team.is_leadership_team);
  if (leadershipTeam) {
    return leadershipTeam.id;
  }

  const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
  if (nonLeadershipTeam) {
    return nonLeadershipTeam.id;
  }

  return user.teams[0].id;
};

/**
 * Use the explicit team context (meeting URL, selected department) without
 * falling back to the user's default team. Critical for cross-team transfers.
 */
export function getContextTeamId(preferredTeamId) {
  if (!preferredTeamId || preferredTeamId === 'null' || preferredTeamId === 'undefined') {
    return null;
  }
  if (preferredTeamId === LEADERSHIP_TEAM_ID) {
    return null;
  }
  return preferredTeamId;
}

/**
 * Get effective team ID for creating/fetching items, with proper fallbacks.
 * Never returns the placeholder UUID '00000000-0000-0000-0000-000000000000'.
 *
 * Explicit preferred team IDs (meeting URL / department selector) always win.
 * Do NOT remap to another team the user also belongs to — that caused Leadership
 * L10 issues/todos to land on Delivery for dual-team users.
 *
 * @param {string} preferredTeamId - Preferred team ID (from URL or selection)
 * @param {Object} user - The user object from auth store
 * @param {boolean} allowFallback - Whether to fall back when no preferred ID (default: true)
 * @returns {string|null} The effective team ID
 */
export const getEffectiveTeamId = (preferredTeamId, user, allowFallback = true) => {
  const cleanId = (preferredTeamId === 'null' || preferredTeamId === 'undefined' || preferredTeamId === null)
    ? null
    : preferredTeamId;

  // Trust explicit team context (URL / department selector). Never rewrite to Delivery.
  if (cleanId && cleanId !== LEADERSHIP_TEAM_ID) {
    return cleanId;
  }

  if (allowFallback) {
    return getUserTeamId(user);
  }

  return null;
};
