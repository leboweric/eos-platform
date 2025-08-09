import pool from '../config/database.js';

const completionTrackingController = {
  // Get all completion states for an organization's VTO
  async getCompletionStates(req, res) {
    const { orgId } = req.params;
    
    try {
      // Get the organization's current VTO
      const vtoResult = await pool.query(
        'SELECT id FROM vtos WHERE organization_id = $1 AND is_active = true',
        [orgId]
      );
      
      if (vtoResult.rows.length === 0) {
        return res.json({ 
          threeYearCompletions: {}, 
          oneYearCompletions: {} 
        });
      }
      
      const vtoId = vtoResult.rows[0].id;
      
      // Get 3-year picture completions
      const threeYearResult = await pool.query(`
        SELECT tc.item_index, tc.is_completed
        FROM three_year_completions tc
        JOIN three_year_pictures tp ON tc.three_year_picture_id = tp.id
        WHERE tp.vto_id = $1
      `, [vtoId]);
      
      // Get 1-year plan completions
      const oneYearResult = await pool.query(`
        SELECT oc.goal_index, oc.is_completed
        FROM one_year_goal_completions oc
        JOIN one_year_plans op ON oc.one_year_plan_id = op.id
        WHERE op.vto_id = $1
      `, [vtoId]);
      
      // Convert to objects keyed by index
      const threeYearCompletions = {};
      threeYearResult.rows.forEach(row => {
        threeYearCompletions[row.item_index] = row.is_completed;
      });
      
      const oneYearCompletions = {};
      oneYearResult.rows.forEach(row => {
        oneYearCompletions[row.goal_index] = row.is_completed;
      });
      
      res.json({
        threeYearCompletions,
        oneYearCompletions
      });
    } catch (error) {
      console.error('Error fetching completion states:', error);
      res.status(500).json({ error: 'Failed to fetch completion states' });
    }
  },
  
  // Toggle 3-year picture item completion
  async toggleThreeYearItem(req, res) {
    const { orgId, itemIndex } = req.params;
    const userId = req.user.id;
    
    try {
      // Get the 3-year picture ID
      const pictureResult = await pool.query(`
        SELECT tp.id 
        FROM three_year_pictures tp
        JOIN vtos v ON tp.vto_id = v.id
        WHERE v.organization_id = $1 AND v.is_active = true
      `, [orgId]);
      
      if (pictureResult.rows.length === 0) {
        return res.status(404).json({ error: 'Three year picture not found' });
      }
      
      const pictureId = pictureResult.rows[0].id;
      
      // Toggle the completion state
      const result = await pool.query(`
        INSERT INTO three_year_completions (three_year_picture_id, item_index, is_completed, completed_by, completed_at)
        VALUES ($1, $2, true, $3, NOW())
        ON CONFLICT (three_year_picture_id, item_index)
        DO UPDATE SET 
          is_completed = NOT three_year_completions.is_completed,
          completed_by = $3,
          completed_at = CASE 
            WHEN NOT three_year_completions.is_completed THEN NOW()
            ELSE NULL
          END,
          updated_at = NOW()
        RETURNING is_completed
      `, [pictureId, itemIndex, userId]);
      
      res.json({ 
        itemIndex: parseInt(itemIndex), 
        isCompleted: result.rows[0].is_completed 
      });
    } catch (error) {
      console.error('Error toggling three year item:', error);
      res.status(500).json({ error: 'Failed to toggle item' });
    }
  },
  
  // Toggle 1-year plan goal completion
  async toggleOneYearGoal(req, res) {
    const { orgId, goalIndex } = req.params;
    const userId = req.user.id;
    
    try {
      // Get the 1-year plan ID
      const planResult = await pool.query(`
        SELECT op.id 
        FROM one_year_plans op
        JOIN vtos v ON op.vto_id = v.id
        WHERE v.organization_id = $1 AND v.is_active = true
      `, [orgId]);
      
      if (planResult.rows.length === 0) {
        return res.status(404).json({ error: 'One year plan not found' });
      }
      
      const planId = planResult.rows[0].id;
      
      // Toggle the completion state
      const result = await pool.query(`
        INSERT INTO one_year_goal_completions (one_year_plan_id, goal_index, is_completed, completed_by, completed_at)
        VALUES ($1, $2, true, $3, NOW())
        ON CONFLICT (one_year_plan_id, goal_index)
        DO UPDATE SET 
          is_completed = NOT one_year_goal_completions.is_completed,
          completed_by = $3,
          completed_at = CASE 
            WHEN NOT one_year_goal_completions.is_completed THEN NOW()
            ELSE NULL
          END,
          updated_at = NOW()
        RETURNING is_completed
      `, [planId, goalIndex, userId]);
      
      res.json({ 
        goalIndex: parseInt(goalIndex), 
        isCompleted: result.rows[0].is_completed 
      });
    } catch (error) {
      console.error('Error toggling one year goal:', error);
      res.status(500).json({ error: 'Failed to toggle goal' });
    }
  }
};

export default completionTrackingController;