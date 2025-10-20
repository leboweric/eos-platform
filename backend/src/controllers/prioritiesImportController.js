import NinetyPrioritiesImportService from '../services/ninetyPrioritiesImportService.js';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get import template information
 */
export const getTemplate = async (req, res) => {
  try {
    const template = {
      format: 'Excel',
      required_columns: [
        'Title'
      ],
      optional_columns: [
        'Description',
        'Assignee', 
        'Due Date',
        'Status',
        'Priority',
        'Company',
        'Milestone 1',
        'Milestone 1 Date',
        'Milestone 2', 
        'Milestone 2 Date',
        'Milestone 3',
        'Milestone 3 Date'
      ],
      example_data: [
        {
          'Title': 'Implement new CRM system',
          'Description': 'Deploy Salesforce across all departments',
          'Assignee': 'John Smith',
          'Due Date': '2025-12-31',
          'Status': 'In Progress',
          'Priority': 'High',
          'Company': 'Yes',
          'Milestone 1': 'Requirements gathering',
          'Milestone 1 Date': '2025-11-15',
          'Milestone 2': 'System configuration',
          'Milestone 2 Date': '2025-12-01'
        }
      ],
      status_options: [
        'Not Started',
        'In Progress', 
        'On Track',
        'At Risk',
        'Off Track',
        'Complete'
      ],
      priority_options: [
        'Low',
        'Medium',
        'High', 
        'Critical'
      ],
      notes: [
        'Title is required for each priority',
        'Company field: "Yes" or "No" (or "Company"/"Individual")',
        'Dates should be in YYYY-MM-DD format',
        'Assignee will be matched to existing users',
        'Up to 5 milestones supported per priority'
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
 * Preview CSV import without saving
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
    const parseResults = NinetyPrioritiesImportService.parseExcel(req.file.buffer);
    
    // Validate format
    const validation = NinetyPrioritiesImportService.validateNinetyFormat(parseResults.data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    // Transform data (pass current quarter/year)
    const currentDate = new Date();
    const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3).toString();
    const currentYear = currentDate.getFullYear();
    
    const transformedData = NinetyPrioritiesImportService.transformNinetyPriorities(
      parseResults.data, 
      teamId, 
      organizationId, 
      currentQuarter, 
      currentYear
    );
    
    // Get existing priorities to check for conflicts
    const existingPriorities = await db.query(
      `SELECT id, title
       FROM quarterly_priorities
       WHERE organization_id = $1 AND team_id = $2 AND deleted_at IS NULL`,
      [organizationId, teamId]
    );

    const existingByTitle = new Map(
      existingPriorities.rows.map(p => [p.title.toLowerCase(), p])
    );

    // Get all users in organization for assignee mapping
    const users = await db.query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE organization_id = $1
       ORDER BY first_name, last_name`,
      [organizationId]
    );

    // Analyze priorities for conflicts and assignee mapping
    const analysis = {
      totalPriorities: transformedData.length,
      newPriorities: [],
      existingPriorities: [],
      assigneeMappings: {},
      unmappedAssignees: new Set(),
      users: users.rows.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email
      })),
      totalMilestones: 0
    };

    // Process each priority
    for (const priority of transformedData) {
      // Check for existing priority
      const existing = existingByTitle.get(priority.title.toLowerCase());
      
      if (existing) {
        analysis.existingPriorities.push({
          ...priority,
          existingId: existing.id,
          conflict: true
        });
      } else {
        analysis.newPriorities.push(priority);
      }

      // Note: Ninety.io exports don't include milestones in this format
      // analysis.totalMilestones += 0;

      // Try to match assignee
      if (priority.owner_name) {
        const matchedUserId = await NinetyPrioritiesImportService.matchAssigneeToUser(
          priority.owner_name,
          organizationId,
          db
        );
        
        if (matchedUserId) {
          analysis.assigneeMappings[priority.owner_name] = matchedUserId;
        } else {
          analysis.unmappedAssignees.add(priority.owner_name);
        }
      }
    }

    // Prepare warnings
    const warnings = [];
    if (analysis.existingPriorities.length > 0) {
      warnings.push(`${analysis.existingPriorities.length} priorities already exist and will be updated based on conflict strategy`);
    }
    if (analysis.unmappedAssignees.size > 0) {
      warnings.push(`${analysis.unmappedAssignees.size} assignees could not be matched to users`);
    }

    res.json({
      success: true,
      preview: {
        summary: {
          totalPriorities: analysis.totalPriorities,
          newPriorities: analysis.newPriorities.length,
          existingPriorities: analysis.existingPriorities.length,
          totalMilestones: analysis.totalMilestones,
          unmappedAssignees: analysis.unmappedAssignees.size
        },
        priorities: transformedData.priorities.slice(0, 10), // Show first 10 for preview
        warnings: warnings,
        newPriorities: analysis.newPriorities,
        conflicts: analysis.existingPriorities,
        assigneeMappings: analysis.assigneeMappings,
        unmappedAssignees: Array.from(analysis.unmappedAssignees),
        availableUsers: analysis.users
      }
    });
  } catch (error) {
    console.error('Error previewing priorities import:', error);
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
  const client = await db.connect();
  
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
    const parseResults = NinetyPrioritiesImportService.parseExcel(req.file.buffer);
    
    // Validate format
    const validation = NinetyPrioritiesImportService.validateNinetyFormat(parseResults.data);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    // Transform data (pass current quarter/year)
    const currentDate = new Date();
    const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3).toString();
    const currentYear = currentDate.getFullYear();
    
    const transformedData = NinetyPrioritiesImportService.transformNinetyPriorities(
      parseResults.data, 
      teamId, 
      organizationId, 
      currentQuarter, 
      currentYear
    );
    
    console.log('Transformed priorities data summary:');
    console.log(`- Priorities found: ${transformedData.length}`);

    const results = {
      prioritiesCreated: 0,
      prioritiesUpdated: 0,
      prioritiesSkipped: 0,
      milestonesCreated: 0,
      errors: []
    };
    
    for (const priority of transformedData) {
      try {
        // Find existing priority
        const existing = await NinetyPrioritiesImportService.findExistingPriority(
          priority.title,
          teamId,
          organizationId,
          client
        );
        
        // Handle conflict strategy
        if (existing) {
          if (conflictStrategy === 'skip') {
            results.prioritiesSkipped++;
            continue;
          } else if (conflictStrategy === 'update') {
            // Delete old milestones
            await NinetyPrioritiesImportService.deleteMilestones(existing.id, client);
          }
        }

        // Determine assignee
        let assigneeId = null;
        if (priority.assignee_name && mappings[priority.assignee_name]) {
          assigneeId = mappings[priority.assignee_name];
        }

        let priorityId;
        
        if (existing && conflictStrategy !== 'skip') {
          // Update existing priority
          await client.query(
            `UPDATE quarterly_priorities SET
              description = COALESCE($1, description),
              assignee = COALESCE($2, assignee),
              due_date = COALESCE($3, due_date),
              status = $4,
              priority_level = $5,
              is_company = $6,
              updated_at = NOW()
            WHERE id = $7`,
            [
              priority.description || null,
              assigneeId || priority.assignee_name,
              priority.due_date,
              priority.status,
              priority.priority_level,
              priority.is_company,
              existing.id
            ]
          );
          priorityId = existing.id;
          results.prioritiesUpdated++;
        } else if (!existing) {
          // Create new priority
          const newPriority = await client.query(
            `INSERT INTO quarterly_priorities (
              id, organization_id, team_id, quarter, year,
              title, description, assignee, due_date, status,
              priority_level, is_company, created_by,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              NOW(), NOW()
            ) RETURNING id`,
            [
              uuidv4(),
              organizationId,
              teamId,
              quarter,
              year,
              priority.title,
              priority.description,
              assigneeId || priority.assignee_name,
              priority.due_date,
              priority.status,
              priority.priority_level,
              priority.is_company,
              userId
            ]
          );
          priorityId = newPriority.rows[0].id;
          results.prioritiesCreated++;
        }

        // Create milestones if any
        if (priority.milestones.length > 0) {
          const createdMilestones = await NinetyPrioritiesImportService.createMilestones(
            priorityId,
            priority.milestones,
            client
          );
          results.milestonesCreated += createdMilestones.length;
        }

      } catch (error) {
        console.error(`Error processing priority "${priority.title}":`, error);
        results.errors.push({
          priority: priority.title,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      results: {
        ...results,
        totalProcessed: transformedData.priorities.length,
        quarter,
        year
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing priorities import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import priorities: ' + error.message
    });
  } finally {
    client.release();
  }
};