import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { generateMeetingSummaryHTML } from '../services/emailService.js';

// Get paginated list of archived meetings
export const getMeetingHistory = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { 
      team_id, 
      meeting_type, 
      start_date, 
      end_date, 
      search_query, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    // Log all received parameters for debugging
    console.log('📥 Received query parameters:', {
      team_id,
      meeting_type,
      start_date,
      end_date,
      search_query,
      limit,
      offset
    });

    // Ensure user has access to this organization
    console.log('Meeting history access check:', {
      userOrgId: req.user.organization_id,
      requestedOrgId: orgId,
      userId: req.user.id
    });
    
    // Allow access if user's organization matches OR if user is accessing their own org
    // Some users might have organization_id while others have organizationId
    const userOrgId = req.user.organization_id || req.user.organizationId;
    if (userOrgId !== orgId) {
      console.log('Access denied - organization mismatch');
      return res.status(403).json({ 
        error: 'Access denied to this organization',
        debug: {
          userOrgId,
          requestedOrgId: orgId
        }
      });
    }
    
    // CRITICAL SECURITY: Require team_id for access control
    if (!team_id) {
      console.log('🔒 Access denied - team_id is required for security');
      return res.status(400).json({
        error: 'Team selection required',
        message: 'You must specify a team to view meeting history'
      });
    }
    
    // CRITICAL SECURITY: Verify user has access to the requested team
    console.log('🔒 Verifying team access for user:', req.user.id, 'team:', team_id);
    
    const teamAccessQuery = `
      SELECT tm.id, t.name, t.is_leadership_team
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.team_id = $1 
        AND tm.user_id = $2
        AND t.organization_id = $3
    `;
    
    console.log('🎯 About to execute TEAM ACCESS query');
    console.log('Team access query:', teamAccessQuery);
    console.log('Team access params:', [team_id, req.user.id, orgId]);
    const teamAccessResult = await db.query(teamAccessQuery, [team_id, req.user.id, orgId]);
    console.log('✅ TEAM ACCESS query executed successfully');
    
    if (teamAccessResult.rows.length === 0) {
      console.log('🚫 Access denied - user is not a member of team:', team_id);
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to view this team\'s meeting history'
      });
    }
    
    const userTeam = teamAccessResult.rows[0];
    console.log('✅ Access granted - user is member of:', userTeam.name);

    let query = `
      SELECT 
        ms.id,
        ms.meeting_id,
        ms.team_id,
        ms.meeting_type,
        ms.meeting_date,
        ms.duration_minutes,
        ms.average_rating,
        ms.snapshot_data,
        ms.created_at,
        t.name as team_name,
        u.first_name || ' ' || u.last_name as facilitator_name,
        COUNT(*) OVER() as total_count
      FROM meeting_snapshots ms
      LEFT JOIN teams t ON ms.team_id = t.id
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.organization_id = $1
        AND ms.team_id = $2
    `;

    const params = [orgId, team_id];
    let paramCount = 3;

    // Filter by meeting type
    // TEMPORARY DEBUG: Checking if meeting_type filter causes t_1 error
    if (meeting_type) {
      console.log('🚨 DEBUG: Meeting type filter requested:', meeting_type);
      console.log('🚨 DEBUG: TEMPORARILY DISABLED to debug t_1 error');
      // COMMENTED OUT FOR DEBUGGING
      /*
      // Sanitize meeting_type to prevent any SQL injection or weird characters
      const sanitizedMeetingType = String(meeting_type).trim();
      console.log('🔍 Meeting type filter:', {
        original: meeting_type,
        sanitized: sanitizedMeetingType,
        length: sanitizedMeetingType.length
      });
      
      query += ` AND ms.meeting_type = $${paramCount}::text`;
      params.push(sanitizedMeetingType);
      paramCount++;
      */
    }

    // Filter by start date
    if (start_date) {
      console.log('📅 Adding start_date filter:', start_date);
      query += ` AND ms.meeting_date::date >= $${paramCount}::date`;
      params.push(start_date);
      paramCount++;
    }

    // Filter by end date
    if (end_date) {
      console.log('📅 Adding end_date filter:', end_date);
      query += ` AND ms.meeting_date::date <= $${paramCount}::date`;
      params.push(end_date);
      paramCount++;
    }

    // Search in snapshot data (notes, titles, etc.)
    if (search_query) {
      query += ` AND ms.snapshot_data::text ILIKE $${paramCount}`;
      params.push(`%${search_query}%`);
      paramCount++;
    }

    // Order and pagination
    query += ` ORDER BY ms.meeting_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 === FULL SQL QUERY ===');
    console.log('Query string:', query);
    console.log('Parameters:', params);
    console.log('Parameter mapping:');
    params.forEach((param, index) => {
      console.log(`  $${index + 1} = '${param}'`);
    });
    console.log('========================');

    console.log('🎯 About to execute MAIN meeting history query');
    const result = await db.query(query, params);
    console.log('✅ MAIN query executed successfully');
    
    console.log(`Meeting history query returned ${result.rows.length} rows`);
    
    // DIAGNOSTIC: If no results, check what dates exist for this team
    if (result.rows.length === 0 && (start_date || end_date)) {
      console.log('🔍 DIAGNOSTIC: Checking actual dates in database for this team...');
      const diagnosticQuery = `
        SELECT 
          COUNT(*) as total,
          MIN(meeting_date) as earliest_date,
          MAX(meeting_date) as latest_date,
          COUNT(CASE WHEN meeting_date IS NULL THEN 1 END) as null_dates
        FROM meeting_snapshots
        WHERE organization_id = $1 AND team_id = $2
      `;
      console.log('🎯 About to execute DIAGNOSTIC query 1');
      const diagnosticResult = await db.query(diagnosticQuery, [orgId, team_id]);
      console.log('✅ DIAGNOSTIC query 1 executed successfully');
      console.log('📊 Date range in database:', diagnosticResult.rows[0]);
      
      // Also check without date filters
      const withoutDatesQuery = `
        SELECT COUNT(*) as count_without_date_filters
        FROM meeting_snapshots
        WHERE organization_id = $1 AND team_id = $2
      `;
      console.log('🎯 About to execute DIAGNOSTIC query 2');
      const withoutDatesResult = await db.query(withoutDatesQuery, [orgId, team_id]);
      console.log('✅ DIAGNOSTIC query 2 executed successfully');
      console.log('📊 Total meetings without date filters:', withoutDatesResult.rows[0].count_without_date_filters);
    }
    if (result.rows.length > 0) {
      console.log('First row sample:', {
        id: result.rows[0].id,
        meeting_type: result.rows[0].meeting_type,
        team_name: result.rows[0].team_name,
        meeting_date: result.rows[0].meeting_date
      });
    }

    res.json({
      meetings: result.rows,
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Failed to get meeting history:', error);
    console.error('Full error details:', {
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      where: error.where,
      file: error.file,
      line: error.line,
      routine: error.routine
    });
    
    // Log the exact query that failed
    console.error('Failed query was:', query);
    console.error('With parameters:', params);
    
    res.status(500).json({ 
      error: 'Failed to get meeting history',
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      query: query,
      params: params
    });
  }
};

// Get detailed snapshot for specific meeting
export const getMeetingSnapshot = async (req, res) => {
  try {
    const { orgId, id } = req.params;

    // Ensure user has access to this organization
    console.log('Meeting history access check:', {
      userOrgId: req.user.organization_id,
      requestedOrgId: orgId,
      userId: req.user.id
    });
    
    // Allow access if user's organization matches OR if user is accessing their own org
    // Some users might have organization_id while others have organizationId
    const userOrgId = req.user.organization_id || req.user.organizationId;
    if (userOrgId !== orgId) {
      console.log('Access denied - organization mismatch');
      return res.status(403).json({ 
        error: 'Access denied to this organization',
        debug: {
          userOrgId,
          requestedOrgId: orgId
        }
      });
    }

    const query = `
      SELECT 
        ms.*,
        t.name as team_name,
        u.first_name || ' ' || u.last_name as facilitator_name
      FROM meeting_snapshots ms
      LEFT JOIN teams t ON ms.team_id = t.id
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.id = $1 AND ms.organization_id = $2
    `;

    const result = await db.query(query, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting snapshot not found' });
    }
    
    const snapshot = result.rows[0];
    
    // CRITICAL SECURITY: Verify user has access to this team's meetings
    if (snapshot.team_id) {
      const teamAccessQuery = `
        SELECT tm.id
        FROM team_members tm
        WHERE tm.team_id = $1 AND tm.user_id = $2
      `;
      
      const teamAccessResult = await db.query(teamAccessQuery, [snapshot.team_id, req.user.id]);
      
      if (teamAccessResult.rows.length === 0) {
        console.log('🚫 Access denied - user is not a member of team for this snapshot');
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to view this team\'s meeting history'
        });
      }
    }

    res.json(snapshot);

  } catch (error) {
    console.error('Failed to get meeting snapshot:', error);
    res.status(500).json({ error: 'Failed to get meeting snapshot' });
  }
};

// Create snapshot when meeting concludes
export const createMeetingSnapshot = async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { orgId, meetingId } = req.params;

    // Ensure user has access to this organization
    console.log('Meeting history access check:', {
      userOrgId: req.user.organization_id,
      requestedOrgId: orgId,
      userId: req.user.id
    });
    
    // Allow access if user's organization matches OR if user is accessing their own org
    // Some users might have organization_id while others have organizationId
    const userOrgId = req.user.organization_id || req.user.organizationId;
    if (userOrgId !== orgId) {
      console.log('Access denied - organization mismatch');
      return res.status(403).json({ 
        error: 'Access denied to this organization',
        debug: {
          userOrgId,
          requestedOrgId: orgId
        }
      });
    }

    await client.query('BEGIN');

    // Get meeting details
    const meetingQuery = `
      SELECT 
        m.*,
        t.name as team_name
      FROM meetings m
      JOIN teams t ON m.team_id = t.id
      WHERE m.id = $1 AND m.organization_id = $2
    `;
    
    const meetingResult = await client.query(meetingQuery, [meetingId, orgId]);
    
    if (meetingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Check if snapshot already exists
    const existingSnapshot = await client.query(
      'SELECT id FROM meeting_snapshots WHERE meeting_id = $1 AND organization_id = $2',
      [meetingId, orgId]
    );

    if (existingSnapshot.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Meeting snapshot already exists' });
    }

    // Calculate duration and meeting timeframe
    const now = new Date();
    const startTime = new Date(meeting.started_at);
    const duration = Math.round((now - startTime) / (1000 * 60)); // minutes

    // Get attendees with ratings
    const attendeesQuery = `
      SELECT 
        mp.user_id,
        u.first_name || ' ' || u.last_name as name,
        mp.rating,
        mp.joined_at IS NOT NULL as attended
      FROM meeting_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meeting_id = $1
    `;
    const attendeesResult = await client.query(attendeesQuery, [meetingId]);

    // Calculate average rating
    const ratingsWithValues = attendeesResult.rows.filter(a => a.rating !== null);
    const averageRating = ratingsWithValues.length > 0 
      ? ratingsWithValues.reduce((sum, a) => sum + a.rating, 0) / ratingsWithValues.length
      : null;

    // Get issues created during meeting
    const issuesCreatedQuery = `
      SELECT id, title, priority_rank as priority, created_by_id as created_by
      FROM issues
      WHERE meeting_id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const issuesCreated = await client.query(issuesCreatedQuery, [meetingId, orgId]);

    // Get issues discussed (from junction table if it exists, otherwise approximate)
    const issuesDiscussedQuery = `
      SELECT i.id, i.title, i.status
      FROM issues i
      WHERE i.team_id = $1 
        AND i.organization_id = $2 
        AND i.updated_at BETWEEN $3 AND $4
        AND i.deleted_at IS NULL
        AND i.meeting_id IS NULL
    `;
    const issuesDiscussed = await client.query(issuesDiscussedQuery, [
      meeting.team_id, orgId, startTime, now
    ]);

    // Get issues solved during meeting
    const issuesSolvedQuery = `
      SELECT id, title, resolution_notes as solution, resolved_at as solved_at
      FROM issues
      WHERE status = 'closed' 
        AND resolved_at BETWEEN $1 AND $2
        AND team_id = $3
        AND organization_id = $4
        AND deleted_at IS NULL
    `;
    const issuesSolved = await client.query(issuesSolvedQuery, [
      startTime, now, meeting.team_id, orgId
    ]);

    // Get todos created during meeting
    const todosCreatedQuery = `
      SELECT 
        t.id, 
        t.title, 
        t.assigned_to_id as assignee_id,
        u.first_name || ' ' || u.last_name as assignee_name,
        t.due_date
      FROM todos t
      LEFT JOIN users u ON t.assigned_to_id = u.id
      WHERE t.meeting_id = $1 AND t.organization_id = $2 AND t.deleted_at IS NULL
    `;
    const todosCreated = await client.query(todosCreatedQuery, [meetingId, orgId]);

    // Get todos completed during meeting
    const todosCompletedQuery = `
      SELECT id, title, assigned_to_id as completed_by
      FROM todos
      WHERE status = 'complete' 
        AND updated_at BETWEEN $1 AND $2
        AND team_id = $3
        AND organization_id = $4
        AND deleted_at IS NULL
    `;
    const todosCompleted = await client.query(todosCompletedQuery, [
      startTime, now, meeting.team_id, orgId
    ]);

    // Fetch AI summary if available
    const aiSummaryQuery = `
      SELECT mas.executive_summary
      FROM meeting_ai_summaries mas
      JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
      WHERE mt.meeting_id = $1
      ORDER BY mas.created_at DESC
      LIMIT 1
    `;
    const aiSummaryResult = await client.query(aiSummaryQuery, [meetingId]);
    const aiSummary = aiSummaryResult.rows[0]?.executive_summary || null;

    // Build snapshot data with correct field names
    const snapshotData = {
      attendees: attendeesResult.rows,
      notes: meeting.notes || '',
      aiSummary: aiSummary,  // Add AI summary
      issues: {
        new: issuesCreated.rows,      // Renamed from 'created' to match template
        discussed: issuesDiscussed.rows,
        solved: issuesSolved.rows
      },
      todos: {
        added: todosCreated.rows,     // Renamed from 'created' to match template
        completed: todosCompleted.rows
      },
      conclusions: {
        key_decisions: [],
        next_steps: [],
        parking_lot: []
      }
    };

    // Create snapshot record
    const snapshotQuery = `
      INSERT INTO meeting_snapshots (
        id,
        meeting_id,
        organization_id,
        team_id,
        facilitator_id,
        meeting_type,
        meeting_date,
        duration_minutes,
        average_rating,
        snapshot_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const snapshotId = uuidv4();
    const snapshotValues = [
      snapshotId,
      meetingId,
      orgId,
      meeting.team_id,
      meeting.facilitator_id,
      meeting.meeting_type,
      meeting.started_at,
      duration,
      averageRating,
      JSON.stringify(snapshotData)
    ];

    const snapshotResult = await client.query(snapshotQuery, snapshotValues);

    // Update meeting record
    const updateMeetingQuery = `
      UPDATE meetings 
      SET 
        is_archived = true,
        archived_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
    `;
    
    await client.query(updateMeetingQuery, [meetingId, orgId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Meeting snapshot created successfully',
      snapshot: snapshotResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create meeting snapshot:', error);
    res.status(500).json({ error: 'Failed to create meeting snapshot' });
  } finally {
    client.release();
  }
};

// Update notes in meeting snapshot
export const updateMeetingNotes = async (req, res) => {
  try {
    const { orgId, id } = req.params;
    const { notes } = req.body;

    // Ensure user has access to this organization
    console.log('Meeting history access check:', {
      userOrgId: req.user.organization_id,
      requestedOrgId: orgId,
      userId: req.user.id
    });
    
    // Allow access if user's organization matches OR if user is accessing their own org
    // Some users might have organization_id while others have organizationId
    const userOrgId = req.user.organization_id || req.user.organizationId;
    if (userOrgId !== orgId) {
      console.log('Access denied - organization mismatch');
      return res.status(403).json({ 
        error: 'Access denied to this organization',
        debug: {
          userOrgId,
          requestedOrgId: orgId
        }
      });
    }

    const query = `
      UPDATE meeting_snapshots
      SET 
        snapshot_data = jsonb_set(
          snapshot_data, 
          '{notes}', 
          $3
        ),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, orgId, JSON.stringify(notes)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting snapshot not found' });
    }

    res.json({
      message: 'Notes updated successfully',
      snapshot: result.rows[0]
    });

  } catch (error) {
    console.error('Failed to update meeting notes:', error);
    res.status(500).json({ error: 'Failed to update meeting notes' });
  }
};

