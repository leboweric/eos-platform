import { query } from '../config/database.js';

// Default Level 10 section configuration
const DEFAULT_LEVEL_10_SECTIONS = [
  { id: 'segue', name: 'Segue', duration: 5, icon: 'Users', order: 1 },
  { id: 'scorecard', name: 'Scorecard', duration: 5, icon: 'TrendingUp', order: 2 },
  { id: 'rock_review', name: 'Rock Review', duration: 5, icon: 'Target', order: 3 },
  { id: 'headlines', name: 'Headlines', duration: 5, icon: 'Newspaper', order: 4 },
  { id: 'todos', name: 'To-Do Review', duration: 5, icon: 'CheckSquare', order: 5 },
  { id: 'ids', name: 'IDS', duration: 60, icon: 'MessageSquare', order: 6 },
  { id: 'conclude', name: 'Conclude', duration: 5, icon: 'CheckCircle', order: 7 }
];

// Start a new meeting session
export const startMeetingSession = async (req, res) => {
  try {
    const { organizationId, teamId, meetingType = 'weekly' } = req.body;
    const userId = req.user.id;

    // End any existing active sessions for this team
    await query(
      `UPDATE meeting_sessions 
       SET is_active = false 
       WHERE team_id = $1 AND is_active = true`,
      [teamId]
    );

    // Create new session
    const result = await query(
      `INSERT INTO meeting_sessions (
        organization_id, team_id, meeting_type, 
        facilitator_id, current_section, section_timings
      )
      VALUES ($1, $2, $3, $4, 'segue', '{}'::jsonb)
      RETURNING *`,
      [organizationId, teamId, meetingType, userId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error starting meeting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start meeting session'
    });
  }
};

// Start tracking a specific section
export const startSection = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    // Accept both snake_case and camelCase parameter names
    const sectionId = req.body.sectionId || req.body.section_id;
    
    // Map frontend section IDs to backend IDs
    const sectionIdMap = {
      // Frontend ID → Backend ID
      'good-news': 'segue',
      'good_news': 'segue',
      'priorities': 'rock_review',
      'priority': 'rock_review',
      'rocks': 'rock_review',
      'rock': 'rock_review',
      'todo-list': 'todos',
      'todo_list': 'todos',
      'todo': 'todos',
      'issues': 'ids',
      'issue': 'ids',
      'problems': 'ids',
      'problem': 'ids'
    };
    const mappedSectionId = sectionIdMap[sectionId] || sectionId;
    
    console.log('🔄 [Section Mapping]', {
      received: sectionId,
      mapped: mappedSectionId,
      mapUsed: sectionIdMap
    });
    
    console.log('🔍 [startSection] Request details:', {
      sessionId,
      sectionId,
      body: req.body,
      params: req.params
    });

    // Get section configuration
    const configResult = await query(
      `SELECT sections FROM meeting_section_configs
       WHERE organization_id = (
         SELECT organization_id FROM meeting_sessions WHERE id = $1
       )
       AND meeting_type = 'weekly'
       AND is_default = true
       LIMIT 1`,
      [sessionId]
    );

    const sections = configResult.rows[0]?.sections || DEFAULT_LEVEL_10_SECTIONS;
    
    console.log('📋 [Available Sections]', {
      allAvailableIds: sections.map(s => s.id),
      lookingFor: mappedSectionId,
      configSource: configResult.rows[0] ? 'database' : 'default'
    });
    
    const sectionConfig = sections.find(s => s.id === mappedSectionId);
    
    if (!sectionConfig) {
      console.error('❌ [startSection] Invalid section ID:', {
        originalSectionId: sectionId,
        mappedSectionId,
        availableSections: sections.map(s => ({ id: s.id, name: s.name })),
        configFound: !!configResult.rows[0]
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid section ID',
        details: {
          originalSectionId: sectionId,
          mappedSectionId,
          availableSections: sections.map(s => s.id)
        }
      });
    }

    // End current section if exists
    const currentResult = await query(
      `SELECT current_section, section_timings 
       FROM meeting_sessions 
       WHERE id = $1`,
      [sessionId]
    );

    const currentSession = currentResult.rows[0];
    
    // Defensive parsing: handle both string and object cases
    let sectionTimings = currentSession.section_timings;
    if (typeof sectionTimings === 'string') {
      try {
        sectionTimings = JSON.parse(sectionTimings);
      } catch (e) {
        console.warn('⚠️ [startSection] Failed to parse section_timings string:', sectionTimings);
        sectionTimings = {};
      }
    }
    sectionTimings = sectionTimings || {};
    
    console.log('🔧 [Section Timings Debug]', {
      originalType: typeof currentSession.section_timings,
      originalValue: currentSession.section_timings,
      parsedValue: sectionTimings,
      hasData: Object.keys(sectionTimings).length > 0
    });

    // If there's a current section that's different, end it
    if (currentSession.current_section && currentSession.current_section !== mappedSectionId) {
      const currentSectionData = sectionTimings[currentSession.current_section] || {};
      if (currentSectionData.started_at && !currentSectionData.ended_at) {
        currentSectionData.ended_at = new Date().toISOString();
        currentSectionData.actual = Math.floor(
          (new Date(currentSectionData.ended_at) - new Date(currentSectionData.started_at)) / 1000
        );
        if (currentSectionData.actual > currentSectionData.allocated) {
          currentSectionData.overrun = currentSectionData.actual - currentSectionData.allocated;
        }
        sectionTimings[currentSession.current_section] = currentSectionData;
      }
    }

    // Start new section
    sectionTimings[mappedSectionId] = {
      allocated: sectionConfig.duration * 60, // Convert minutes to seconds
      started_at: new Date().toISOString(),
      ended_at: null,
      actual: 0,
      paused_duration: 0
    };

    // Update session
    const updateResult = await query(
      `UPDATE meeting_sessions 
       SET current_section = $1,
           current_section_start = NOW(),
           section_timings = $2,
           sections_completed = array_append(
             COALESCE(sections_completed, '{}'), $3
           )
       WHERE id = $4
       RETURNING *`,
      [mappedSectionId, JSON.stringify(sectionTimings), mappedSectionId, sessionId]
    );

    res.json({
      success: true,
      data: {
        session: updateResult.rows[0],
        sectionConfig
      }
    });
  } catch (error) {
    console.error('Error starting section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start section'
    });
  }
};

