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
   * @param {Object} parseResults - Parsed CSV data
   * @param {string} cadence - 'weekly' or 'monthly'
   */
  static transformNinetyData(parseResults, cadence = 'weekly') {
    const data = parseResults.data;
    
    // First row contains headers
    const headers = data[0];
    
    // Extract date columns (everything after "Average" column)
    const averageIndex = headers.findIndex(h => h === 'Average');
    const dateColumns = headers.slice(averageIndex + 1);
    
    console.log(`Using cadence: ${cadence}`);
    console.log('Found date columns:', dateColumns.length, dateColumns);
    
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
      // const average = row[7]; // REMOVED - averages calculated dynamically on frontend
      
      // Track groups
      if (!groups.has(groupName)) {
        groups.set(groupName, {
          name: groupName,
          description: `Imported from Ninety.io`,
          metrics: []
        });
      }
      
      // Parse goal - but also preserve the original string
      const goalData = this.parseGoal(goalStr);
      
      // Parse scores for each date column
      const scores = [];
      for (let j = 0; j < dateColumns.length; j++) {
        const dateStr = dateColumns[j];
        const value = row[averageIndex + 1 + j];
        
        if (dateStr && value !== '' && value !== undefined && value !== null) {
          // CHOOSE PARSER BASED ON CADENCE
          const dateRange = cadence === "monthly" 
            ? this.parseMonthColumn(dateStr)
            : this.parseDateRange(dateStr);
          
          const parsedValue = this.parseNumericValue(value);
          
          if (parsedValue !== null && dateRange.endDate) {
            scores.push({
              week_ending: dateRange.endDate,
              value: parsedValue,
              dateLabel: dateStr
            });
            console.log(`  Score for ${dateStr}: ${value} → ${parsedValue}`);
          }
        }
      }
      
      console.log(`Metric "${title}" has ${scores.length} scores`);
      
      const metric = {
        name: title,  // Map CSV 'Title' to DB 'name' column
        description: description || '',
        owner_name: owner,
        goal: goalStr?.trim() || null,  // PRESERVE the original goal string with operators and currency
        goal_operator: goalData.operator,
        goal_direction: goalData.direction,
        format: goalData.hasCurrency ? 'currency' : goalData.isPercentage ? 'percentage' : 'number',
        cadence: cadence, // USE THE PROVIDED CADENCE
        import_source: 'ninety.io',
        external_id: `ninety_${Date.now()}_${i}`,
        scores
        // Note: Removed 'average' - should be calculated dynamically, not imported
      };
      
      metrics.push(metric);
      groups.get(groupName).metrics.push(metric);
    }
    
    return {
      metrics,
      groups: Array.from(groups.values()),
      dateColumns,
      cadence // RETURN THE CADENCE
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
    
    // Parse value and check for percentage or currency
    remainingStr = remainingStr.trim();
    const isPercentage = remainingStr.endsWith('%');
    let valueStr = isPercentage ? remainingStr.slice(0, -1) : remainingStr;
    
    // Remove currency symbols for parsing
    const hasCurrency = valueStr.includes('$');
    valueStr = valueStr.replace(/[$,]/g, ''); // Remove $ and commas
    
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
      isPercentage,
      hasCurrency
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
    
    // Use current year as the base year for imports
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
      // Crosses year boundary - end date is in next year
      endYear = currentYear + 1;
    }
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    // IMPORTANT: Scorecard uses Monday as week-ending date
    // CSV ranges end on Sunday (e.g., "Oct 06 - Oct 12" ends on Sunday Oct 12)
    // Add 1 day to get Monday as the week-ending date for scorecard storage
    const weekEndingDate = new Date(endDate);
    weekEndingDate.setDate(weekEndingDate.getDate() + 1);
    
    console.log(`  Date range: "${dateRangeStr}" → Sunday ${endDate.toISOString().split('T')[0]} → Monday ${weekEndingDate.toISOString().split('T')[0]}`);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: weekEndingDate.toISOString().split('T')[0]  // Return Monday, not Sunday
    };
  }

  /**
   * Parse month-only column headers like "November" to ISO dates
   */
  static parseMonthColumn(monthStr) {
    if (!monthStr) return { startDate: null, endDate: null };
    
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    const monthIndex = monthNames.indexOf(monthStr.trim());
    if (monthIndex === -1) return { startDate: null, endDate: null };
    
    // Use current year as base
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // If the month is in the future, assume it's from last year
    let year = currentYear;
    if (monthIndex > currentMonth) {
      year = currentYear - 1;
    }
    
    // Month starts on day 1
    const startDate = new Date(year, monthIndex, 1);
    
    // Month ends on the last day of the month
    const endDate = new Date(year, monthIndex + 1, 0); // Day 0 = last day of previous month
    
    return { startDate, endDate };
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
    console.log(`   🔍 DB QUERY: Searching for metric`);
    console.log(`      - Name: "${name}" (length: ${name.length})`);
    console.log(`      - Team ID: ${teamId}`);
    console.log(`      - Org ID: ${organizationId}`);
    
    const result = await client.query(
      `SELECT id, name, goal, comparison_operator, owner, description, import_source
       FROM scorecard_metrics 
       WHERE organization_id = $1 
       AND team_id = $2 
       AND TRIM(LOWER(name)) = TRIM(LOWER($3))
       AND deleted_at IS NULL`,
      [organizationId, teamId, name]
    );
    
    console.log(`   📊 QUERY RESULT: Found ${result.rows.length} matches`);
    if (result.rows.length > 0) {
      console.log(`      - Existing: "${result.rows[0].name}" (ID: ${result.rows[0].id})`);
      console.log(`      - Import Source: ${result.rows[0].import_source}`);
    }
    
    return result.rows[0] || null;
  }

  /**
   * Check if score already exists for metric + period
   * DEDUPLICATION: Prevent duplicate scores on re-import
   */
  static async scoreExists(metricId, weekDate, client) {
    const result = await client.query(
      `SELECT id FROM scorecard_scores 
       WHERE metric_id = $1 
       AND week_date = $2`,
      [metricId, weekDate]
    );
    
    return result.rows.length > 0;
  }
}

export default NinetyImportService;