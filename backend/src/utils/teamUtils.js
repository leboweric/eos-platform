import db from '../config/database.js';

// Check if a team ID is the legacy zero UUID (should not be used)
export const isZeroUUID = (teamId) => {
  return teamId === '00000000-0000-0000-0000-000000000000';
};

// Get the leadership team ID for an organization
export const getLeadershipTeamId = async (organizationId) => {
  try {
    const result = await db.query(
      'SELECT id FROM teams WHERE organization_id = $1 AND is_leadership_team = true LIMIT 1',
      [organizationId]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error getting leadership team ID:', error);
    return null;
  }
};

// Check if a team is a leadership team
export const isLeadershipTeam = async (teamId) => {
  if (!teamId || isZeroUUID(teamId)) return false;
  try {
    const result = await db.query(
      'SELECT is_leadership_team FROM teams WHERE id = $1',
      [teamId]
    );
    return result.rows[0]?.is_leadership_team === true;
  } catch (error) {
    console.error('Error checking leadership team:', error);
    return false;
  }
};

// Get user's team context for Ninety.io model
export const getUserTeamContext = async (userId, organizationId) => {
  try {
    // First check if team_members table exists and has data
    const teamMembersCheck = await db.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'team_members'
      ) as table_exists
    `);
    
    if (teamMembersCheck.rows[0].table_exists) {
      // Try to get user's team from team_members
      const result = await db.query(`
        SELECT t.id, t.name, t.is_leadership_team
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.organization_id = $2
        LIMIT 1
      `, [userId, organizationId]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }
    
    // Fallback: Check if user is assigned to Leadership Team
    const leadershipResult = await db.query(`
      SELECT id, name, is_leadership_team
      FROM teams 
      WHERE organization_id = $1 AND is_leadership_team = true
      LIMIT 1
    `, [organizationId]);
    
    // For now, assume all users are on leadership team if no team_members data
    return leadershipResult.rows[0] || null;
    
  } catch (error) {
    console.error('Error getting user team context:', error);
    // Return leadership context as fallback to ensure data visibility
    try {
      const fallbackResult = await db.query(`
        SELECT id, name, is_leadership_team
        FROM teams 
        WHERE organization_id = $1 AND is_leadership_team = true
        LIMIT 1
      `, [organizationId]);
      return fallbackResult.rows[0] || null;
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return null;
    }
  }
};

// Check if a user is on a leadership team in a specific organization
export const isUserOnLeadershipTeam = async (userId, organizationId) => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1
          AND t.organization_id = $2
          AND t.is_leadership_team = true
      ) as is_on_leadership_team
    `;

    const result = await db.query(query, [userId, organizationId]);
    return result.rows[0].is_on_leadership_team;
  } catch (error) {
    console.error('Error checking leadership team membership:', error);
    return false;
  }
};

// Get all leadership teams for an organization
export const getLeadershipTeams = async (organizationId) => {
  try {
    const query = `
      SELECT id, name, description
      FROM teams
      WHERE organization_id = $1
        AND is_leadership_team = true
      ORDER BY name
    `;

    const result = await db.query(query, [organizationId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching leadership teams:', error);
    return [];
  }
};

// Check if content is from a leadership team
export const isContentFromLeadershipTeam = async (teamId) => {
  if (!teamId) return false;
  return await isLeadershipTeam(teamId);
};

// Apply visibility filter based on leadership team status and publication status
export const applyVisibilityFilter = async (userId, organizationId, items, itemType = 'generic') => {
  try {
    // Check if user is on leadership team
    const userOnLeadershipTeam = await isUserOnLeadershipTeam(userId, organizationId);
    
    // If user is on leadership team, they can see everything
    if (userOnLeadershipTeam) {
      return items;
    }
    
    // For non-leadership team users, filter based on publication status
    const filteredItems = [];
    
    for (const item of items) {
      // Check if item is from a leadership team
      const fromLeadershipTeam = item.team_id ? await isLeadershipTeam(item.team_id) : false;
      
      // If not from leadership team, include it
      if (!fromLeadershipTeam) {
        filteredItems.push(item);
        continue;
      }
      
      // If from leadership team, check if it's published to departments
      if (item.is_published_to_departments) {
        filteredItems.push(item);
      }
    }
    
    return filteredItems;
  } catch (error) {
    console.error('Error applying visibility filter:', error);
    // In case of error, return all items to maintain backward compatibility
    return items;
  }
};

// Publish content to departments
export const publishToDepartments = async (itemId, userId, tableName) => {
  try {
    const query = `
      UPDATE ${tableName}
      SET 
        is_published_to_departments = true,
        published_at = CURRENT_TIMESTAMP,
        published_by = $2
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [itemId, userId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error publishing to departments:', error);
    throw error;
  }
};

// Unpublish content from departments
export const unpublishFromDepartments = async (itemId, tableName) => {
  try {
    const query = `
      UPDATE ${tableName}
      SET 
        is_published_to_departments = false,
        published_at = NULL,
        published_by = NULL
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [itemId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error unpublishing from departments:', error);
    throw error;
  }
};

// Get all team IDs that a user belongs to
export const getUserTeamIds = async (userId, organizationId) => {
  try {
    const result = await db.query(
      `SELECT tm.team_id, t.name as team_name FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.organization_id = $2`,
      [userId, organizationId]
    );
    console.log(`🔍 getUserTeamIds for user ${userId}:`, result.rows.map(r => ({ id: r.team_id, name: r.team_name })));
    return result.rows.map(row => row.team_id);
  } catch (error) {
    console.error("Error getting user's team IDs:", error);
    return [];
  }
};

// Get user's team scope for mandatory data isolation
export const getUserTeamScope = async (userId, organizationId, tableAlias = 't', explicitTeamId = null, paramIndex = 1) => {
  // If an explicit team ID is provided, filter by that team
  if (explicitTeamId) {
    // Security check: Verify user is actually a member of this team
    const userTeamIds = await getUserTeamIds(userId, organizationId);
    if (!userTeamIds.includes(explicitTeamId)) {
      throw new Error('Access denied: You do not have permission to view this team');
    }
    
    // Filter by the requested team
    const query = `${tableAlias}.team_id = $${paramIndex}`;
    return { query, params: [explicitTeamId] };
  }

  // If no explicit team filter, get the list of teams the user is a member of
  const userTeamIds = await getUserTeamIds(userId, organizationId);

  // If the user is not a member of any teams, they can only see items
  // that are not assigned to any team (i.e., team_id IS NULL)
  if (userTeamIds.length === 0) {
    return { query: `${tableAlias}.team_id IS NULL`, params: [] };
  }

  // Otherwise, the user can see items assigned to any of their teams
  const query = `${tableAlias}.team_id = ANY($${paramIndex}::uuid[])`;
  return { query, params: [userTeamIds] };
};