// End current section
export const endSection = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    // Accept both snake_case and camelCase parameter names
    const sectionId = req.body.sectionId || req.body.section_id;
    
    // Map frontend section IDs to backend IDs
    const sectionIdMap = {
      // Frontend ID → Backend ID
      'good-news': 'segue',
      'good_news': 'segue',
      'priorities': 'rock_review',
      'priority': 'rock_review',
      'rocks': 'rock_review',
      'rock': 'rock_review',
      'todo-list': 'todos',
      'todo_list': 'todos',
      'todo': 'todos',
      'issues': 'ids',
      'issue': 'ids',
      'problems': 'ids',
      'problem': 'ids'
    };
    const mappedSectionId = sectionIdMap[sectionId] || sectionId;
    
    console.log('🔄 [Section Mapping]', {
      received: sectionId,
      mapped: mappedSectionId,
      mapUsed: sectionIdMap
    });
    
    console.log('🔍 [endSection] Request details:', {
      sessionId,
      sectionId,
      body: req.body,
      params: req.params
    });

    const result = await query(
      `SELECT current_section, section_timings 
       FROM meeting_sessions 
       WHERE id = $1`,
      [sessionId]
    );

    const session = result.rows[0];
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Defensive parsing: handle both string and object cases
    let sectionTimings = session.section_timings;
    if (typeof sectionTimings === 'string') {
      try {
        sectionTimings = JSON.parse(sectionTimings);
      } catch (e) {
        console.warn('⚠️ [endSection] Failed to parse section_timings string:', sectionTimings);
        sectionTimings = {};
      }
    }
    sectionTimings = sectionTimings || {};
    
    console.log('🔧 [Section Timings Debug]', {
      originalType: typeof session.section_timings,
      originalValue: session.section_timings,
      parsedValue: sectionTimings,
      hasData: Object.keys(sectionTimings).length > 0
    });
    
    const sectionData = sectionTimings[mappedSectionId];

    if (!sectionData || !sectionData.started_at) {
      console.error('❌ [endSection] Section not started:', {
        originalSectionId: sectionId,
        mappedSectionId,
        sectionData,
        sectionTimings,
        sessionExists: !!session,
        availableSections: Object.keys(sectionTimings)
      });
      return res.status(400).json({
        success: false,
        error: 'Section not started',
        details: {
          originalSectionId: sectionId,
          mappedSectionId,
          hasSection: !!sectionData,
          hasStartTime: !!sectionData?.started_at,
          availableSections: Object.keys(sectionTimings)
        }
      });
    }

    // Calculate actual duration
    sectionData.ended_at = new Date().toISOString();
    sectionData.actual = Math.floor(
      (new Date(sectionData.ended_at) - new Date(sectionData.started_at)) / 1000
    ) - sectionData.paused_duration;

    // Calculate overrun if applicable
    if (sectionData.actual > sectionData.allocated) {
      sectionData.overrun = sectionData.actual - sectionData.allocated;
    }

    sectionTimings[mappedSectionId] = sectionData;

    // Update session
    const updateResult = await query(
      `UPDATE meeting_sessions 
       SET section_timings = $1
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(sectionTimings), sessionId]
    );

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error ending section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end section'
    });
  }
};

// Get current session status with section timing
export const getSessionStatus = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    const result = await query(
      `SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds,
        u.first_name || ' ' || u.last_name as facilitator_name
       FROM meeting_sessions ms
       LEFT JOIN users u ON ms.facilitator_id = u.id
       WHERE ms.id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const session = result.rows[0];

    // Get section configuration
    const configResult = await query(
      `SELECT sections FROM meeting_section_configs
       WHERE organization_id = $1
       AND meeting_type = $2
       AND is_default = true
       LIMIT 1`,
      [session.organization_id, session.meeting_type]
    );

    const sections = configResult.rows[0]?.sections || DEFAULT_LEVEL_10_SECTIONS;

    // Calculate current section duration if in progress
    let currentSectionDuration = 0;
    if (session.current_section && session.section_timings[session.current_section]) {
      const currentSection = session.section_timings[session.current_section];
      if (currentSection.started_at && !currentSection.ended_at) {
        currentSectionDuration = Math.floor(
          (Date.now() - new Date(currentSection.started_at).getTime()) / 1000
        ) - (currentSection.paused_duration || 0);
        
        // Account for meeting-wide pause
        if (session.is_paused && session.last_pause_time) {
          const pauseDuration = Math.floor(
            (Date.now() - new Date(session.last_pause_time).getTime()) / 1000
          );
          currentSectionDuration -= pauseDuration;
        }
      }
    }

    res.json({
      success: true,
      data: {
        session,
        sections,
        currentSectionDuration,
        meetingPace: calculateMeetingPace(session.section_timings, sections)
      }
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session status'
    });
  }
};

