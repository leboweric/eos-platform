import Papa from 'papaparse';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class NinetyImportService {
  /**
   * Parse CSV file buffer using PapaParse
   */
  static parseCSV(fileBuffer) {
    const csvString = fileBuffer.toString('utf-8');
    
    const parseResults = Papa.parse(csvString, {
      header: false, // We'll handle headers manually due to date columns
      skipEmptyLines: true,
      trimHeaders: false,
      transformHeader: (header) => header.trim()
    });

    if (parseResults.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResults.errors);
    }

    return parseResults;
  }

  /**
   * Transform Ninety.io data format to AXP format
   */
  static transformNinetyData(parseResults) {
    const data = parseResults.data;
    
    // First row contains headers
    const headers = data[0];
    
    // Extract date columns (everything after "Average" column)
    const averageIndex = headers.findIndex(h => h === 'Average');
    const dateColumns = headers.slice(averageIndex + 1);
    
    const metrics = [];
    const groups = new Map();
    
    // Process each data row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[3]) continue; // Title is in column 3
      
      const groupName = row[1] || 'Uncategorized';
      const status = row[2];
      const title = row[3];
      const description = row[4];
      const owner = row[5];
      const goalStr = row[6];
      const average = row[7];
      
      // Track groups
      if (!groups.has(groupName)) {
        groups.set(groupName, {
          name: groupName,
          description: `Imported from Ninety.io`,
          metrics: []
        });
      }
      
      // Parse goal
      const goalData = this.parseGoal(goalStr);
      
      // Parse scores for each date column
      const scores = [];
      for (let j = 0; j < dateColumns.length; j++) {
        const dateStr = dateColumns[j];
        const value = row[averageIndex + 1 + j];
        
        if (dateStr && value !== '' && value !== undefined) {
          const dateRange = this.parseDateRange(dateStr);
          scores.push({
            week_ending: dateRange.endDate,
            value: this.parseNumericValue(value),
            dateLabel: dateStr
          });
        }
      }
      
      const metric = {
        group_name: groupName,
        title,
        description: description || '',
        owner_name: owner,
        goal: goalData.value,
        goal_operator: goalData.operator,
        goal_direction: goalData.direction,
        format: goalData.isPercentage ? 'percentage' : 'number',
        cadence: 'weekly',
        import_source: 'ninety.io',
        external_id: `ninety_${Date.now()}_${i}`,
        scores,
        status,
        average: this.parseNumericValue(average)
      };
      
      metrics.push(metric);
      groups.get(groupName).metrics.push(metric);
    }
    
    return {
      metrics,
      groups: Array.from(groups.values()),
      dateColumns
    };
  }

  /**
   * Parse goal string like "> 0", "<= 10", ">= 50%"
   */
  static parseGoal(goalStr) {
    if (!goalStr) {
      return { operator: '>=', value: 0, direction: 'higher', isPercentage: false };
    }
    
    // Remove spaces and normalize
    const normalized = goalStr.trim();
    
    // Extract operator
    let operator = '>=';
    let remainingStr = normalized;
    
    if (normalized.startsWith('>=')) {
      operator = '>=';
      remainingStr = normalized.substring(2);
    } else if (normalized.startsWith('<=')) {
      operator = '<=';
      remainingStr = normalized.substring(2);
    } else if (normalized.startsWith('>')) {
      operator = '>';
      remainingStr = normalized.substring(1);
    } else if (normalized.startsWith('<')) {
      operator = '<';
      remainingStr = normalized.substring(1);
    } else if (normalized.startsWith('=')) {
      operator = '=';
      remainingStr = normalized.substring(1);
    }
    
    // Parse value and check for percentage
    remainingStr = remainingStr.trim();
    const isPercentage = remainingStr.endsWith('%');
    let valueStr = isPercentage ? remainingStr.slice(0, -1) : remainingStr;
    
    // Parse numeric value
    let value = parseFloat(valueStr) || 0;
    if (isPercentage) {
      value = value / 100; // Convert percentage to decimal
    }
    
    // Determine direction based on operator
    const direction = (operator === '<' || operator === '<=') ? 'lower' : 'higher';
    
    return {
      operator,
      value,
      direction,
      isPercentage
    };
  }

  /**
   * Parse date range string like "Oct 13 - Oct 19" to ISO dates
   */
  static parseDateRange(dateRangeStr) {
    if (!dateRangeStr) return { startDate: null, endDate: null };
    
    // Parse format: "Oct 13 - Oct 19" or "Dec 29 - Jan 4"
    const parts = dateRangeStr.split(' - ');
    if (parts.length !== 2) return { startDate: null, endDate: null };
    
    const currentYear = new Date().getFullYear();
    
    // Parse start date
    const startParts = parts[0].trim().split(' ');
    const startMonth = this.getMonthNumber(startParts[0]);
    const startDay = parseInt(startParts[1]);
    
    // Parse end date
    const endParts = parts[1].trim().split(' ');
    const endMonth = this.getMonthNumber(endParts[0]);
    const endDay = parseInt(endParts[1]);
    
    // Handle year boundary (e.g., Dec 29 - Jan 4)
    let startYear = currentYear;
    let endYear = currentYear;
    
    if (endMonth < startMonth) {
      // Crosses year boundary
      if (new Date().getMonth() < 6) {
        // We're in first half of year, so start was last year
        startYear = currentYear - 1;
      } else {
        // We're in second half of year, so end is next year
        endYear = currentYear + 1;
      }
    }
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Convert month name to number
   */
  static getMonthNumber(monthName) {
    const months = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };
    return months[monthName] || 1;
  }

  /**
   * Parse numeric value from string, handling percentages
   */
  static parseNumericValue(value) {
    if (!value || value === '') return null;
    
    const str = value.toString().replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    
    return isNaN(num) ? null : num;
  }

  /**
   * Match owner name to user in database
   */
  static async matchOwnerToUser(ownerName, organizationId, pool) {
    if (!ownerName) return null;
    
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
      [organizationId, ownerName]
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
      [organizationId, `%${ownerName}%`]
    );
    
    if (partialMatch.rows.length === 1) {
      return partialMatch.rows[0].id;
    }
    
    return null;
  }

  /**
   * Get or create scorecard group
   * DEDUPLICATION: Match by team_id + name (case-insensitive)
   */
  static async getOrCreateGroup(groupName, teamId, organizationId, client) {
    // Try to find existing group (case-insensitive)
    const existingGroup = await client.query(
      `SELECT id, name, sort_order, display_order 
       FROM scorecard_groups 
       WHERE organization_id = $1 
       AND team_id = $2 
       AND LOWER(name) = LOWER($3)
       AND deleted_at IS NULL`,
      [organizationId, teamId, groupName]
    );
    
    if (existingGroup.rows.length > 0) {
      // USE existing group_id for deduplication
      return existingGroup.rows[0].id;
    }
    
    // Get max sort_order for new group
    const maxOrderResult = await client.query(
      `SELECT COALESCE(MAX(sort_order), 0) as max_order 
       FROM scorecard_groups 
       WHERE organization_id = $1 
       AND team_id = $2
       AND deleted_at IS NULL`,
      [organizationId, teamId]
    );
    
    const newSortOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
    
    // Create new group with incremented sort_order
    const newGroup = await client.query(
      `INSERT INTO scorecard_groups (
         id, organization_id, team_id, name, description, 
         sort_order, display_order, is_expanded, type, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
       ) RETURNING id`,
      [
        uuidv4(),
        organizationId,
        teamId,
        groupName,
        `Imported from Ninety.io`,
        newSortOrder,
        newSortOrder, // Use same as sort_order
        true, // is_expanded
        'imported'
      ]
    );
    
    return newGroup.rows[0].id;
  }

  /**
   * Find existing metric by organization_id + team_id + name (case-insensitive)
   * DEDUPLICATION: Core matching logic for incremental imports
   */
  static async findExistingMetric(name, teamId, organizationId, client) {
    const result = await client.query(
      `SELECT id, name, goal, goal_operator, goal_direction, owner_id, description
       FROM scorecard_metrics 
       WHERE organization_id = $1 
       AND team_id = $2 
       AND LOWER(name) = LOWER($3)
       AND deleted_at IS NULL`,
      [organizationId, teamId, name]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Check if score already exists for metric + period
   * DEDUPLICATION: Prevent duplicate scores on re-import
   */
  static async scoreExists(metricId, periodStart, client) {
    const result = await client.query(
      `SELECT id FROM scorecard_scores 
       WHERE metric_id = $1 
       AND period_start = $2`,
      [metricId, periodStart]
    );
    
    return result.rows.length > 0;
  }
}

export default NinetyImportService;