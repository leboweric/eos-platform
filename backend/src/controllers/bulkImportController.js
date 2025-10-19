import XLSX from 'xlsx';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Generate Excel template for bulk user import
export const downloadTemplate = async (req, res) => {
  try {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Sample data with headers
    const wsData = [
      ['First Name', 'Last Name', 'Email', 'Role', 'Department Name'],
      ['John', 'Doe', 'john.doe@example.com', 'user', 'Sales'],
      ['Jane', 'Smith', 'jane.smith@example.com', 'manager', 'Marketing'],
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
      ['3. Role options: user, manager, admin'],
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
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Validate and process data
    const validationResults = [];
    const departments = new Set();
    const emails = new Set();
    const warnings = [];
    
    // Check existing emails in database
    const existingEmailsResult = await query(
      'SELECT email FROM users WHERE organization_id = $1',
      [organizationId]
    );
    const existingEmails = new Set(existingEmailsResult.rows.map(r => r.email.toLowerCase()));
    
    jsonData.forEach((row, index) => {
      const rowNum = index + 2; // Excel rows start at 1, plus header row
      const result = {
        row: rowNum,
        firstName: row['First Name']?.toString().trim(),
        lastName: row['Last Name']?.toString().trim(),
        email: row['Email']?.toString().trim().toLowerCase(),
        role: row['Role']?.toString().trim().toLowerCase(),
        department: row['Department Name']?.toString().trim(),
        valid: true,
        errors: []
      };
      
      // Validate required fields
      if (!result.firstName) {
        result.valid = false;
        result.errors.push('First name is required');
      }
      
      if (!result.lastName) {
        result.valid = false;
        result.errors.push('Last name is required');
      }
      
      if (!result.email) {
        result.valid = false;
        result.errors.push('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
        result.valid = false;
        result.errors.push('Invalid email format');
      } else if (existingEmails.has(result.email)) {
        result.valid = false;
        result.errors.push('Email already exists in the system');
      } else if (emails.has(result.email)) {
        result.valid = false;
        result.errors.push('Duplicate email in spreadsheet');
      }
      
      if (!result.role) {
        result.valid = false;
        result.errors.push('Role is required');
      } else if (!['user', 'manager', 'admin'].includes(result.role)) {
        result.valid = false;
        result.errors.push('Invalid role (must be: user, manager, or admin)');
      }
      
      // Track departments and emails
      if (result.department) {
        departments.add(result.department);
      }
      if (result.email) {
        emails.add(result.email);
      }
      
      validationResults.push(result);
    });
    
    // Check existing departments
    const departmentList = Array.from(departments);
    const existingDepts = departmentList.length > 0 ? await query(
      'SELECT name FROM teams WHERE organization_id = $1 AND name = ANY($2)',
      [organizationId, departmentList]
    ) : { rows: [] };
    
    const existingDeptNames = new Set(existingDepts.rows.map(d => d.name));
    const newDepartments = departmentList.filter(d => !existingDeptNames.has(d));
    
    // Summary
    const validUsers = validationResults.filter(r => r.valid);
    const invalidUsers = validationResults.filter(r => !r.valid);
    
    res.json({
      success: true,
      preview: {
        totalRows: validationResults.length,
        validUsers: validUsers.length,
        invalidUsers: invalidUsers.length,
        newDepartments: newDepartments.length,
        existingDepartments: existingDeptNames.size,
        users: validationResults,
        departments: {
          new: newDepartments,
          existing: Array.from(existingDeptNames)
        },
        canImport: validUsers.length > 0
      }
    });
    
  } catch (error) {
    console.error('Error previewing import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview import: ' + error.message
    });
  }
};

// Perform bulk import
export const bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const organizationId = req.user.organization_id;
    const importedBy = req.user.id;
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Track results
    const results = {
      usersCreated: 0,
      usersFailed: 0,
      departmentsCreated: 0,
      errors: [],
      createdUsers: []
    };
    
    // Map to store department name -> id
    const departmentMap = new Map();
    
    // Get existing departments
    const existingDepts = await query(
      'SELECT id, name FROM teams WHERE organization_id = $1',
      [organizationId]
    );
    existingDepts.rows.forEach(dept => {
      departmentMap.set(dept.name, dept.id);
    });
    
    // Process each row
    for (const [index, row] of jsonData.entries()) {
      const rowNum = index + 2;
      
      try {
        const firstName = row['First Name']?.toString().trim();
        const lastName = row['Last Name']?.toString().trim();
        const email = row['Email']?.toString().trim().toLowerCase();
        const role = row['Role']?.toString().trim().toLowerCase();
        const departmentName = row['Department Name']?.toString().trim();
        
        // Skip invalid rows
        if (!firstName || !lastName || !email || !role) {
          results.errors.push(`Row ${rowNum}: Missing required fields`);
          results.usersFailed++;
          continue;
        }
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push(`Row ${rowNum}: Invalid email format`);
          results.usersFailed++;
          continue;
        }
        
        // Validate role
        if (!['user', 'manager', 'admin'].includes(role)) {
          results.errors.push(`Row ${rowNum}: Invalid role`);
          results.usersFailed++;
          continue;
        }
        
        // Create department if needed
        let departmentId = null;
        if (departmentName && !departmentMap.has(departmentName)) {
          const deptResult = await query(
            `INSERT INTO teams (id, organization_id, name, is_leadership_team, created_at, updated_at)
             VALUES ($1, $2, $3, false, NOW(), NOW())
             RETURNING id`,
            [uuidv4(), organizationId, departmentName]
          );
          departmentId = deptResult.rows[0].id;
          departmentMap.set(departmentName, departmentId);
          results.departmentsCreated++;
          console.log(`Created department: ${departmentName}`);
        } else if (departmentName) {
          departmentId = departmentMap.get(departmentName);
        }
        
        // Create user
        const userId = uuidv4();
        await query(
          `INSERT INTO users (
            id,
            organization_id,
            email,
            first_name,
            last_name,
            role,
            password_hash,
            oauth_provider,
            email_verified,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            userId,
            organizationId,
            email,
            firstName,
            lastName,
            role,
            null, // No password for OAuth users
            'microsoft',
            true, // Pre-verified for OAuth
            
          ]
        );
        
        // Add user to department if specified
        if (departmentId) {
          await query(
            `INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
             VALUES ($1, $2, $3, 'member', NOW(), NOW())`,
            [uuidv4(), departmentId, userId]
          );
        }
        
        results.usersCreated++;
        results.createdUsers.push({
          email,
          firstName,
          lastName,
          department: departmentName
        });
        
        console.log(`Created user: ${email}`);
        
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        if (error.code === '23505') {
          results.errors.push(`Row ${rowNum}: Email ${row['Email']} already exists`);
        } else {
          results.errors.push(`Row ${rowNum}: ${error.message}`);
        }
        results.usersFailed++;
      }
    }
    
    res.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Error performing bulk import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import users: ' + error.message
    });
  }
};