// Update section timing when pausing/resuming
export const updateSectionPause = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { isPaused } = req.body;

    const result = await query(
      `SELECT current_section, section_timings, is_paused, last_pause_time
       FROM meeting_sessions 
       WHERE id = $1`,
      [sessionId]
    );

    const session = result.rows[0];
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Defensive parsing: handle both string and object cases  
    let sectionTimings = session.section_timings;
    if (typeof sectionTimings === 'string') {
      try {
        sectionTimings = JSON.parse(sectionTimings);
      } catch (e) {
        console.warn('⚠️ [updateSectionPause] Failed to parse section_timings string:', sectionTimings);
        sectionTimings = {};
      }
    }
    sectionTimings = sectionTimings || {};

    // Update current section's paused duration
    if (session.current_section && sectionTimings[session.current_section]) {
      const currentSection = sectionTimings[session.current_section];
      
      if (!isPaused && session.is_paused && session.last_pause_time) {
        // Resuming - add pause duration to current section
        const pauseDuration = Math.floor(
          (Date.now() - new Date(session.last_pause_time).getTime()) / 1000
        );
        currentSection.paused_duration = (currentSection.paused_duration || 0) + pauseDuration;
        sectionTimings[session.current_section] = currentSection;
      }
    }

    // Update session
    const updateResult = await query(
      `UPDATE meeting_sessions 
       SET section_timings = $1
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(sectionTimings), sessionId]
    );

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating section pause:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update section pause'
    });
  }
};

// Helper function to calculate meeting pace
function calculateMeetingPace(sectionTimings, sections) {
  let totalAllocated = 0;
  let totalActual = 0;
  let completedSections = 0;

  for (const section of sections) {
    const timing = sectionTimings[section.id];
    if (timing) {
      totalAllocated += timing.allocated || 0;
      if (timing.actual !== undefined) {
        totalActual += timing.actual;
        completedSections++;
      } else if (timing.started_at) {
        // Section in progress
        const current = Math.floor(
          (Date.now() - new Date(timing.started_at).getTime()) / 1000
        ) - (timing.paused_duration || 0);
        totalActual += current;
      }
    }
  }

  if (totalAllocated === 0) {
    return 'on-track';
  }

  const deviationPercentage = ((totalActual - totalAllocated) / totalAllocated) * 100;

  if (deviationPercentage > 20) {
    return 'critical';
  } else if (deviationPercentage > 10) {
    return 'behind';
  } else if (deviationPercentage < -5) {
    return 'ahead';
  } else {
    return 'on-track';
  }
}

// Get section configuration for a team
export const getSectionConfig = async (req, res) => {
  try {
    const { organizationId, teamId } = req.params;

    // Try team-specific config first, then org default
    const result = await query(
      `SELECT * FROM meeting_section_configs
       WHERE (
         (organization_id = $1 AND team_id = $2) OR
         (organization_id = $1 AND team_id IS NULL AND is_default = true)
       )
       AND meeting_type = 'weekly'
       ORDER BY team_id DESC NULLS LAST
       LIMIT 1`,
      [organizationId, teamId]
    );

    const config = result.rows[0];
    
    res.json({
      success: true,
      data: config ? config.sections : DEFAULT_LEVEL_10_SECTIONS
    });
  } catch (error) {
    console.error('Error getting section config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get section configuration'
    });
  }
};