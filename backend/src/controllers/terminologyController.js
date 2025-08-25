import db from '../config/database.js';

// Get terminology settings for an organization
const getTerminology = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // First check if terminology exists for this org
    let result = await db.query(
      'SELECT * FROM organization_terminology WHERE organization_id = $1',
      [orgId]
    );
    
    // If no terminology exists, create default entry
    if (result.rows.length === 0) {
      result = await db.query(
        'INSERT INTO organization_terminology (organization_id) VALUES ($1) RETURNING *',
        [orgId]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching terminology:', error);
    res.status(500).json({ error: 'Failed to fetch terminology settings' });
  }
};

// Update terminology settings for an organization
const updateTerminology = async (req, res) => {
  try {
    const { orgId } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = [
      'priorities_label',
      'priority_singular',
      'scorecard_label',
      'issues_label',
      'issue_singular',
      'todos_label',
      'todo_singular',
      'processes_label',
      'process_singular',
      'weekly_meeting_label',
      'quarterly_meeting_label',
      'long_term_vision_label',
      'annual_goals_label',
      'business_blueprint_label',
      'accountability_chart_label',
      'milestones_label',
      'problem_solving_process',
      'quarter_label',
      'year_label',
      'organization_label',
      'team_label',
      'department_label'
    ];
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(orgId);
    
    const query = `
      UPDATE organization_terminology 
      SET ${updateFields.join(', ')}
      WHERE organization_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      // Create new entry if it doesn't exist
      const insertResult = await db.query(
        'INSERT INTO organization_terminology (organization_id) VALUES ($1) RETURNING *',
        [orgId]
      );
      
      // Now update with the provided values
      const updateResult = await db.query(query, values);
      res.json(updateResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error updating terminology:', error);
    res.status(500).json({ error: 'Failed to update terminology settings' });
  }
};

// Reset terminology to defaults for an organization
const resetTerminology = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const result = await db.query(
      `UPDATE organization_terminology 
       SET priorities_label = DEFAULT,
           priority_singular = DEFAULT,
           scorecard_label = DEFAULT,
           issues_label = DEFAULT,
           issue_singular = DEFAULT,
           todos_label = DEFAULT,
           todo_singular = DEFAULT,
           weekly_meeting_label = DEFAULT,
           quarterly_meeting_label = DEFAULT,
           long_term_vision_label = DEFAULT,
           annual_goals_label = DEFAULT,
           business_blueprint_label = DEFAULT,
           problem_solving_process = DEFAULT,
           quarter_label = DEFAULT,
           year_label = DEFAULT,
           organization_label = DEFAULT,
           team_label = DEFAULT,
           department_label = DEFAULT
       WHERE organization_id = $1
       RETURNING *`,
      [orgId]
    );
    
    if (result.rows.length === 0) {
      // Create default entry if it doesn't exist
      const insertResult = await db.query(
        'INSERT INTO organization_terminology (organization_id) VALUES ($1) RETURNING *',
        [orgId]
      );
      res.json(insertResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error resetting terminology:', error);
    res.status(500).json({ error: 'Failed to reset terminology settings' });
  }
};

// Get preset terminology templates
const getTerminologyPresets = async (req, res) => {
  try {
    const presets = {
      eos: {
        name: 'EOS (Entrepreneurial Operating System)',
        priorities_label: 'Rocks',
        priority_singular: 'Rock',
        scorecard_label: 'Scorecard',
        issues_label: 'Issues',
        issue_singular: 'Issue',
        todos_label: 'To-Dos',
        todo_singular: 'To-Do',
        processes_label: 'Core Processes',
        process_singular: 'Core Process',
        weekly_meeting_label: 'Level 10 Meeting',
        quarterly_meeting_label: 'Quarterly Pulsing Meeting',
        long_term_vision_label: '3-Year Picture',
        annual_goals_label: '1-Year Plan',
        business_blueprint_label: 'V/TO',
        accountability_chart_label: 'Accountability Chart',
        milestones_label: 'Milestones',
        problem_solving_process: 'IDS (Identify, Discuss, Solve)'
      },
      okrs: {
        name: 'OKRs (Objectives & Key Results)',
        priorities_label: 'Objectives',
        priority_singular: 'Objective',
        scorecard_label: 'Key Results Dashboard',
        issues_label: 'Blockers',
        issue_singular: 'Blocker',
        todos_label: 'Action Items',
        todo_singular: 'Action Item',
        processes_label: 'Playbooks',
        process_singular: 'Playbook',
        weekly_meeting_label: 'Weekly Check-in',
        quarterly_meeting_label: 'OKR Planning Session',
        long_term_vision_label: 'Strategic Vision',
        annual_goals_label: 'Annual OKRs',
        business_blueprint_label: 'Strategy Document',
        accountability_chart_label: 'Organizational Chart',
        milestones_label: 'Key Results',
        problem_solving_process: 'Blocker Resolution'
      },
      scaling_up: {
        name: 'Scaling Up (Rockefeller Habits)',
        priorities_label: 'Priorities',
        priority_singular: 'Priority',
        scorecard_label: 'KPI Dashboard',
        issues_label: 'Issues',
        issue_singular: 'Issue',
        todos_label: 'Action Items',
        todo_singular: 'Action Item',
        processes_label: 'Process Maps',
        process_singular: 'Process Map',
        weekly_meeting_label: 'Weekly Meeting Rhythm',
        quarterly_meeting_label: 'Quarterly Planning Session',
        long_term_vision_label: 'BHAG (10-25 Years)',
        annual_goals_label: 'Annual Priorities',
        business_blueprint_label: 'One-Page Strategic Plan',
        accountability_chart_label: 'Functional Accountability Chart',
        milestones_label: 'Milestones',
        problem_solving_process: 'Issue Processing'
      },
      fourDx: {
        name: '4 Disciplines of Execution',
        priorities_label: 'WIGs (Wildly Important Goals)',
        priority_singular: 'WIG',
        scorecard_label: 'Scoreboard',
        issues_label: 'Obstacles',
        issue_singular: 'Obstacle',
        todos_label: 'Commitments',
        todo_singular: 'Commitment',
        processes_label: 'Standard Work',
        process_singular: 'Standard Work',
        weekly_meeting_label: 'WIG Session',
        quarterly_meeting_label: 'WIG Planning Session',
        long_term_vision_label: 'Strategic Goals',
        annual_goals_label: 'Annual WIGs',
        business_blueprint_label: 'Execution Plan',
        accountability_chart_label: 'Accountability Chart',
        milestones_label: 'Lead Measures',
        problem_solving_process: 'Obstacle Clearing'
      },
      custom: {
        name: 'Custom Terminology',
        priorities_label: 'Quarterly Priorities',
        priority_singular: 'Priority',
        scorecard_label: 'Metrics Dashboard',
        issues_label: 'Issues',
        issue_singular: 'Issue',
        todos_label: 'Tasks',
        todo_singular: 'Task',
        weekly_meeting_label: 'Weekly Team Meeting',
        quarterly_meeting_label: 'Quarterly Planning',
        long_term_vision_label: 'Long-term Vision',
        annual_goals_label: 'Annual Goals',
        business_blueprint_label: 'Strategic Plan',
        problem_solving_process: 'Problem Solving'
      }
    };
    
    res.json(presets);
  } catch (error) {
    console.error('Error fetching terminology presets:', error);
    res.status(500).json({ error: 'Failed to fetch terminology presets' });
  }
};

// Apply a preset terminology template
const applyTerminologyPreset = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { preset } = req.body;
    
    // Get the preset values
    const presets = {
      eos: {
        priorities_label: 'Rocks',
        priority_singular: 'Rock',
        scorecard_label: 'Scorecard',
        issues_label: 'Issues',
        issue_singular: 'Issue',
        todos_label: 'To-Dos',
        todo_singular: 'To-Do',
        processes_label: 'Core Processes',
        process_singular: 'Core Process',
        weekly_meeting_label: 'Level 10 Meeting',
        quarterly_meeting_label: 'Quarterly Pulsing Meeting',
        long_term_vision_label: '3-Year Picture',
        annual_goals_label: '1-Year Plan',
        business_blueprint_label: 'V/TO',
        accountability_chart_label: 'Accountability Chart',
        milestones_label: 'Milestones',
        problem_solving_process: 'IDS (Identify, Discuss, Solve)'
      },
      okrs: {
        priorities_label: 'Objectives',
        priority_singular: 'Objective',
        scorecard_label: 'Key Results Dashboard',
        issues_label: 'Blockers',
        issue_singular: 'Blocker',
        todos_label: 'Action Items',
        todo_singular: 'Action Item',
        weekly_meeting_label: 'Weekly Check-in',
        quarterly_meeting_label: 'OKR Planning Session',
        long_term_vision_label: 'Strategic Vision',
        annual_goals_label: 'Annual OKRs',
        business_blueprint_label: 'Strategy Document',
        accountability_chart_label: 'Organizational Chart',
        milestones_label: 'Key Results',
        problem_solving_process: 'Blocker Resolution'
      },
      scaling_up: {
        priorities_label: 'Priorities',
        priority_singular: 'Priority',
        scorecard_label: 'KPI Dashboard',
        issues_label: 'Issues',
        issue_singular: 'Issue',
        todos_label: 'Action Items',
        todo_singular: 'Action Item',
        processes_label: 'Process Maps',
        process_singular: 'Process Map',
        weekly_meeting_label: 'Weekly Meeting Rhythm',
        quarterly_meeting_label: 'Quarterly Planning Session',
        long_term_vision_label: 'BHAG (10-25 Years)',
        annual_goals_label: 'Annual Priorities',
        business_blueprint_label: 'One-Page Strategic Plan',
        accountability_chart_label: 'Functional Accountability Chart',
        milestones_label: 'Milestones',
        problem_solving_process: 'Issue Processing'
      },
      fourDx: {
        priorities_label: 'WIGs (Wildly Important Goals)',
        priority_singular: 'WIG',
        scorecard_label: 'Scoreboard',
        issues_label: 'Obstacles',
        issue_singular: 'Obstacle',
        todos_label: 'Commitments',
        todo_singular: 'Commitment',
        processes_label: 'Standard Work',
        process_singular: 'Standard Work',
        weekly_meeting_label: 'WIG Session',
        quarterly_meeting_label: 'WIG Planning Session',
        long_term_vision_label: 'Strategic Goals',
        annual_goals_label: 'Annual WIGs',
        business_blueprint_label: 'Execution Plan',
        accountability_chart_label: 'Accountability Chart',
        milestones_label: 'Lead Measures',
        problem_solving_process: 'Obstacle Clearing'
      },
      custom: {
        priorities_label: 'Quarterly Priorities',
        priority_singular: 'Priority',
        scorecard_label: 'Metrics Dashboard',
        issues_label: 'Issues',
        issue_singular: 'Issue',
        todos_label: 'Tasks',
        todo_singular: 'Task',
        processes_label: 'Processes',
        process_singular: 'Process',
        weekly_meeting_label: 'Weekly Team Meeting',
        quarterly_meeting_label: 'Quarterly Planning',
        long_term_vision_label: 'Long-term Vision',
        annual_goals_label: 'Annual Goals',
        business_blueprint_label: 'Strategic Plan',
        problem_solving_process: 'Problem Solving'
      }
    };
    
    const presetValues = presets[preset];
    if (!presetValues) {
      return res.status(400).json({ error: 'Invalid preset' });
    }
    
    // Check if terminology exists
    const existing = await db.query(
      'SELECT id FROM organization_terminology WHERE organization_id = $1',
      [orgId]
    );
    
    let result;
    if (existing.rows.length === 0) {
      // Insert new with preset values
      const fields = Object.keys(presetValues);
      const values = Object.values(presetValues);
      values.unshift(orgId); // Add org_id at the beginning
      
      const placeholders = fields.map((_, i) => `$${i + 2}`).join(', ');
      
      result = await db.query(
        `INSERT INTO organization_terminology (organization_id, ${fields.join(', ')}) 
         VALUES ($1, ${placeholders}) 
         RETURNING *`,
        values
      );
    } else {
      // Update existing with preset values
      const updateFields = Object.keys(presetValues).map((field, i) => `${field} = $${i + 1}`).join(', ');
      const values = Object.values(presetValues);
      values.push(orgId);
      
      result = await db.query(
        `UPDATE organization_terminology 
         SET ${updateFields}
         WHERE organization_id = $${values.length}
         RETURNING *`,
        values
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error applying terminology preset:', error);
    res.status(500).json({ error: 'Failed to apply terminology preset' });
  }
};

export default {
  getTerminology,
  updateTerminology,
  resetTerminology,
  getTerminologyPresets,
  applyTerminologyPreset
};