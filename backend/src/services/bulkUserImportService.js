import XLSX from 'xlsx';

/**
 * Parse Excel file with proper handling of __EMPTY column names
 * This handles Excel files where data columns may not start at column A,
 * or where there are empty columns causing SheetJS to name them __EMPTY
 */
export async function parseUserImportFile(fileBuffer) {
  try {
    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, {
      cellStyles: true,
      cellDates: true,
      defval: ''
    });

    // Get first sheet (assuming user data is on first sheet)
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log('📄 Parsing sheet:', sheetName);

    // Convert sheet to JSON - this will use __EMPTY for unnamed columns
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      blankrows: false,
      defval: ''
    });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('Excel file is empty or has no data');
    }

    console.log('📊 Total rows in Excel:', rawRows.length);
    console.log('📊 Raw first row keys:', Object.keys(rawRows[0]));

    // STEP 1: Extract headers from first row
    // The first row contains the actual column names like "First Name", "Last Name", etc.
    const headerRow = rawRows[0];
    
    // Build mapping: __EMPTY → "First Name", __EMPTY_1 → "Last Name", etc.
    const columnMapping = {};
    Object.keys(headerRow).forEach(excelKey => {
      const headerValue = headerRow[excelKey];
      if (headerValue && typeof headerValue === 'string' && headerValue.trim()) {
        columnMapping[excelKey] = headerValue.trim();
      }
    });

    console.log('📋 Column mapping:', columnMapping);

    // Verify we have the required columns
    const requiredColumns = ['First Name', 'Last Name', 'Email', 'Department Name', 'Role'];
    const mappedColumns = Object.values(columnMapping);
    
    const missingColumns = requiredColumns.filter(col => !mappedColumns.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // STEP 2: Process data rows (skip header row)
    const dataRows = rawRows.slice(1);
    
    console.log('👥 Processing', dataRows.length, 'user rows');

    // STEP 3: Map each row from __EMPTY keys to proper column names
    const mappedUsers = dataRows.map((row, index) => {
      const mappedRow = {};
      
      // Map each __EMPTY key to its actual column name
      Object.keys(row).forEach(excelKey => {
        const columnName = columnMapping[excelKey];
        if (columnName) {
          mappedRow[columnName] = row[excelKey];
        }
      });

      return mappedRow;
    });

    // STEP 4: Convert to our internal format (camelCase)
    const users = mappedUsers.map((user, index) => {
      // Extract values
      const firstName = user['First Name']?.toString().trim() || '';
      const lastName = user['Last Name']?.toString().trim() || '';
      const email = user['Email']?.toString().trim().toLowerCase() || '';
      const departmentName = user['Department Name']?.toString().trim() || '';
      const role = user['Role']?.toString().trim().toLowerCase() || '';

      // Validate required fields
      const errors = [];
      if (!firstName) errors.push('First name is required');
      if (!lastName) errors.push('Last name is required');
      if (!email) errors.push('Email is required');
      if (!role) errors.push('Role is required');

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        errors.push('Invalid email format');
      }

      // Validate role
      const validRoles = ['admin', 'member'];
      if (role && !validRoles.includes(role)) {
        errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      return {
        rowNumber: index + 2, // +2 because: +1 for header row, +1 for 0-index
        firstName,
        lastName,
        email,
        department: departmentName,
        role: role || 'member', // Default to 'member' if not specified
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors.join(', ') : null
      };
    });

    // STEP 5: Generate summary statistics
    const validUsers = users.filter(u => u.isValid);
    const invalidUsers = users.filter(u => !u.isValid);
    const uniqueDepartments = [...new Set(users.map(u => u.department).filter(d => d))];

    console.log('✅ Valid users:', validUsers.length);
    console.log('❌ Invalid users:', invalidUsers.length);
    console.log('🏢 Unique departments:', uniqueDepartments.length);

    return {
      users,
      summary: {
        totalRows: users.length,
        validUsers: validUsers.length,
        invalidUsers: invalidUsers.length,
        departments: uniqueDepartments
      }
    };

  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Check which users already exist in the organization
 */
export async function checkExistingUsers(users, organizationId, pool) {
  const emails = users.map(u => u.email).filter(e => e);
  
  if (emails.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT email FROM users 
     WHERE organization_id = $1 
     AND email = ANY($2)`,
    [organizationId, emails]
  );

  return result.rows.map(row => row.email);
}

/**
 * Get or create departments (teams) for the organization
 */
export async function getOrCreateDepartments(departmentNames, organizationId, pool) {
  const client = await pool.connect();
  const departmentMap = {};

  try {
    await client.query('BEGIN');

    for (const deptName of departmentNames) {
      if (!deptName) continue;

      // Check if department exists
      const existing = await client.query(
        `SELECT id, name FROM teams 
         WHERE organization_id = $1 
         AND LOWER(name) = LOWER($2)
         AND deleted_at IS NULL`,
        [organizationId, deptName]
      );

      if (existing.rows.length > 0) {
        departmentMap[deptName] = existing.rows[0].id;
      } else {
        // Create new department
        const newDept = await client.query(
          `INSERT INTO teams (id, organization_id, name, type, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'department', NOW(), NOW())
           RETURNING id`,
          [organizationId, deptName]
        );
        departmentMap[deptName] = newDept.rows[0].id;
        console.log('🆕 Created new department:', deptName);
      }
    }

    await client.query('COMMIT');
    return departmentMap;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}