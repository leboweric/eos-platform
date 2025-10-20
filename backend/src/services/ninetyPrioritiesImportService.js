import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

class NinetyPrioritiesImportService {
  /**
   * Parse Excel file buffer using XLSX
   */
  static parseExcel(fileBuffer) {
    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, {
      cellStyles: true,
      cellDates: true,
      defval: ''
    });

    // Get first sheet (assuming priorities data is on first sheet)
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log('📄 Parsing sheet:', sheetName);

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json(sheet, {
      blankrows: false,
      defval: ''
    });

    if (!data || data.length === 0) {
      throw new Error('Excel file is empty or has no data');
    }

    console.log('📊 Total rows in Excel:', data.length);

    return {
      data: data,
      errors: [] // XLSX doesn't provide parsing errors like PapaParse
    };
  }

  /**
   * Transform Ninety.io priorities export to AXP format
   */
  static transformNinetyPriorities(rows, teamId, organizationId, quarter, year) {
    console.log(`🔄 Transforming ${rows.length} rows from Ninety format`);
    
    // Log sample row to understand data types
    if (rows.length > 0) {
      console.log('📊 Sample row data types:', {
        dueDate: typeof rows[0]?.['Due Date'],
        dueDateValue: rows[0]?.['Due Date'],
        percentComplete: typeof rows[0]?.['% Complete'],
        percentValue: rows[0]?.['% Complete'],
        rock: typeof rows[0]?.['Rock'],
        owner: typeof rows[0]?.['Owner']
      });
    }

    const transformed = rows.map((row, index) => {
      try {
        // Helper function to parse Excel dates
        const parseExcelDate = (value) => {
          if (!value) return null;
          
          if (value instanceof Date) {
            // Already a Date object from Excel parser
            return value;
          } else if (typeof value === 'number') {
            // Excel serial date number - convert to JS Date
            // Excel dates are days since 1900-01-01 (with leap year bug accounted for)
            const excelEpoch = new Date(1900, 0, 1);
            return new Date(excelEpoch.getTime() + (value - 2) * 86400000);
          } else if (typeof value === 'string') {
            // String date - try to parse
            const trimmed = value.trim();
            if (!trimmed) return null;
            const parsed = new Date(trimmed);
            return isNaN(parsed.getTime()) ? null : parsed;
          }
          return null;
        };

        // Helper function to parse percentage
        const parsePercentage = (value) => {
          if (value === null || value === undefined || value === '') return 0;
          
          if (typeof value === 'number') {
            // If it's already a number, check if it's 0-1 or 0-100
            return value <= 1 ? Math.round(value * 100) : Math.round(value);
          } else if (typeof value === 'string') {
            // Remove % sign and parse
            const cleaned = value.trim().replace('%', '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : Math.round(parsed);
          }
          return 0;
        };

        // Helper function to safely trim strings
        const safeTrim = (value) => {
          if (!value) return '';
          return typeof value === 'string' ? value.trim() : String(value).trim();
        };

        // Parse due date
        const dueDate = parseExcelDate(row['Due Date']);

        // Parse completion percentage
        const percentComplete = parsePercentage(row['% Complete']);

        // Extract and clean text fields
        const title = safeTrim(row['Rock']);
        const ownerName = safeTrim(row['Owner']);
        
        // Validate required fields
        if (!title) {
          console.warn(`⚠️  Row ${index + 1}: Missing Rock title, skipping`);
          return null;
        }

        const priority = {
          title: title,
          description: '', // Ninety doesn't export descriptions
          owner_name: ownerName || null,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD
          completion_percentage: percentComplete,
          team_id: teamId,
          organization_id: organizationId,
          quarter: quarter,
          year: year,
          status: percentComplete === 100 ? 'completed' : 
                  percentComplete > 0 ? 'in_progress' : 'not_started',
          // Metadata for tracking import
          imported_from: 'ninety',
          import_date: new Date().toISOString(),
          original_row_number: index + 1
        };

        console.log(`✅ Row ${index + 1}: "${title}" - ${percentComplete}% complete`);
        return priority;

      } catch (error) {
        console.error(`❌ Error transforming row ${index + 1}:`, error.message);
        console.error('Row data:', row);
        return null;
      }
    });

    // Filter out null values (failed transformations)
    const validPriorities = transformed.filter(p => p !== null);
    
    console.log(`✅ Successfully transformed ${validPriorities.length} of ${rows.length} rows`);
    
    return validPriorities;
  }

  /**
   * Validate Ninety.io export format
   */
  static validateNinetyFormat(rows) {
    if (!rows || rows.length === 0) {
      return {
        valid: false,
        error: 'No data rows found in file'
      };
    }

    // Check for required Ninety columns
    const requiredColumns = ['Rock', 'Due Date', '% Complete', 'Owner'];
    const firstRow = rows[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `Missing required columns: ${missingColumns.join(', ')}. Expected columns: ${requiredColumns.join(', ')}`
      };
    }

    // Check if we have at least some data
    const rocksWithTitles = rows.filter(row => {
      const title = row['Rock'];
      return title && (typeof title === 'string' ? title.trim() : String(title).trim());
    });

    if (rocksWithTitles.length === 0) {
      return {
        valid: false,
        error: 'No valid Rock titles found in the file'
      };
    }

    return {
      valid: true,
      rowCount: rocksWithTitles.length
    };
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