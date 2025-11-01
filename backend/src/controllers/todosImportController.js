import XLSX from 'xlsx';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

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
 * Helper function to find user by name
 */
async function findUserByName(client, fullName, organizationId) {
  if (!fullName) return null;
  
  // Try exact match first
  const exactMatch = await client.query(
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
    [organizationId, fullName]
  );
  
  if (exactMatch.rows.length > 0) {
    return exactMatch.rows[0].id;
  }
  
  // Try partial match
  const partialMatch = await client.query(
    `SELECT u.id, u.first_name, u.last_name, u.email 
     FROM users u
     WHERE u.organization_id = $1 
     AND u.is_active = true
     AND (
       LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($2)
       OR LOWER(u.email) LIKE LOWER($2)
     )`,
    [organizationId, `%${fullName}%`]
  );
  
  if (partialMatch.rows.length === 1) {
    return partialMatch.rows[0].id;
  }
  
  return null;
}

/**
 * Get import template information
 */
export const getImportTemplate = async (req, res) => {
  try {
    const template = {
      format: 'Excel/CSV',
      required_columns: [
        'Title'
      ],
      optional_columns: [
        'Owner',
        'Description',
        'Due Date',
        'Completed On',
        'Team',
        'Priority',
        'Attachment Names',
        'Link',
        'Created Date'
      ],
      example_data: [
        {
          'Title': 'Update website content',
          'Owner': 'John Smith',
          'Description': 'Review and update the homepage copy',
          'Due Date': '2025-11-15',
          'Completed On': '',
          'Team': 'Marketing',
          'Priority': 'Medium',
          'Created Date': '2025-10-01'
        },
        {
          'Title': 'Prepare quarterly report',
          'Owner': 'Jane Doe',
          'Description': 'Compile Q4 performance metrics',
          'Due Date': '2025-12-01',
          'Completed On': '2025-11-28',
          'Team': 'Finance',
          'Priority': 'High',
          'Created Date': '2025-10-15'
        }
      ],
      status_mapping: {
        'Incomplete': 'Has no Completed On date',
        'Complete': 'Has Completed On date'
      },
      default_values: {
        'Status': 'Incomplete (unless Completed On has a date)',
        'Owner': 'Importing user (if Owner not found or empty)'
      },
      notes: [
        'Title is required for each to-do',
        'Status is determined by the Completed On field',
        'Owner will be matched to existing users by name or email',
        'To-dos without valid owners will be assigned to the importing user',
        'Due Date should be in YYYY-MM-DD format or Excel date'
      ]
    };
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error getting import template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template'
    });
  }
};

/**
 * Parse Excel/CSV file and return preview
 */
export const previewTodosImport = async (req, res) => {
  try {
    const { organizationId, teamId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!organizationId || !teamId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and Team ID are required'
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, {
      cellStyles: true,
      cellDates: true,
      defval: ''
    });

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      blankrows: false,
      defval: ''
    });

    console.log('📄 Processing todos import:', {
      fileName: req.file.originalname,
      sheetName,
      rowCount: rawData.length,
      columns: Object.keys(rawData[0] || {})
    });

    // Transform data
    const todos = rawData.map((row, index) => {
      try {
        const title = safeTrim(row['Title']);
        const owner = safeTrim(row['Owner']);
        const description = safeTrim(row['Description']);
        const dueDate = parseExcelDate(row['Due Date']);
        const completedDate = parseExcelDate(row['Completed On']);
        
        if (!title) {
          console.warn(`⚠️ Row ${index + 1}: Missing title, skipping`);
          return null;
        }

        const todo = {
          title,
          description: description || '',
          owner_name: owner || null,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          completed_date: completedDate ? completedDate.toISOString().split('T')[0] : null,
          status: completedDate ? 'complete' : 'incomplete',
          attachment_names: safeTrim(row['Attachment Names']) || null,
          link: safeTrim(row['Link']) || null,
          raw_data: row
        };

        console.log(`✅ Row ${index + 1}: "${title}" - Owner: ${owner}, Status: ${todo.status}`);
        return todo;

      } catch (error) {
        console.error(`❌ Error transforming todo row ${index + 1}:`, error.message);
        return null;
      }
    });

    const validTodos = todos.filter(todo => todo !== null);

    // Get available users for mapping
    const usersResult = await db.query(
      `SELECT id, first_name, last_name, email,
              first_name || ' ' || last_name as full_name
       FROM users
       WHERE organization_id = $1 AND is_active = true
       ORDER BY first_name, last_name`,
      [organizationId]
    );

    console.log(`✅ Successfully transformed ${validTodos.length} of ${rawData.length} todos`);

    res.json({
      success: true,
      preview: {
        todos: validTodos,
        totalCount: validTodos.length,
        availableUsers: usersResult.rows,
        errors: []
      }
    });

  } catch (error) {
    console.error('Error previewing todos import:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to preview import'
    });
  }
};

