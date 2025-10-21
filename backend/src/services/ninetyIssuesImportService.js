import XLSX from 'xlsx';
import db from '../config/database.js';

/**
 * Helper: Safely trim values (handles Date objects and numbers)
 */
function safeTrim(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

/**
 * Helper: Parse Excel dates
 */
function parseExcelDate(value) {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value;
  } else if (typeof value === 'number') {
    // Excel serial date number
    const excelEpoch = new Date(1900, 0, 1);
    return new Date(excelEpoch.getTime() + (value - 2) * 86400000);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Map Ninety.io status based on Completed On and Archived Date
 * Database allows: 'open', 'in_discussion', 'solved', 'archived'
 */
function mapNinetyStatus(row) {
  // If explicitly archived
  if (row['Archived Date']) {
    return 'archived';
  }
  
  // If completed
  if (row['Completed On']) {
    return 'solved';
  }
  
  // Default to open (could be in discussion, but we don't have that data)
  return 'open';
}

/**
 * Map Ninety.io priority to AXP priority
 */
function mapPriority(priority) {
  if (!priority) return 'medium';
  
  const priorityLower = priority.toLowerCase();
  const priorityMap = {
    'low': 'low',
    'medium': 'medium', 
    'high': 'high',
    'critical': 'critical',
    'urgent': 'critical'
  };
  
  return priorityMap[priorityLower] || 'medium';
}

class NinetyIssuesImportService {
  /**
   * Parse Ninety.io Issues Excel export
   * Expects two sheets: one for Short Term and one for Long Term
   */
  static parseExcel(fileBuffer) {
    try {
      const workbook = XLSX.read(fileBuffer, {
        cellStyles: true,
        cellDates: true,
        defval: ''
      });
      
      console.log('📄 Available sheets:', workbook.SheetNames);
      
      // Find the sheets - they might be named various things
      const shortTermSheetNames = ['Short Term', 'Short-Term', 'ShortTerm', 'short term'];
      const longTermSheetNames = ['Long Term', 'Long-Term', 'LongTerm', 'long term'];
      
      let shortTermSheet = null;
      let longTermSheet = null;
      let shortTermSheetName = null;
      let longTermSheetName = null;
      
      // Find Short Term sheet
      for (const name of shortTermSheetNames) {
        if (workbook.Sheets[name]) {
          shortTermSheet = workbook.Sheets[name];
          shortTermSheetName = name;
          console.log(`✅ Found Short Term sheet: "${name}"`);
          break;
        }
      }
      
      // Find Long Term sheet
      for (const name of longTermSheetNames) {
        if (workbook.Sheets[name]) {
          longTermSheet = workbook.Sheets[name];
          longTermSheetName = name;
          console.log(`✅ Found Long Term sheet: "${name}"`);
          break;
        }
      }
      
      // If not found by name, try by index (Sheet1 = Short, Sheet2 = Long)
      if (!shortTermSheet && workbook.SheetNames.length >= 2) {
        console.log('⚠️ Using sheets by index instead of name');
        shortTermSheet = workbook.Sheets[workbook.SheetNames[0]];
        longTermSheet = workbook.Sheets[workbook.SheetNames[1]];
        shortTermSheetName = workbook.SheetNames[0];
        longTermSheetName = workbook.SheetNames[1];
      }
      
      if (!shortTermSheet || !longTermSheet) {
        throw new Error('Excel file must contain both Short Term and Long Term sheets');
      }
      
      const shortTermData = XLSX.utils.sheet_to_json(shortTermSheet, {
        blankrows: false,
        defval: ''
      });
      
      const longTermData = XLSX.utils.sheet_to_json(longTermSheet, {
        blankrows: false,
        defval: ''
      });
      
      console.log('📋 Short Term columns:', Object.keys(shortTermData[0] || {}));
      console.log('📋 Long Term columns:', Object.keys(longTermData[0] || {}));
      console.log('📊 Short Term count:', shortTermData.length);
      console.log('📊 Long Term count:', longTermData.length);
      
      return {
        shortTermIssues: this.transformIssues(shortTermData, 'short_term'),
        longTermIssues: this.transformIssues(longTermData, 'long_term'),
        totalCount: shortTermData.length + longTermData.length,
        sheetNames: {
          shortTerm: shortTermSheetName,
          longTerm: longTermSheetName
        },
        errors: []
      };
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Validate Ninety.io Issues export format
   */
  static validateNinetyFormat(parseResults) {
    const { shortTermIssues, longTermIssues } = parseResults;
    
    if (!shortTermIssues || !longTermIssues) {
      return {
        valid: false,
        error: 'No issues data found in either sheet'
      };
    }

    const totalIssues = shortTermIssues.length + longTermIssues.length;
    if (totalIssues === 0) {
      return {
        valid: false,
        error: 'No valid issues found in the file'
      };
    }

    return {
      valid: true,
      shortTermCount: shortTermIssues.length,
      longTermCount: longTermIssues.length,
      totalCount: totalIssues,
      preview: {
        sampleShortTerm: shortTermIssues[0],
        sampleLongTerm: longTermIssues[0]
      }
    };
  }

  /**
   * Transform Ninety format to AXP format
   * Uses actual Ninety.io column names: Owner, Title, Description, etc.
   */
  static transformIssues(rawData, timeline) {
    if (!rawData || rawData.length === 0) {
      console.log(`ℹ️ No ${timeline} issues data to transform`);
      return [];
    }

    console.log(`🔄 Transforming ${rawData.length} ${timeline} issues from Ninety format`);

    const transformed = rawData.map((row, index) => {
      try {
        const title = safeTrim(row['Title']);
        const owner = safeTrim(row['Owner']);
        const description = safeTrim(row['Description']);
        const status = mapNinetyStatus(row);
        const team = safeTrim(row['Team']);
        const priority = mapPriority(safeTrim(row['Priority']));
        const who = safeTrim(row['Who']); // Additional assignee field
        
        // Parse dates
        const createdDate = parseExcelDate(row['Created Date']);
        const completedDate = parseExcelDate(row['Completed On']);
        const archivedDate = parseExcelDate(row['Archived Date']);
        
        if (!title) {
          console.warn(`⚠️ Row ${index + 1}: Missing title, skipping`);
          return null;
        }
        
        const issue = {
          title,
          description: description || '',
          owner_name: owner || null, // Used for user mapping
          who: who || null, // Additional assignee
          status,
          timeline,
          priority,
          team,
          created_date: createdDate ? createdDate.toISOString().split('T')[0] : null,
          completed_date: completedDate ? completedDate.toISOString().split('T')[0] : null,
          archived_date: archivedDate ? archivedDate.toISOString().split('T')[0] : null,
          attachment_names: safeTrim(row['Attachment Names']) || null,
          ninety_link: safeTrim(row['Link']) || null,
          // Metadata for reference
          ninety_team: team || null,
          raw_data: row
        };
        
        console.log(`✅ Row ${index + 1}: "${title}" - Owner: ${owner}, Status: ${status} (${timeline})`);
        return issue;

      } catch (error) {
        console.error(`❌ Error transforming ${timeline} issue row ${index + 1}:`, error.message);
        console.error('Row data:', row);
        return null;
      }
    });

    const validIssues = transformed.filter(issue => issue !== null);
    
    console.log(`✅ Successfully transformed ${validIssues.length} of ${rawData.length} ${timeline} issues`);
    
    return validIssues;
  }

  /**
   * Find existing issue to prevent duplicates
   * CRITICAL: Match by organization + team + title + timeline
   */
  static async findExistingIssue(organizationId, teamId, title, timeline, client) {
    const query = `
      SELECT id, title, status, owner_id, timeline
      FROM issues
      WHERE organization_id = $1
      AND team_id = $2
      AND TRIM(LOWER(title)) = TRIM(LOWER($3))
      AND timeline = $4
      AND deleted_at IS NULL
      LIMIT 1
    `;
    
    const result = await client.query(query, [organizationId, teamId, title, timeline]);
    return result.rows[0];
  }

  /**
   * Match assignee name to user in database
   */
  static async matchAssigneeToUser(assigneeName, organizationId, pool) {
    if (!assigneeName) return null;
    
    // Try exact match first
    const exactMatch = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email 
       FROM users u
       WHERE u.organization_id = $1 
       AND u.is_active = true
       AND (
         LOWER(CONCAT(u.first_name, ' ', u.last_name)) = LOWER($2)
         OR LOWER(u.first_name) = LOWER($2)
         OR LOWER(u.last_name) = LOWER($2)
         OR LOWER(u.email) = LOWER($2)
       )`,
      [organizationId, assigneeName]
    );
    
    if (exactMatch.rows.length > 0) {
      return exactMatch.rows[0].id;
    }
    
    // Try partial match
    const partialMatch = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email 
       FROM users u
       WHERE u.organization_id = $1 
       AND u.is_active = true
       AND (
         LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($2)
         OR LOWER(u.email) LIKE LOWER($2)
       )`,
      [organizationId, `%${assigneeName}%`]
    );
    
    if (partialMatch.rows.length === 1) {
      return partialMatch.rows[0].id;
    }
    
    return null;
  }

  /**
   * Get all users for organization (for mapping UI)
   */
  static async getUsersForOrganization(organizationId) {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.first_name || ' ' || u.last_name as full_name
      FROM users u
      WHERE u.organization_id = $1
      AND u.is_active = true
      ORDER BY u.first_name, u.last_name
    `;
    
    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Check for potential conflicts
   */
  static async checkIssueConflicts(organizationId, teamId, issues) {
    const conflicts = [];
    
    for (const issue of issues) {
      const existing = await this.findExistingIssue(
        organizationId,
        teamId,
        issue.title,
        issue.timeline,
        db
      );
      
      if (existing) {
        conflicts.push({
          title: issue.title,
          timeline: issue.timeline,
          existingStatus: existing.status,
          newStatus: issue.status,
          existingId: existing.id
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Execute the actual import
   */
  static async executeIssuesImport(
    issues,
    organizationId,
    teamId,
    userMappings,
    conflictStrategy = 'merge',
    userId, // User performing the import
    client
  ) {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    console.log(`🔗 Importing ${issues.length} issues...`);
    
    for (const issue of issues) {
      try {
        // Map owner name to user_id
        let assignedToId = null;
        if (issue.owner_name) {
          if (userMappings && userMappings[issue.owner_name]) {
            // Use explicit mapping if provided
            assignedToId = userMappings[issue.owner_name];
          } else {
            // Auto-match by name if no explicit mapping
            assignedToId = await this.matchAssigneeToUser(issue.owner_name, organizationId, client);
            if (!assignedToId) {
              console.warn(`⚠️ Could not find user for: ${issue.owner_name}`);
            }
          }
        }

        // If no assignee mapped, use the importing user as default
        if (!assignedToId) {
          assignedToId = userId;
        }
        
        // Check for existing issue
        const existing = await this.findExistingIssue(
          organizationId,
          teamId,
          issue.title,
          issue.timeline,
          client
        );
        
        if (existing) {
          console.log(`🔍 Found existing: "${issue.title}"`);
          
          if (conflictStrategy === 'skip') {
            results.skipped++;
            continue;
          }
          
          if (conflictStrategy === 'merge' || conflictStrategy === 'update') {
            // Update existing
            const updateQuery = `
              UPDATE issues
              SET status = $1,
                  owner_id = $2,
                  description = COALESCE($3, description),
                  priority_level = $4,
                  updated_at = NOW()
              WHERE id = $5
              RETURNING id
            `;
            
            await client.query(updateQuery, [
              issue.status,
              assignedToId,
              issue.description || null,
              issue.priority || 'normal',
              existing.id
            ]);
            
            console.log(`✅ Updated: "${issue.title}"`);
            results.updated++;
          }
        } else {
          // Create new issue
          const insertQuery = `
            INSERT INTO issues (
              id,
              organization_id,
              team_id,
              created_by_id,
              owner_id,
              title,
              description,
              status,
              timeline,
              priority_level,
              priority_rank,
              created_at,
              updated_at,
              created_via,
              external_id
            ) VALUES (
              gen_random_uuid(),
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              NOW(), NOW(), $11, $12
            )
            RETURNING id
          `;
          
          await client.query(insertQuery, [
            organizationId,           // $1
            teamId,                   // $2
            userId,                   // $3 - created_by_id (user doing the import)
            assignedToId,             // $4 - owner_id (owner from Excel)
            issue.title,              // $5
            issue.description || '',  // $6
            issue.status,             // $7
            issue.timeline,           // $8
            issue.priority || 'normal', // $9 - priority_level
            0,                        // $10 - priority_rank (default)
            'import',                 // $11 - created_via
            issue.link || null        // $12 - external_id (Ninety.io link)
          ]);
          
          console.log(`✅ Created: "${issue.title}"`);
          results.created++;
        }
      } catch (error) {
        console.error(`❌ Error importing "${issue.title}":`, error.message);
        results.errors.push({
          issue: issue.title,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

export default NinetyIssuesImportService;