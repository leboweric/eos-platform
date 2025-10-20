import NinetyPrioritiesImportService from '../services/ninetyPrioritiesImportService.js';
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
    SELECT id FROM users 
    WHERE organization_id = $1 
    AND LOWER(first_name) = LOWER($2)
    AND LOWER(last_name) = LOWER($3)
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
    const validation = NinetyPrioritiesImportService.validateNinetyFormat(parseResults);
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
    
    const transformedPriorities = NinetyPrioritiesImportService.transformNinetyPriorities(
      parseResults.rocksData, 
      teamId, 
      organizationId, 
      currentQuarter, 
      currentYear
    );
    
    const transformedMilestones = NinetyPrioritiesImportService.transformNinetyMilestones(
      parseResults.milestonesData,
      organizationId
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
      totalPriorities: transformedPriorities.length,
      newPriorities: [],
      existingPriorities: [],
      assigneeMappings: {},
      unmappedAssignees: new Set(),
      users: users.rows.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email
      })),
      totalMilestones: transformedMilestones.length
    };

    // Process each priority
    for (const priority of transformedPriorities) {
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
        priorities: transformedPriorities.slice(0, 10), // Show first 10 for preview
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
    const validation = NinetyPrioritiesImportService.validateNinetyFormat(parseResults);
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
    
    const transformedPriorities = NinetyPrioritiesImportService.transformNinetyPriorities(
      parseResults.rocksData, 
      teamId, 
      organizationId, 
      currentQuarter, 
      currentYear
    );
    
    const transformedMilestones = NinetyPrioritiesImportService.transformNinetyMilestones(
      parseResults.milestonesData,
      organizationId
    );
    
    console.log('Transformed data summary:');
    console.log(`- Priorities found: ${transformedPriorities.length}`);
    console.log(`- Milestones found: ${transformedMilestones.length}`);

    const results = {
      prioritiesCreated: 0,
      prioritiesUpdated: 0,
      prioritiesSkipped: 0,
      milestonesCreated: 0,
      errors: []
    };
    
    // Create mapping of priority titles to IDs for milestone linking
    const priorityTitleToId = new Map();
    
    for (const priority of transformedPriorities) {
      try {
        // Determine owner (assignee) FIRST
        let ownerId = null;
        if (priority.owner_name) {
          if (mappings && mappings[priority.owner_name]) {
            // Use explicit mapping if provided
            ownerId = mappings[priority.owner_name];
          } else {
            // Auto-match by name if no explicit mapping
            ownerId = await findUserByName(client, priority.owner_name, organizationId);
            if (!ownerId) {
              console.warn(`⚠️  Could not find user for: ${priority.owner_name}`);
            }
          }
        }

        // If no owner mapped, use the importing user as default
        if (!ownerId) {
          ownerId = userId;
        }

        // Find existing priority (now with ownerId determined)
        const existing = await NinetyPrioritiesImportService.findExistingPriority(
          priority.title,
          ownerId,
          teamId,
          organizationId,
          currentQuarter,
          currentYear,
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

        let priorityId;
        
        if (existing && conflictStrategy !== 'skip') {
          // Update existing priority
          await client.query(
            `UPDATE quarterly_priorities SET
              description = COALESCE($1, description),
              owner_id = COALESCE($2, owner_id),
              due_date = COALESCE($3, due_date),
              status = $4,
              progress = $5,
              is_company_priority = $6,
              updated_at = NOW()
            WHERE id = $7`,
            [
              priority.description || null,
              ownerId,
              priority.due_date,
              priority.status,
              priority.progress || 0,
              priority.is_company_priority || false,
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
              title, description, owner_id, due_date, status,
              progress, is_company_priority, created_by,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              NOW(), NOW()
            ) RETURNING id`,
            [
              uuidv4(),
              organizationId,
              teamId,
              currentQuarter,
              currentYear,
              priority.title,
              priority.description,
              ownerId,
              priority.due_date,
              priority.status,
              priority.progress || 0,
              priority.is_company_priority || false,
              userId
            ]
          );
          priorityId = newPriority.rows[0].id;
          results.prioritiesCreated++;
        }

        // Store priority ID for milestone linking
        if (priorityId) {
          priorityTitleToId.set(priority.title, priorityId);
        }

      } catch (error) {
        console.error(`Error processing priority "${priority.title}":`, error);
        results.errors.push({
          priority: priority.title,
          error: error.message
        });
      }
    }

    // Now import milestones and link them to priorities
    console.log(`🔗 Importing ${transformedMilestones.length} milestones...`);
    
    for (const milestone of transformedMilestones) {
      try {
        // Find the parent priority by rock name
        const parentPriorityId = priorityTitleToId.get(milestone.rocks_name);
        
        if (!parentPriorityId) {
          console.warn(`⚠️  Could not find parent priority for milestone "${milestone.title}" (rock: "${milestone.rocks_name}")`);
          continue;
        }

        // Insert milestone
        await client.query(
          `INSERT INTO priority_milestones (
            id, priority_id, title, due_date,
            completed, completed_at,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, NOW(), NOW()
          )`,
          [
            uuidv4(),
            parentPriorityId,
            milestone.title,
            milestone.due_date,
            milestone.completed,
            milestone.completed_at
          ]
        );

        results.milestonesCreated++;
        console.log(`✅ Created milestone: "${milestone.title}" for "${milestone.rocks_name}"`);

      } catch (error) {
        console.error(`❌ Error importing milestone "${milestone.title}":`, error.message);
        results.errors.push({
          milestone: milestone.title,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      results: {
        ...results,
        totalProcessed: transformedPriorities.length,
        quarter: currentQuarter,
        year: currentYear
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