/**
 * Execute the actual import
 */
export const executeTodosImport = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { organizationId, teamId, userMappings } = req.body;
    const userId = req.user.id; // Current user doing the import
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Parse the same way as preview
    const workbook = XLSX.read(req.file.buffer, {
      cellStyles: true,
      cellDates: true,
      defval: ''
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      blankrows: false,
      defval: ''
    });

    // Transform data (same logic as preview)
    const todos = rawData.map((row, index) => {
      try {
        const title = safeTrim(row['Title']);
        const owner = safeTrim(row['Owner']);
        const description = safeTrim(row['Description']);
        const dueDate = parseExcelDate(row['Due Date']);
        const completedDate = parseExcelDate(row['Completed On']);
        
        if (!title) return null;

        return {
          title,
          description: description || '',
          owner_name: owner || null,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          completed_date: completedDate ? completedDate.toISOString().split('T')[0] : null,
          status: completedDate ? 'complete' : 'incomplete',
          raw_data: row
        };
      } catch (error) {
        console.error(`Error transforming todo row ${index + 1}:`, error.message);
        return null;
      }
    }).filter(todo => todo !== null);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Parse user mappings
    const mappings = userMappings ? JSON.parse(userMappings) : {};

    console.log(`🔗 Importing ${todos.length} todos...`);

    for (const todo of todos) {
      try {
        // Map owner name to user_id
        let assignedToId = null;
        if (todo.owner_name) {
          if (mappings[todo.owner_name]) {
            // Use explicit mapping if provided
            assignedToId = mappings[todo.owner_name];
          } else {
            // Auto-match by name if no explicit mapping
            assignedToId = await findUserByName(client, todo.owner_name, organizationId);
            if (!assignedToId) {
              console.warn(`⚠️ Could not find user for: ${todo.owner_name}`);
            }
          }
        }

        // If no assignee mapped, use the importing user as default
        if (!assignedToId) {
          assignedToId = userId;
        }

        // Insert new todo
        const insertQuery = `
          INSERT INTO todos (
            id,
            organization_id,
            team_id,
            owner_id,
            assigned_to_id,
            title,
            description,
            due_date,
            status,
            completed_at,
            is_private,
            archived,
            is_multi_assignee
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
          RETURNING id
        `;

        await client.query(insertQuery, [
          uuidv4(),                                    // $1 - id
          organizationId,                              // $2 - organization_id  
          teamId,                                      // $3 - team_id
          userId,                                      // $4 - owner_id (user doing import)
          assignedToId,                                // $5 - assigned_to_id (owner from Excel)
          todo.title,                                  // $6 - title
          todo.description || '',                      // $7 - description
          todo.due_date,                               // $8 - due_date
          todo.status,                                 // $9 - status
          todo.completed_date ? new Date(todo.completed_date) : null,  // $10 - completed_at
          false,                                       // $11 - is_private
          false,                                       // $12 - archived
          true                                         // $13 - is_multi_assignee
        ]);

        console.log(`✅ Created: "${todo.title}"`);
        results.created++;

      } catch (error) {
        console.error(`❌ Error importing "${todo.title}":`, error.message);
        results.errors.push({
          todo: todo.title,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    console.log('📊 Import Results:', results);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing todos import:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute import'
    });
  } finally {
    client.release();
  }
};