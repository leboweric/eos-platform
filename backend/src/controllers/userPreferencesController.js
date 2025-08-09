import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Get user preferences
export const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Return default preferences if none exist
      return res.json({
        success: true,
        data: {
          scorecard_rtl: false,
          scorecard_show_total: true,
          default_team_id: null,
          default_department_id: null,
          ui_preferences: {}
        }
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences'
    });
  }
};

// Update user preferences
export const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      scorecard_rtl,
      scorecard_show_total,
      default_team_id,
      default_department_id,
      ui_preferences
    } = req.body;
    
    // Check if preferences exist
    const existing = await query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    
    let result;
    if (existing.rows.length === 0) {
      // Create new preferences
      result = await query(
        `INSERT INTO user_preferences 
         (id, user_id, scorecard_rtl, scorecard_show_total, default_team_id, default_department_id, ui_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          uuidv4(),
          userId,
          scorecard_rtl ?? false,
          scorecard_show_total ?? true,
          default_team_id,
          default_department_id,
          ui_preferences || {}
        ]
      );
    } else {
      // Update existing preferences
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (scorecard_rtl !== undefined) {
        updates.push(`scorecard_rtl = $${paramCount++}`);
        values.push(scorecard_rtl);
      }
      if (scorecard_show_total !== undefined) {
        updates.push(`scorecard_show_total = $${paramCount++}`);
        values.push(scorecard_show_total);
      }
      if (default_team_id !== undefined) {
        updates.push(`default_team_id = $${paramCount++}`);
        values.push(default_team_id);
      }
      if (default_department_id !== undefined) {
        updates.push(`default_department_id = $${paramCount++}`);
        values.push(default_department_id);
      }
      if (ui_preferences !== undefined) {
        updates.push(`ui_preferences = $${paramCount++}`);
        values.push(ui_preferences);
      }
      
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(userId);
        
        result = await query(
          `UPDATE user_preferences 
           SET ${updates.join(', ')}
           WHERE user_id = $${paramCount}
           RETURNING *`,
          values
        );
      } else {
        result = existing;
      }
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
};

// Get UI state
export const getUIState = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stateKey } = req.params;
    
    // Clean up expired states
    await query(
      'DELETE FROM user_ui_state WHERE user_id = $1 AND expires_at < NOW()',
      [userId]
    );
    
    const result = await query(
      `SELECT state_value FROM user_ui_state 
       WHERE user_id = $1 AND state_key = $2 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, stateKey]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0].state_value
    });
  } catch (error) {
    console.error('Error fetching UI state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch UI state'
    });
  }
};

// Update UI state
export const updateUIState = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stateKey } = req.params;
    const { stateValue, expiresIn } = req.body;
    
    let expiresAt = null;
    if (expiresIn) {
      // expiresIn is in seconds
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }
    
    const result = await query(
      `INSERT INTO user_ui_state (id, user_id, state_key, state_value, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, state_key)
       DO UPDATE SET 
         state_value = EXCLUDED.state_value,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING *`,
      [uuidv4(), userId, stateKey, stateValue, expiresAt]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating UI state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update UI state'
    });
  }
};

// Delete UI state
export const deleteUIState = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stateKey } = req.params;
    
    await query(
      'DELETE FROM user_ui_state WHERE user_id = $1 AND state_key = $2',
      [userId, stateKey]
    );
    
    res.json({
      success: true,
      message: 'UI state deleted'
    });
  } catch (error) {
    console.error('Error deleting UI state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete UI state'
    });
  }
};

export default {
  getUserPreferences,
  updateUserPreferences,
  getUIState,
  updateUIState,
  deleteUIState
};