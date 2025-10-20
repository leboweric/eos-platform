import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

class NinetyPrioritiesImportService {
  /**
   * Parse CSV file buffer using PapaParse
   */
  static parseCSV(fileBuffer) {
    const csvString = fileBuffer.toString('utf-8');
    
    const parseResults = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResults.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResults.errors);
    }

    return parseResults;
  }

  /**
   * Transform Ninety.io priorities data format to AXP format
   */
  static transformNinetyPriorities(parseResults) {
    const data = parseResults.data;
    console.log('Raw CSV data rows:', data.length);
    
    const priorities = [];
    const assignees = new Set();
    
    // Process each data row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows or rows without required fields
      if (!row.Title || row.Title.trim() === '') continue;
      
      const title = row.Title?.trim();
      const description = row.Description?.trim() || '';
      const assignee = row.Assignee?.trim();
      const dueDate = row['Due Date']?.trim();
      const status = row.Status?.trim() || 'Not Started';
      const priority = row.Priority?.trim() || 'Medium';
      const company = row.Company?.trim() === 'Yes' || row.Company?.trim() === 'Company';
      
      // Track assignees for mapping
      if (assignee) {
        assignees.add(assignee);
      }
      
      // Parse milestones (if any - for future enhancement)
      const milestones = this.parseMilestones(row);
      
      const priorityData = {
        title,
        description,
        assignee_name: assignee,
        due_date: this.parseDate(dueDate),
        status: this.mapStatus(status),
        priority_level: this.mapPriority(priority),
        is_company: company,
        milestones,
        import_source: 'ninety.io',
        external_id: `ninety_priority_${Date.now()}_${i}`
      };
      
      priorities.push(priorityData);
      console.log(`Priority "${title}" parsed with ${milestones.length} milestones`);
    }
    
    console.log(`Transformed ${priorities.length} priorities with ${assignees.size} unique assignees`);
    
    return {
      priorities,
      assignees: Array.from(assignees)
    };
  }

  /**
   * Parse milestones from additional columns or description
   */
  static parseMilestones(row) {
    const milestones = [];
    
    // Look for milestone columns (Milestone 1, Milestone 2, etc.)
    for (let i = 1; i <= 5; i++) {
      const milestoneTitle = row[`Milestone ${i}`]?.trim();
      const milestoneDate = row[`Milestone ${i} Date`]?.trim();
      
      if (milestoneTitle) {
        milestones.push({
          title: milestoneTitle,
          due_date: this.parseDate(milestoneDate),
          completed: false,
          completed_at: null
        });
      }
    }
    
    return milestones;
  }

  /**
   * Parse date string to ISO format
   */
  static parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Handle common date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
    } catch (error) {
      console.warn(`Failed to parse date: ${dateStr}`);
      return null;
    }
  }

  /**
   * Map Ninety.io status to AXP status
   */
  static mapStatus(status) {
    const statusMap = {
      'Not Started': 'not_started',
      'In Progress': 'in_progress',
      'On Track': 'on_track',
      'At Risk': 'at_risk',
      'Off Track': 'off_track',
      'Complete': 'completed',
      'Completed': 'completed',
      'Done': 'completed'
    };
    
    return statusMap[status] || 'not_started';
  }

  /**
   * Map Ninety.io priority to AXP priority
   */
  static mapPriority(priority) {
    const priorityMap = {
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Critical': 'critical',
      'Urgent': 'critical'
    };
    
    return priorityMap[priority] || 'medium';
  }

  /**
   * Match assignee name to user in database
   */
  static async matchAssigneeToUser(assigneeName, organizationId, pool) {
    if (!assigneeName) return null;
    
    // Try exact match first
    const exactMatch = await pool.query(
      `SELECT id, first_name, last_name, email 
       FROM users 
       WHERE organization_id = $1 
       AND (
         LOWER(CONCAT(first_name, ' ', last_name)) = LOWER($2)
         OR LOWER(first_name) = LOWER($2)
         OR LOWER(last_name) = LOWER($2)
         OR LOWER(email) = LOWER($2)
       )`,
      [organizationId, assigneeName]
    );
    
    if (exactMatch.rows.length > 0) {
      return exactMatch.rows[0].id;
    }
    
    // Try partial match
    const partialMatch = await pool.query(
      `SELECT id, first_name, last_name, email 
       FROM users 
       WHERE organization_id = $1 
       AND (
         LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($2)
         OR LOWER(email) LIKE LOWER($2)
       )`,
      [organizationId, `%${assigneeName}%`]
    );
    
    if (partialMatch.rows.length === 1) {
      return partialMatch.rows[0].id;
    }
    
    return null;
  }

  /**
   * Find existing priority by organization_id + team_id + title (case-insensitive)
   */
  static async findExistingPriority(title, teamId, organizationId, client) {
    const result = await client.query(
      `SELECT id, title, status, assignee, due_date, description
       FROM quarterly_priorities 
       WHERE organization_id = $1 
       AND team_id = $2 
       AND TRIM(LOWER(title)) = TRIM(LOWER($3))
       AND deleted_at IS NULL`,
      [organizationId, teamId, title]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get current quarter and year
   */
  static getCurrentQuarter() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();
    
    return {
      quarter: `Q${quarter}`,
      year: year.toString()
    };
  }

  /**
   * Create milestones for a priority
   */
  static async createMilestones(priorityId, milestones, client) {
    const createdMilestones = [];
    
    for (const milestone of milestones) {
      const result = await client.query(
        `INSERT INTO priority_milestones (
          id, priority_id, title, due_date, completed, completed_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING id`,
        [
          uuidv4(),
          priorityId,
          milestone.title,
          milestone.due_date,
          milestone.completed,
          milestone.completed_at
        ]
      );
      
      createdMilestones.push(result.rows[0].id);
    }
    
    return createdMilestones;
  }

  /**
   * Delete existing milestones for a priority (for update operations)
   */
  static async deleteMilestones(priorityId, client) {
    await client.query(
      `DELETE FROM priority_milestones WHERE priority_id = $1`,
      [priorityId]
    );
  }
}

export default NinetyPrioritiesImportService;