// Export meeting history to CSV
export const exportMeetingHistoryCSV = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { 
      team_id, 
      meeting_type, 
      start_date, 
      end_date, 
      search_query 
    } = req.query;

    // Ensure user has access to this organization
    console.log('Meeting history access check:', {
      userOrgId: req.user.organization_id,
      requestedOrgId: orgId,
      userId: req.user.id
    });
    
    // Allow access if user's organization matches OR if user is accessing their own org
    // Some users might have organization_id while others have organizationId
    const userOrgId = req.user.organization_id || req.user.organizationId;
    if (userOrgId !== orgId) {
      console.log('Access denied - organization mismatch');
      return res.status(403).json({ 
        error: 'Access denied to this organization',
        debug: {
          userOrgId,
          requestedOrgId: orgId
        }
      });
    }

    // Use same filtering logic as getMeetingHistory but without pagination
    let query = `
      SELECT 
        ms.meeting_date,
        t.name as team_name,
        ms.meeting_type,
        ms.duration_minutes,
        ms.average_rating,
        u.first_name || ' ' || u.last_name as facilitator_name,
        ms.snapshot_data
      FROM meeting_snapshots ms
      LEFT JOIN teams t ON ms.team_id = t.id
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.organization_id = $1
    `;

    const params = [orgId];
    let paramCount = 2;

    // Apply same filters as getMeetingHistory
    if (team_id) {
      query += ` AND ms.team_id = $${paramCount}`;
      params.push(team_id);
      paramCount++;
    }

    if (meeting_type) {
      query += ` AND ms.meeting_type = $${paramCount}`;
      params.push(meeting_type);
      paramCount++;
    }

    if (start_date) {
      query += ` AND ms.meeting_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND ms.meeting_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (search_query) {
      query += ` AND ms.snapshot_data::text ILIKE $${paramCount}`;
      params.push(`%${search_query}%`);
      paramCount++;
    }

    query += ` ORDER BY ms.meeting_date DESC`;

    const result = await db.query(query, params);

    // Build CSV content
    const headers = [
      'Date',
      'Team', 
      'Type',
      'Duration (min)',
      'Rating',
      'Facilitator',
      'Issues Created',
      'Issues Solved',
      'Todos Created', 
      'Todos Completed'
    ];

    let csvContent = headers.join(',') + '\n';

    result.rows.forEach(row => {
      const snapshotData = typeof row.snapshot_data === 'string' 
        ? JSON.parse(row.snapshot_data) 
        : row.snapshot_data;

      const csvRow = [
        new Date(row.meeting_date).toLocaleDateString(),
        `"${row.team_name || ''}"`,
        `"${row.meeting_type || ''}"`,
        row.duration_minutes || 0,
        row.average_rating || '',
        `"${row.facilitator_name || ''}"`,
        snapshotData?.issues?.created?.length || 0,
        snapshotData?.issues?.solved?.length || 0,
        snapshotData?.todos?.created?.length || 0,
        snapshotData?.todos?.completed?.length || 0
      ];

      csvContent += csvRow.join(',') + '\n';
    });

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="meeting-history.csv"');
    
    res.send(csvContent);

  } catch (error) {
    console.error('Failed to export meeting history:', error);
    res.status(500).json({ error: 'Failed to export meeting history' });
  }
};

// Get meeting summary HTML for viewing
export const getMeetingSummaryHTML = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const orgId = req.user.organization_id || req.user.organizationId;

    console.log('📄 Generating meeting summary HTML for:', { orgId, meetingId });

    // First try to fetch snapshot, if not found, fall back to basic meeting record
    const [snapshotResult, orgResult] = await Promise.all([
      db.query(`
        SELECT 
          ms.*,
          t.name as team_name,
          u.first_name || ' ' || u.last_name as facilitator_name
        FROM meeting_snapshots ms
        LEFT JOIN teams t ON ms.team_id = t.id
        LEFT JOIN users u ON ms.facilitator_id = u.id
        WHERE ms.meeting_id = $1 AND ms.organization_id = $2
      `, [meetingId, orgId]),
      
      db.query(`
        SELECT name, theme_primary_color, theme_secondary_color, theme_accent_color 
        FROM organizations 
        WHERE id = $1
      `, [orgId])
    ]);

    let meetingData;
    let snapshotData = {};

    if (snapshotResult.rows.length === 0) {
      console.log('📄 No snapshot found, checking for basic meeting record...');
      
      // Try to get basic meeting information
      const basicMeetingResult = await db.query(`
        SELECT 
          m.*,
          t.name as team_name,
          u.first_name || ' ' || u.last_name as facilitator_name
        FROM meetings m
        LEFT JOIN teams t ON m.team_id = t.id
        LEFT JOIN users u ON m.facilitator_id = u.id
        WHERE m.id = $1 AND m.organization_id = $2
      `, [meetingId, orgId]);

      if (basicMeetingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      meetingData = basicMeetingResult.rows[0];
      snapshotData = {}; // No snapshot data available
      
      console.log('📄 Using basic meeting record without snapshot');
    } else {
      meetingData = snapshotResult.rows[0];
      snapshotData = meetingData.snapshot_data || {};
      console.log('📄 Using meeting snapshot data');
    }

    const orgData = orgResult.rows[0];

    console.log('📄 Meeting data retrieved:', {
      id: meetingData.id,
      teamName: meetingData.team_name,
      meetingType: meetingData.meeting_type,
      meetingDate: meetingData.meeting_date || meetingData.started_at,
      themeColor: orgData?.theme_primary_color || '#6366f1',
      hasSnapshot: !!snapshotData.issues
    });

    // Format data for simplified template
    const formattedData = {
      teamName: meetingData.team_name || 'Unknown Team',
      meetingType: meetingData.meeting_type || 'Team Meeting',
      meetingDate: meetingData.meeting_date || meetingData.started_at || new Date().toISOString(),
      duration: meetingData.duration_minutes || (meetingData.started_at && meetingData.completed_at ? 
        Math.round((new Date(meetingData.completed_at) - new Date(meetingData.started_at)) / (1000 * 60)) : 60),
      rating: meetingData.average_rating,
      facilitatorName: meetingData.facilitator_name,
      organizationName: orgData?.name || 'Organization',
      themeColor: orgData?.theme_primary_color || '#6366f1', // Use org theme
      
      aiSummary: snapshotData.ai_summary || snapshotData.aiSummary || snapshotData.meetingSummary || 
                 'No detailed summary available for this meeting.',
      headlines: snapshotData.headlines || { customer: [], employee: [] },
      cascadingMessages: snapshotData.cascading_messages || snapshotData.cascadingMessages || [],
      
      issues: {
        solved: snapshotData.issues?.solved || [],
        new: snapshotData.issues?.new || snapshotData.issues?.created || []  // Support both field names
      },
      
      todos: {
        completed: snapshotData.todos?.completed || [],
        new: snapshotData.todos?.added || snapshotData.todos?.created || []  // Support both field names
      },
      
      attendees: snapshotData.attendees || [],
      
      // Add flag to indicate if this is a basic meeting without snapshot
      isBasicMeeting: !snapshotData.issues
    };

    console.log('📄 Formatted data for template:', {
      teamName: formattedData.teamName,
      organizationName: formattedData.organizationName,
      themeColor: formattedData.themeColor,
      hasIssues: formattedData.issues.solved.length + formattedData.issues.new.length,
      hasTodos: formattedData.todos.completed.length + formattedData.todos.new.length
    });

    // Generate HTML using simplified template
    const html = generateMeetingSummaryHTML(formattedData);

    // Send raw HTML (browser will render it)
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Error generating meeting summary HTML:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};