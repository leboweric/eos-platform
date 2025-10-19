import XLSX from 'xlsx';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { parseUserImportFile, checkExistingUsers, getOrCreateDepartments } from '../services/bulkUserImportService.js';

// Generate Excel template for bulk user import
export const downloadTemplate = async (req, res) => {
  try {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Sample data with headers
    const wsData = [
      ['First Name', 'Last Name', 'Email', 'Role', 'Department Name'],
      ['John', 'Doe', 'john.doe@example.com', 'member', 'Sales'],
      ['Jane', 'Smith', 'jane.smith@example.com', 'member', 'Marketing'],
      ['Example', 'User', 'example@example.com', 'admin', 'Executive'],
    ];
    
    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 30 }, // Email
      { wch: 12 }, // Role
      { wch: 20 }, // Department Name
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    // Add instructions sheet
    const instructionsData = [
      ['Instructions for Bulk User Import'],
      [''],
      ['1. Fill in the Users sheet with your user data'],
      ['2. Required fields: First Name, Last Name, Email, Role'],
      ['3. Role options: member, admin'],
      ['4. Department Name is optional - departments will be created if they don\'t exist'],
      ['5. All users will be set up for Microsoft OAuth authentication (no passwords needed)'],
      ['6. Email addresses must be unique'],
      [''],
      ['Notes:'],
      ['- Users will be added to your organization'],
      ['- They can log in using "Continue with Microsoft" button'],
      ['- Make sure email addresses match their Microsoft accounts'],
    ];
    
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_user_import_template.xlsx"');
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template'
    });
  }
};

// Parse and preview Excel file
export const previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    console.log('📤 Processing bulk import preview for org:', organizationId);
    console.log('📄 File:', req.file.originalname, `(${req.file.size} bytes)`);

    // Use the service to parse the Excel file
    const { users, summary } = await parseUserImportFile(req.file.buffer);

    // Check which users already exist
    const existingEmails = await checkExistingUsers(users, organizationId, db);
    const existingEmailSet = new Set(existingEmails);

    // Mark users as duplicates if they already exist
    const usersWithStatus = users.map(user => ({
      ...user,
      isDuplicate: existingEmailSet.has(user.email),
      status: !user.isValid ? 'Invalid' 
            : existingEmailSet.has(user.email) ? 'Duplicate' 
            : 'Ready'
    }));

    // Get existing departments
    const existingDepartments = await db.query(
      `SELECT LOWER(name) as name FROM teams 
       WHERE organization_id = $1`,
      [organizationId]
    );
    const existingDeptSet = new Set(existingDepartments.rows.map(d => d.name));

    // Identify new departments
    const newDepartments = summary.departments.filter(
      dept => dept && !existingDeptSet.has(dept.toLowerCase())
    );

    // Separate valid and invalid users
    const validUsers = usersWithStatus.filter(u => u.status === 'Ready');
    const invalidUsers = usersWithStatus.filter(u => u.status === 'Invalid');
    const duplicateUsers = usersWithStatus.filter(u => u.status === 'Duplicate');

    res.json({
      success: true,
      preview: {
        valid: validUsers,
        invalid: invalidUsers,
        duplicates: duplicateUsers,
        summary: {
          total: users.length,
          valid: validUsers.length,
          invalid: invalidUsers.length,
          duplicates: duplicateUsers.length,
          users: users.length
        },
        departments: {
          new: newDepartments,
          existing: Array.from(existingDeptSet)
        },
        canImport: validUsers.length > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview import: ' + error.message
    });
  }
};

// Perform bulk import
export const bulkImport = async (req, res) => {
  const client = await db.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const organizationId = req.user.organization_id;
    const importedBy = req.user.id;
    const skipDuplicates = req.body.skipDuplicates !== false; // Default to true
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    console.log('🚀 Executing bulk import for org:', organizationId);

    await client.query('BEGIN');

    // Parse file using the service
    const { users } = await parseUserImportFile(req.file.buffer);

    // Check existing users
    const existingEmails = await checkExistingUsers(users, organizationId, client);
    const existingEmailSet = new Set(existingEmails);

    // Filter out invalid and duplicate users
    let usersToImport = users.filter(u => u.isValid);
    if (skipDuplicates) {
      usersToImport = usersToImport.filter(u => !existingEmailSet.has(u.email));
    }

    console.log('👥 Importing', usersToImport.length, 'users');

    // Track results
    const results = {
      usersCreated: 0,
      usersSkipped: 0,
      usersFailed: 0,
      departmentsCreated: 0,
      errors: [],
      warnings: [],
      createdUsers: []
    };

    // Get or create departments
    const uniqueDepartments = [...new Set(usersToImport.map(u => u.department).filter(d => d))];
    const departmentMap = await getOrCreateDepartments(uniqueDepartments, organizationId, client);
    results.departmentsCreated = Object.keys(departmentMap).length;

    // Import each user
    for (const user of usersToImport) {
      try {
        // Generate user ID
        const userId = uuidv4();
        
        // Create user record
        await client.query(
          `INSERT INTO users (
            id, first_name, last_name, email, 
            organization_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [userId, user.firstName, user.lastName, user.email, organizationId]
        );

        // Add to user_organizations with role
        await client.query(
          `INSERT INTO user_organizations (
            user_id, organization_id, role, created_at
          ) VALUES ($1, $2, $3, NOW())`,
          [userId, organizationId, user.role]
        );

        // Add to department/team if specified
        if (user.department && departmentMap[user.department]) {
          await client.query(
            `INSERT INTO team_members (
              team_id, user_id, created_at
            ) VALUES ($1, $2, NOW())`,
            [departmentMap[user.department], userId]
          );
        }

        results.createdUsers.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          department: user.department
        });
        results.usersCreated++;

      } catch (userError) {
        console.error(`❌ Failed to import ${user.email}:`, userError.message);
        
        // Check if it's a duplicate key error
        if (userError.code === '23505') {
          results.warnings.push(`${user.email}: Already exists (duplicate key)`);
          results.usersSkipped++;
        } else {
          results.errors.push(`Row ${user.rowNumber} (${user.email}): ${userError.message}`);
          results.usersFailed++;
        }
      }
    }

    // Add skipped invalid users to the count
    results.usersSkipped += users.filter(u => !u.isValid).length;
    
    // Add skipped duplicate users to the count (if skipDuplicates is true)
    if (skipDuplicates) {
      results.usersSkipped += users.filter(u => u.isValid && existingEmailSet.has(u.email)).length;
    }

    await client.query('COMMIT');

    console.log('✅ Import complete:', results.usersCreated, 'created,', results.usersFailed, 'failed,', results.usersSkipped, 'skipped');

    res.json({
      success: true,
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import users: ' + error.message
    });
  } finally {
    client.release();
  }
};