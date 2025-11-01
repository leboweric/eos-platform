import NinetyIssuesImportService from '../services/ninetyIssuesImportService.js';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function to find user by name
 */
async function findUserByName(client, fullName, organizationId) {
  if (!fullName) return null;
  
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const query = `
    SELECT u.id FROM users u
    JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = $1 
    AND uo.is_active = true
    AND LOWER(u.first_name) = LOWER($2)
    AND LOWER(u.last_name) = LOWER($3)
    LIMIT 1
  `;

  const result = await client.query(query, [organizationId, firstName, lastName]);
  return result.rows[0]?.id || null;
}

/**
 * Get import template information
 */
export const getTemplate = async (req, res) => {
  try {
    const template = {
      format: 'Excel',
      required_sheets: [
        'Short Term',
        'Long Term'
      ],
      required_columns: [
        'Title'
      ],
      optional_columns: [
        'Owner',
        'Description',
        'Priority',
        'Team',
        'Who',
        'Attachment Names',
        'Completed On',
        'Archived Date',
        'Link',
        'Created Date'
      ],
      example_data: [
        {
          'Title': 'Fix customer onboarding process',
          'Owner': 'John Smith',
          'Description': 'Streamline the customer onboarding workflow',
          'Priority': 'High',
          'Team': 'Customer Success',
          'Who': 'Jane Doe',
          'Completed On': '',
          'Archived Date': '',
          'Created Date': '2025-10-01'
        }
      ],
      status_mapping: {
        'Open': 'Has neither Completed On nor Archived Date',
        'Resolved': 'Has Completed On date',
        'Closed': 'Has Archived Date'
      },
      timeline_mapping: {
        'Short Term': 'Issues from Short Term sheet',
        'Long Term': 'Issues from Long Term sheet'
      },
      priority_options: [
        'Low',
        'Medium',
        'High', 
        'Critical'
      ],
      notes: [
        'Title is required for each issue',
        'Status is determined by Completed On and Archived Date fields',
        'Owner will be matched to existing users',
        'Issues without valid owners will be assigned to the importing user',
        'Both Short Term and Long Term sheets are required'
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
 * Preview Excel import without saving
 */
export const preview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { organizationId, teamId } = req.body;
    const userId = req.user.id;

    // Parse Excel file
    const parseResults = NinetyIssuesImportService.parseExcel(req.file.buffer);
    
    // Validate format
    const validation = NinetyIssuesImportService.validateNinetyFormat(parseResults);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    // Combine both short term and long term issues
    const allIssues = [
      ...parseResults.shortTermIssues,
      ...parseResults.longTermIssues
    ];
    
    // Get existing issues to check for conflicts
    const existingIssues = await db.query(
      `SELECT id, title, timeline, status
       FROM issues
       WHERE organization_id = $1 AND team_id = $2 AND deleted_at IS NULL`,
      [organizationId, teamId]
    );

    const existingByTitleAndTimeline = new Map();
    existingIssues.rows.forEach(issue => {
      const key = `${issue.title.toLowerCase()}|${issue.timeline}`;
      existingByTitleAndTimeline.set(key, issue);
    });

    // Get all users in organization for assignee mapping
    const users = await NinetyIssuesImportService.getUsersForOrganization(organizationId);

    // Analyze issues for conflicts and assignee mapping
    const analysis = {
      totalIssues: allIssues.length,
      shortTermIssues: parseResults.shortTermIssues.length,
      longTermIssues: parseResults.longTermIssues.length,
      newIssues: [],
      existingIssues: [],
      assigneeMappings: {},
      unmappedAssignees: new Set(),
      users: users.map(u => ({
        id: u.id,
        name: u.full_name,
        email: u.email
      }))
    };

    // Process each issue
    for (const issue of allIssues) {
      // Check for existing issue
      const key = `${issue.title.toLowerCase()}|${issue.timeline}`;
      const existing = existingByTitleAndTimeline.get(key);
      
      if (existing) {
        analysis.existingIssues.push({
          ...issue,
          existingId: existing.id,
          conflict: true
        });
      } else {
        analysis.newIssues.push(issue);
      }

      // Try to match assignee
      if (issue.owner_name) {
        const matchedUserId = await NinetyIssuesImportService.matchAssigneeToUser(
          issue.owner_name,
          organizationId,
          db
        );
        
        if (matchedUserId) {
          analysis.assigneeMappings[issue.owner_name] = matchedUserId;
        } else {
          analysis.unmappedAssignees.add(issue.owner_name);
        }
      }

      // Also check "Who" field for additional assignees
      if (issue.who && issue.who !== issue.owner_name) {
        const matchedUserId = await NinetyIssuesImportService.matchAssigneeToUser(
          issue.who,
          organizationId,
          db
        );
        
        if (matchedUserId) {
          analysis.assigneeMappings[issue.who] = matchedUserId;
        } else {
          analysis.unmappedAssignees.add(issue.who);
        }
      }
    }

    // Prepare warnings
    const warnings = [];
    if (analysis.existingIssues.length > 0) {
      warnings.push(`${analysis.existingIssues.length} issues already exist and will be updated based on conflict strategy`);
    }
    if (analysis.unmappedAssignees.size > 0) {
      warnings.push(`${analysis.unmappedAssignees.size} assignees could not be matched to users`);
    }

    res.json({
      success: true,
      preview: {
        summary: {
          totalIssues: analysis.totalIssues,
          shortTermIssues: analysis.shortTermIssues,
          longTermIssues: analysis.longTermIssues,
          newIssues: analysis.newIssues.length,
          existingIssues: analysis.existingIssues.length,
          unmappedAssignees: analysis.unmappedAssignees.size
        },
        issues: allIssues.slice(0, 10), // Show first 10 for preview
        warnings: warnings,
        newIssues: analysis.newIssues,
        conflicts: analysis.existingIssues,
        assigneeMappings: analysis.assigneeMappings,
        unmappedAssignees: Array.from(analysis.unmappedAssignees),
        availableUsers: analysis.users,
        sheetNames: parseResults.sheetNames
      }
    });
  } catch (error) {
    console.error('Error previewing issues import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview import: ' + error.message
    });
  }
};

/**
 * Execute the actual import
 */
export const execute = async (req, res) => {
  const client = await db.getClient();
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { 
      organizationId, 
      teamId, 
      conflictStrategy = 'merge',
      assigneeMappings = {} 
    } = req.body;
    const userId = req.user.id;

    // Parse assigneeMappings if it's a string
    const mappings = typeof assigneeMappings === 'string' 
      ? JSON.parse(assigneeMappings) 
      : assigneeMappings;

    await client.query('BEGIN');

    // Parse and transform data
    const parseResults = NinetyIssuesImportService.parseExcel(req.file.buffer);
    
    // Validate format
    const validation = NinetyIssuesImportService.validateNinetyFormat(parseResults);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    // Combine both short term and long term issues
    const allIssues = [
      ...parseResults.shortTermIssues,
      ...parseResults.longTermIssues
    ];
    
    console.log('Transformed data summary:');
    console.log(`- Short Term Issues: ${parseResults.shortTermIssues.length}`);
    console.log(`- Long Term Issues: ${parseResults.longTermIssues.length}`);
    console.log(`- Total Issues: ${allIssues.length}`);

    // Execute import for all issues
    const results = await NinetyIssuesImportService.executeIssuesImport(
      allIssues,
      organizationId,
      teamId,
      mappings,
      conflictStrategy,
      userId,
      client
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      results: {
        ...results,
        totalProcessed: allIssues.length,
        shortTermProcessed: parseResults.shortTermIssues.length,
        longTermProcessed: parseResults.longTermIssues.length,
        sheetNames: parseResults.sheetNames
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing issues import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import issues: ' + error.message
    });
  } finally {
    client.release();
  }
};