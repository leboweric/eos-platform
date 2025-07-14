import db from '../config/database.js';

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

// Check if a team is a leadership team
export const isLeadershipTeam = async (teamId) => {
  try {
    const query = `
      SELECT is_leadership_team
      FROM teams
      WHERE id = $1
    `;

    const result = await db.query(query, [teamId]);
    return result.rows.length > 0 && result.rows[0].is_leadership_team;
  } catch (error) {
    console.error('Error checking if team is leadership team:', error);
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