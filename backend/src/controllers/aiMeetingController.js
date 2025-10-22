import aiTranscriptionService from '../services/aiTranscriptionService.js';
import db from '../config/database.js';

export const startTranscription = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { consent_user_ids = [] } = req.body;
    const userId = req.user.id;

    // Verify user has access to this meeting
    const client = await db.getClient();
    let meeting;
    try {
      const meetingResult = await client.query(`
        SELECT m.*, t.name as team_name
        FROM meetings m
        INNER JOIN teams t ON m.team_id = t.id
        WHERE m.id = $1 AND m.organization_id = $2
      `, [meetingId, orgId]);

      if (meetingResult.rows.length === 0) {
        return res.status(404).json({ message: 'Meeting not found' });
      }

      meeting = meetingResult.rows[0];

      // Check if user is member of this team or organization admin
      const accessResult = await client.query(`
        SELECT tm.user_id, u.role
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1 AND tm.user_id = $2
        UNION
        SELECT u.id as user_id, u.role
        FROM users u
        WHERE u.organization_id = $1 AND u.id = $2 AND u.role = 'admin'
      `, [meeting.team_id, userId]);

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } finally {
      client.release();
    }

    // Get or create transcript record (handles existing check + creation atomically)
    console.log('🔍 [AI-Meeting] Getting or creating transcript record...');
    const transcript = await aiTranscriptionService.getOrCreateTranscript(
      meetingId, 
      orgId, 
      consent_user_ids
    );
    
    console.log('🆔 [AI-Meeting] Using transcript ID:', transcript.id);

    // Start real-time transcription
    const realtimeTranscriber = await aiTranscriptionService.startRealtimeTranscription(transcript.id);

    // Update meeting record
    const client2 = await db.getClient();
    try {
      await client2.query(`
        UPDATE meetings 
        SET transcription_enabled = true, 
            transcription_started_at = NOW(),
            transcription_consent_obtained = $3
        WHERE id = $1 AND organization_id = $2
      `, [meetingId, orgId, consent_user_ids.length > 0]);
    } finally {
      client2.release();
    }

    // Log the access
    await aiTranscriptionService.logTranscriptAccess(
      transcript.id,
      userId,
      orgId,
      'start_transcription',
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      transcript_id: transcript.id,
      status: 'started',
      session_id: realtimeTranscriber.sessionId,
      websocket_url: `wss://${req.get('host')}/transcription/${transcript.id}`,
      message: 'Transcription started successfully'
    });

  } catch (error) {
    console.error('Failed to start transcription:', error);
    res.status(500).json({ 
      message: 'Failed to start transcription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const stopTranscription = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { final_transcript, structured_transcript } = req.body;
    const userId = req.user.id;

    // Get the active transcript
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (!transcript) {
      return res.status(404).json({ message: 'No active transcription found' });
    }

    if (transcript.status !== 'processing') {
      return res.status(400).json({ message: 'Transcription is not active' });
    }

    // Log the access
    await aiTranscriptionService.logTranscriptAccess(
      transcript.id,
      userId,
      orgId,
      'stop_transcription',
      req.ip,
      req.get('User-Agent')
    );

    // Update transcript status to processing AI summary
    await aiTranscriptionService.updateTranscriptStatus(transcript.id, 'processing_ai');

    // AI processing is now handled automatically by transcriptionService.triggerAIAnalysis()
    console.log('[aiMeetingController] AI processing handled by transcriptionService - skipping duplicate analysis');

    res.json({
      status: 'processing',
      message: 'Transcription stopped, generating AI summary...',
      transcript_id: transcript.id
    });

  } catch (error) {
    console.error('Failed to stop transcription:', error);
    res.status(500).json({ 
      message: 'Failed to stop transcription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getTranscript = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const userId = req.user.id;

    // Get transcript
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    // Log the access
    await aiTranscriptionService.logTranscriptAccess(
      transcript.id,
      userId,
      orgId,
      'view',
      req.ip,
      req.get('User-Agent')
    );

    // Structure the response
    const response = {
      transcript_id: transcript.id,
      meeting_id: transcript.meeting_id,
      status: transcript.status,
      raw_transcript: transcript.raw_transcript,
      structured_transcript: transcript.transcript_json,
      word_count: transcript.word_count,
      duration_seconds: transcript.audio_duration_seconds,
      created_at: transcript.created_at,
      processing_completed_at: transcript.processing_completed_at
    };

    res.json(response);

  } catch (error) {
    console.error('Failed to get transcript:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve transcript',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getAISummary = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const userId = req.user.id;

    // Get transcript and AI summary
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    if (!transcript.executive_summary) {
      return res.status(404).json({ message: 'AI summary not yet available' });
    }

    // Log the access
    await aiTranscriptionService.logTranscriptAccess(
      transcript.id,
      userId,
      orgId,
      'view_summary',
      req.ip,
      req.get('User-Agent')
    );

    // Structure the response
    const response = {
      meeting_id: transcript.meeting_id,
      transcript_id: transcript.id,
      executive_summary: transcript.executive_summary,
      key_decisions: transcript.key_decisions,
      action_items: transcript.action_items,
      issues_discussed: transcript.issues_discussed,
      rocks_mentioned: transcript.rocks_mentioned,
      discussion_topics: transcript.discussion_topics,
      notable_quotes: transcript.notable_quotes,
      meeting_sentiment: transcript.meeting_sentiment,
      meeting_energy_score: transcript.meeting_energy_score,
      ai_model: transcript.ai_model,
      ai_processing_time_seconds: transcript.ai_processing_time_seconds,
      ai_cost_usd: transcript.ai_cost_usd,
      created_at: transcript.created_at
    };

    res.json(response);

  } catch (error) {
    console.error('Failed to get AI summary:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve AI summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createTodosFromAI = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { action_item_ids } = req.body;
    const userId = req.user.id;

    if (!action_item_ids || !Array.isArray(action_item_ids)) {
      return res.status(400).json({ message: 'action_item_ids array is required' });
    }

    // Create todos from AI action items
    const todoIds = await aiTranscriptionService.createTodosFromActionItems(
      meetingId,
      orgId,
      action_item_ids,
      userId
    );

    // Log the access
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (transcript) {
      await aiTranscriptionService.logTranscriptAccess(
        transcript.id,
        userId,
        orgId,
        'create_todos',
        req.ip,
        req.get('User-Agent')
      );
    }

    res.json({
      todos_created: todoIds.length,
      todo_ids: todoIds,
      message: `${todoIds.length} todos created from AI action items`
    });

  } catch (error) {
    console.error('Failed to create todos from AI:', error);
    res.status(500).json({ 
      message: 'Failed to create todos from AI action items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createIssuesFromAI = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { issue_ids } = req.body;
    const userId = req.user.id;

    if (!issue_ids || !Array.isArray(issue_ids)) {
      return res.status(400).json({ message: 'issue_ids array is required' });
    }

    // Create issues from AI detection
    const issueIds = await aiTranscriptionService.createIssuesFromAIDetection(
      meetingId,
      orgId,
      issue_ids,
      userId
    );

    // Log the access
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (transcript) {
      await aiTranscriptionService.logTranscriptAccess(
        transcript.id,
        userId,
        orgId,
        'create_issues',
        req.ip,
        req.get('User-Agent')
      );
    }

    res.json({
      issues_created: issueIds.length,
      issue_ids: issueIds,
      message: `${issueIds.length} issues created from AI detection`
    });

  } catch (error) {
    console.error('Failed to create issues from AI:', error);
    res.status(500).json({ 
      message: 'Failed to create issues from AI detection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const searchTranscripts = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { q: query, team_id, start_date, end_date, limit = 50 } = req.query;
    const userId = req.user.id;

    // Search transcripts
    const results = await aiTranscriptionService.searchTranscripts(
      orgId,
      query,
      {
        teamId: team_id,
        startDate: start_date,
        endDate: end_date,
        limit: parseInt(limit)
      }
    );

    res.json({
      query,
      results_count: results.length,
      results: results.map(result => ({
        meeting_id: result.meeting_id,
        meeting_date: result.meeting_date,
        meeting_type: result.meeting_type,
        team_name: result.team_name,
        summary: result.executive_summary?.substring(0, 200) + '...',
        transcript_excerpt: result.raw_transcript?.substring(0, 300) + '...',
        action_items_count: result.action_items?.length || 0,
        issues_count: result.issues_discussed?.length || 0
      }))
    });

  } catch (error) {
    console.error('Failed to search transcripts:', error);
    res.status(500).json({ 
      message: 'Failed to search transcripts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const downloadTranscript = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { format = 'txt' } = req.query;
    const userId = req.user.id;

    // Get transcript
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    if (!transcript.raw_transcript) {
      return res.status(404).json({ message: 'Transcript content not available' });
    }

    // Log the access
    await aiTranscriptionService.logTranscriptAccess(
      transcript.id,
      userId,
      orgId,
      'download',
      req.ip,
      req.get('User-Agent')
    );

    // Get meeting info for filename
    const client = await db.getClient();
    let meetingInfo;
    try {
      const meetingResult = await client.query(`
        SELECT m.meeting_date, m.meeting_type, t.name as team_name
        FROM meetings m
        INNER JOIN teams t ON m.team_id = t.id
        WHERE m.id = $1
      `, [meetingId]);
      meetingInfo = meetingResult.rows[0];
    } finally {
      client.release();
    }

    const date = new Date(meetingInfo.meeting_date).toISOString().split('T')[0];
    const filename = `${meetingInfo.team_name}_${meetingInfo.meeting_type}_${date}_transcript.${format}`;

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(transcript.raw_transcript);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.json({
        meeting_info: meetingInfo,
        transcript: transcript.raw_transcript,
        structured_transcript: transcript.transcript_json,
        ai_summary: {
          executive_summary: transcript.executive_summary,
          key_decisions: transcript.key_decisions,
          action_items: transcript.action_items,
          issues_discussed: transcript.issues_discussed
        }
      });
    } else {
      return res.status(400).json({ message: 'Unsupported format. Use txt or json.' });
    }

  } catch (error) {
    console.error('Failed to download transcript:', error);
    res.status(500).json({ 
      message: 'Failed to download transcript',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const deleteTranscript = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { hard_delete = false } = req.body;
    const userId = req.user.id;

    // Get transcript
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    // Check permissions - only admin or creator can delete
    const client = await db.getClient();
    try {
      const userResult = await client.query(
        'SELECT role FROM users WHERE id = $1 AND organization_id = $2',
        [userId, orgId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        return res.status(403).json({ message: 'Only organization admins can delete transcripts' });
      }
    } finally {
      client.release();
    }

    // Log the access
    await aiTranscriptionService.logTranscriptAccess(
      transcript.id,
      userId,
      orgId,
      hard_delete ? 'hard_delete' : 'soft_delete',
      req.ip,
      req.get('User-Agent')
    );

    // Delete transcript
    await aiTranscriptionService.deleteTranscript(transcript.id, orgId, hard_delete);

    res.json({
      message: hard_delete ? 'Transcript permanently deleted' : 'Transcript deleted',
      transcript_id: transcript.id
    });

  } catch (error) {
    console.error('Failed to delete transcript:', error);
    res.status(500).json({ 
      message: 'Failed to delete transcript',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getTranscriptStatus = async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;

    // Get transcript status
    const transcript = await aiTranscriptionService.getTranscriptByMeetingId(meetingId, orgId);
    
    if (!transcript) {
      return res.json({ 
        status: 'not_started',
        message: 'No transcription found for this meeting'
      });
    }

    res.json({
      transcript_id: transcript.id,
      status: transcript.status,
      processing_started_at: transcript.processing_started_at,
      processing_completed_at: transcript.processing_completed_at,
      has_ai_summary: !!transcript.executive_summary,
      word_count: transcript.word_count,
      message: getStatusMessage(transcript.status)
    });

  } catch (error) {
    console.error('Failed to get transcript status:', error);
    res.status(500).json({ 
      message: 'Failed to get transcript status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function
function getStatusMessage(status) {
  switch (status) {
    case 'processing':
      return 'Recording and transcribing in real-time';
    case 'processing_ai':
      return 'Generating AI summary and extracting insights';
    case 'completed':
      return 'Transcript and AI summary ready';
    case 'failed':
      return 'Transcription failed';
    default:
      return 'Unknown status';
  }
}