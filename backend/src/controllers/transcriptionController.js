import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../config/database.js';
import transcriptionService from '../services/transcriptionService.js';
import aiSummaryService from '../services/aiSummaryService.js';
import aiTranscriptionService from '../services/aiTranscriptionService.js';

export const healthCheck = async (req, res) => {
  try {
    // Test database connection
    const client = await getClient();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }

    res.json({
      success: true,
      service: 'AI Transcription',
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'AI Transcription'
    });
  }
};

export const startTranscription = async (req, res) => {
  console.log('🎙️ [Transcription] START endpoint called');
  console.log('🔍 [Transcription] Request body:', { meetingId: req.body?.meetingId, organizationId: req.body?.organizationId });
  console.log('🔍 [Transcription] User:', { userId: req.user?.id, email: req.user?.email });
  console.log('🔍 [Transcription] Environment check:', {
    hasAssemblyAI: !!process.env.ASSEMBLYAI_API_KEY,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV
  });

  try {
    const { meetingId, organizationId } = req.body;
    const userId = req.user?.id;

    console.log('✅ [Transcription] Step 1: Extracted parameters');

    if (!meetingId || !organizationId) {
      console.error('❌ [Transcription] Step 1 FAILED: Missing required parameters');
      return res.status(400).json({
        success: false,
        error: 'Meeting ID and Organization ID are required'
      });
    }

    console.log('✅ [Transcription] Step 2: Parameter validation passed');

    // Verify meeting exists and user has access
    console.log('🔍 [Transcription] Step 3: Getting database client...');
    const client = await getClient();
    
    // Log connection details
    console.log('🔍 DATABASE CONNECTION:', {
      database: client.database,
      host: client.host,
      port: client.port,
      user: client.user
    });
    
    try {
      console.log('✅ [Transcription] Step 3: Database client acquired');
      console.log('🔍 [Transcription] Step 4: Parsing and finding meeting...');
      
      // Parse meetingId which may be in format: teamId-timestamp
      // UUID format: 8-4-4-4-12 characters = 5 parts when split by '-'
      // Composite format: uuid-timestamp = 6 parts when split by '-'
      const meetingIdParts = meetingId.split('-');
      let actualMeetingId;
      let meeting;

      console.log('🔍 [Transcription] MeetingId parts:', { 
        original: meetingId, 
        parts: meetingIdParts.length,
        isComposite: meetingIdParts.length > 5 
      });

      if (meetingIdParts.length > 5) {
        // Composite format: extract teamId (first 5 parts = UUID)
        const teamId = meetingIdParts.slice(0, 5).join('-');
        const timestamp = meetingIdParts.slice(5).join('-'); // Everything after UUID
        
        console.log('🔍 [Transcription] Composite meetingId detected:', { teamId, timestamp });
        
        // Find or create meeting for this team
        const meetingResult = await client.query(`
          SELECT m.*, t.name as team_name
          FROM meetings m
          INNER JOIN teams t ON m.team_id = t.id
          WHERE m.team_id = $1 
          AND m.organization_id = $2 
          AND m.status = 'in-progress'
          ORDER BY m.created_at DESC 
          LIMIT 1
        `, [teamId, organizationId]);
        
        if (meetingResult.rows.length > 0) {
          actualMeetingId = meetingResult.rows[0].id;
          meeting = meetingResult.rows[0];
          console.log('✅ [Transcription] Found active meeting:', actualMeetingId);
        } else {
          // Create new meeting record with required fields
          // First create a meeting agenda for this AI recording session
          const agendaResult = await client.query(`
            INSERT INTO meeting_agendas (organization_id, team_id, name, meeting_type, is_template)
            VALUES ($1, $2, 'AI Recording Session Agenda', 'weekly-accountability', false)
            RETURNING id
          `, [organizationId, teamId]);
          
          const agendaId = agendaResult.rows[0].id;
          
          const newMeetingResult = await client.query(`
            INSERT INTO meetings (
              organization_id, 
              team_id, 
              agenda_id,
              facilitator_id,
              title,
              scheduled_date,
              actual_start_time,
              status
            ) 
            VALUES ($1, $2, $3, $4, 'AI Recording Session', NOW(), NOW(), 'in-progress') 
            RETURNING *
          `, [organizationId, teamId, agendaId, userId]);
          
          // Get the team name for the created meeting
          const teamResult = await client.query(`
            SELECT name FROM teams WHERE id = $1
          `, [teamId]);
          
          actualMeetingId = newMeetingResult.rows[0].id;
          meeting = {
            ...newMeetingResult.rows[0],
            team_name: teamResult.rows[0]?.name || 'Unknown Team'
          };
          console.log('✅ [Transcription] Created new meeting:', actualMeetingId);
        }
      } else {
        // Already a proper UUID - use original lookup
        actualMeetingId = meetingId;
        console.log('✅ [Transcription] Using provided meetingId as UUID:', actualMeetingId);
        
        const meetingResult = await client.query(`
          SELECT m.*, t.name as team_name
          FROM meetings m
          INNER JOIN teams t ON m.team_id = t.id
          WHERE m.id = $1 AND m.organization_id = $2
        `, [actualMeetingId, organizationId]);

        if (meetingResult.rows.length === 0) {
          console.error('❌ [Transcription] Step 4 FAILED: Meeting not found');
          return res.status(404).json({
            success: false,
            error: 'Meeting not found'
          });
        }
        
        meeting = meetingResult.rows[0];
      }

      console.log('🔍 [Transcription] Final meeting result:', { 
        actualMeetingId,
        team_name: meeting.team_name
      });
      console.log('✅ [Transcription] Step 4: Meeting resolved');

      // Check if transcription already exists
      console.log('🔍 [Transcription] Step 5: Checking for existing transcripts...');
      const existingResult = await client.query(`
        SELECT id, status FROM meeting_transcripts 
        WHERE meeting_id = $1 AND organization_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      `, [actualMeetingId, organizationId]);

      console.log('🔍 [Transcription] Existing transcript check:', { 
        existingCount: existingResult.rows.length,
        existing: existingResult.rows[0] ? { id: existingResult.rows[0].id, status: existingResult.rows[0].status } : null
      });

      if (existingResult.rows.length > 0 && existingResult.rows[0].status === 'processing') {
        console.error('❌ [Transcription] Step 5 FAILED: Transcription already in progress');
        return res.status(400).json({
          success: false,
          error: 'Transcription already in progress',
          transcript_id: existingResult.rows[0].id
        });
      }

      console.log('✅ [Transcription] Step 5: No existing transcription found');

      // Get or create transcript record (prevents dual creation)
      console.log('🔍 [Transcription] Step 6: Getting or creating transcript record...');
      
      const transcriptResult = await aiTranscriptionService.getOrCreateTranscript(actualMeetingId, organizationId);
      const transcriptId = transcriptResult.id;
      
      console.log('🆔🆔🆔 [START-ENDPOINT] CRITICAL ID TRACKING:', {
        createdTranscriptId: transcriptId,
        actualMeetingId,
        organizationId,
        willBeUsedFor: 'WebSocket connection and AI analysis',
        mustMatchDatabaseRecord: true,
        transcriptResult
      });

      console.log('✅ [Transcription] Step 6: Transcript record created via proper service');

      // Start real-time transcription with AssemblyAI
      console.log('🔍 [Transcription] Step 7: Starting real-time transcription...');
      try {
        console.log('🔍 [Transcription] Calling transcriptionService.startRealtimeTranscription...');
        console.log('🚀 About to start AssemblyAI WebSocket for transcript:', transcriptId);
        const session = await transcriptionService.startRealtimeTranscription(transcriptId, organizationId);
        console.log('✅ AssemblyAI WebSocket started successfully');
        
        console.log('✅ [Transcription] Step 7: Real-time transcription started successfully');
        console.log(`🎙️ Started transcription for meeting ${actualMeetingId}, transcript ID: ${transcriptId}`);

        const responsePayload = {
          success: true,
          transcript_id: transcriptId, // This must be the actual database ID
          session_id: session.sessionId,
          status: 'started',
          message: 'Transcription started successfully'
        };

        console.log('🆔🆔🆔 [RESPONSE-TO-FRONTEND] CRITICAL ID TRACKING:', {
          transcriptIdBeingReturned: transcriptId,
          sessionId: session.sessionId,
          thisIdWillBeUsedByFrontend: true,
          mustMatchDatabaseRecord: transcriptId,
          responsePayload
        });

        // CRITICAL VERIFICATION: Ensure we're returning the database transcript ID
        const dbVerifyResult = await client.query(
          'SELECT id FROM meeting_transcripts WHERE id = $1',
          [transcriptId]
        );
        
        console.log('🔍 [START-RESPONSE] Database verification:', {
          searchingForId: transcriptId,
          foundInDb: dbVerifyResult.rows.length > 0,
          actualDbId: dbVerifyResult.rows[0]?.id
        });
        
        if (dbVerifyResult.rows.length === 0) {
          console.error('🚨 [START-RESPONSE] CRITICAL: Trying to return transcript ID that does not exist in database!', {
            transcriptId,
            thisWillCauseStopToFail: true
          });
        }

        console.log('🎯 [START-RESPONSE] Returning transcript ID to frontend:', transcriptId);
        console.log('🎯 [START-RESPONSE] Full response payload:', responsePayload);

        res.json(responsePayload);
      } catch (transcriptionError) {
        console.error('❌ [Transcription] Step 7 FAILED: Real-time transcription error:', transcriptionError.message);
        console.error('❌ [Transcription] Error stack:', transcriptionError.stack);
        console.error('❌ [WEBSOCKET-FAILED] startRealtimeTranscription() threw an error:', {
          transcriptId,
          organizationId,
          errorName: transcriptionError.name,
          errorCode: transcriptionError.code,
          fullError: transcriptionError
        });
        
        // Update database status to failed
        await client.query(
          'UPDATE meeting_transcripts SET status = $2, error_message = $3 WHERE id = $1',
          [transcriptId, 'failed', transcriptionError.message]
        );

        return res.status(500).json({
          success: false,
          error: 'Failed to start real-time transcription',
          transcript_id: transcriptId,
          debug_error: transcriptionError.message
        });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ [Transcription] FATAL ERROR in startTranscription:', error.message);
    console.error('❌ [Transcription] Error stack:', error.stack);
    console.error('❌ [Transcription] Error details:', {
      name: error.name,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to start transcription',
      debug_error: error.message,
      debug_type: error.name
    });
  }
};

export const stopTranscription = async (req, res) => {
  try {
    const { meetingId, organizationId } = req.body;

    if (!meetingId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID and Organization ID are required'
      });
    }

    const client = await getClient();
    try {
      // Parse meetingId to get actual meeting ID (same logic as startTranscription)
      const meetingIdParts = meetingId.split('-');
      let actualMeetingId;

      if (meetingIdParts.length > 5) {
        // Composite format: extract teamId (first 5 parts = UUID)
        const teamId = meetingIdParts.slice(0, 5).join('-');
        console.log('🔍 [Stop Transcription] Composite meetingId detected:', { teamId });
        
        const meetingResult = await client.query(`
          SELECT id FROM meetings 
          WHERE team_id = $1 AND organization_id = $2 
          ORDER BY created_at DESC LIMIT 1
        `, [teamId, organizationId]);
        
        if (meetingResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'No meeting found for transcription stop'
          });
        }
        
        actualMeetingId = meetingResult.rows[0].id;
        console.log('✅ [Stop Transcription] Found meeting:', actualMeetingId);
      } else {
        actualMeetingId = meetingId;
      }

      // Get active transcript
      const transcriptResult = await client.query(`
        SELECT id, status FROM meeting_transcripts 
        WHERE meeting_id = $1 AND organization_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      `, [actualMeetingId, organizationId]);

      if (transcriptResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active transcription found'
        });
      }

      const transcript = transcriptResult.rows[0];
      
      console.log('[STOP] 🆔 Stopping transcript ID:', transcript.id);
      console.log('[STOP] 🆔 Context:', {
        transcriptId: transcript.id,
        meetingId: actualMeetingId,
        organizationId,
        status: transcript.status,
        timestamp: new Date().toISOString()
      });

      if (transcript.status !== 'processing') {
        return res.status(400).json({
          success: false,
          error: 'Transcription is not currently active'
        });
      }

      // Stop real-time transcription
      try {
        const transcriptData = await transcriptionService.stopRealtimeTranscription(transcript.id);
        
        console.log(`🛑 Stopped transcription for meeting ${actualMeetingId}, processing AI summary...`);

        // Trigger AI summary generation (async - don't wait for it)
        if (transcriptData && transcriptData.fullTranscript) {
          aiSummaryService.generateAISummary(transcript.id, transcriptData.fullTranscript)
            .then(() => {
              console.log(`✅ AI summary completed for transcript ${transcript.id}`);
            })
            .catch(error => {
              console.error(`❌ AI summary failed for transcript ${transcript.id}:`, error);
            });
        }

        res.json({
          success: true,
          transcript_id: transcript.id,
          status: 'processing_ai',
          message: 'Transcription stopped, generating AI summary...',
          word_count: transcriptData?.wordCount,
          duration_seconds: transcriptData?.durationSeconds
        });
      } catch (transcriptionError) {
        console.error('Failed to stop real-time transcription:', transcriptionError);
        
        // Update database status to failed
        await client.query(
          'UPDATE meeting_transcripts SET status = $2, error_message = $3 WHERE id = $1',
          [transcript.id, 'failed', transcriptionError.message]
        );

        return res.status(500).json({
          success: false,
          error: 'Failed to stop real-time transcription',
          transcript_id: transcript.id
        });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to stop transcription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop transcription'
    });
  }
};

export const getTranscript = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    const client = await getClient();
    try {
      const result = await client.query(`
        SELECT mt.*, mas.executive_summary, mas.key_decisions, 
               mas.action_items, mas.issues_discussed, mas.meeting_sentiment
        FROM meeting_transcripts mt
        LEFT JOIN meeting_ai_summaries mas ON mt.id = mas.transcript_id
        WHERE mt.meeting_id = $1 AND mt.organization_id = $2 AND mt.deleted_at IS NULL
        ORDER BY mt.created_at DESC LIMIT 1
      `, [meetingId, organizationId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Transcript not found'
        });
      }

      const transcript = result.rows[0];

      res.json({
        success: true,
        transcript: {
          id: transcript.id,
          meeting_id: transcript.meeting_id,
          status: transcript.status,
          raw_transcript: transcript.raw_transcript,
          word_count: transcript.word_count,
          duration_seconds: transcript.audio_duration_seconds,
          created_at: transcript.created_at,
          ai_summary: transcript.executive_summary ? {
            executive_summary: transcript.executive_summary,
            key_decisions: transcript.key_decisions,
            action_items: transcript.action_items,
            issues_discussed: transcript.issues_discussed,
            meeting_sentiment: transcript.meeting_sentiment
          } : null
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to get transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transcript'
    });
  }
};

export const getTranscriptStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    const client = await getClient();
    try {
      const result = await client.query(`
        SELECT id, status, processing_started_at, processing_completed_at, word_count
        FROM meeting_transcripts 
        WHERE meeting_id = $1 AND organization_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      `, [meetingId, organizationId]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          status: 'not_started',
          message: 'No transcription found for this meeting'
        });
      }

      const transcript = result.rows[0];

      const statusMessages = {
        'processing': 'Recording and transcribing in real-time',
        'processing_ai': 'Generating AI summary and extracting insights',
        'completed': 'Transcript and AI summary ready',
        'failed': 'Transcription failed'
      };

      res.json({
        success: true,
        transcript_id: transcript.id,
        status: transcript.status,
        processing_started_at: transcript.processing_started_at,
        processing_completed_at: transcript.processing_completed_at,
        word_count: transcript.word_count,
        message: statusMessages[transcript.status] || 'Unknown status'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to get transcript status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transcript status'
    });
  }
};

export const createTodosFromAI = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const { action_item_ids } = req.body;
    const userId = req.user?.id;

    if (!action_item_ids || !Array.isArray(action_item_ids)) {
      return res.status(400).json({
        success: false,
        error: 'action_item_ids array is required'
      });
    }

    console.log(`📝 Creating todos from AI action items for transcript ${transcriptId}`);

    const todoIds = await aiSummaryService.createTodosFromActionItems(
      transcriptId,
      action_item_ids,
      userId
    );

    res.json({
      success: true,
      todos_created: todoIds.length,
      todo_ids: todoIds,
      message: `${todoIds.length} todos created from AI action items`
    });

  } catch (error) {
    console.error('Failed to create todos from AI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create todos from AI action items'
    });
  }
};

export const createIssuesFromAI = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const { issue_ids } = req.body;
    const userId = req.user?.id;

    if (!issue_ids || !Array.isArray(issue_ids)) {
      return res.status(400).json({
        success: false,
        error: 'issue_ids array is required'
      });
    }

    console.log(`🚨 Creating issues from AI detection for transcript ${transcriptId}`);

    const issueIds = await aiSummaryService.createIssuesFromAI(
      transcriptId,
      issue_ids,
      userId
    );

    res.json({
      success: true,
      issues_created: issueIds.length,
      issue_ids: issueIds,
      message: `${issueIds.length} issues created from AI detection`
    });

  } catch (error) {
    console.error('Failed to create issues from AI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issues from AI detection'
    });
  }
};

export const getAISummary = async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const client = await getClient();
    try {
      const result = await client.query(`
        SELECT 
          mas.*,
          mt.meeting_id, mt.organization_id, mt.status as transcript_status
        FROM meeting_ai_summaries mas
        INNER JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
        WHERE mas.transcript_id = $1 AND mt.deleted_at IS NULL
      `, [transcriptId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'AI summary not found'
        });
      }

      const summary = result.rows[0];

      res.json({
        success: true,
        ai_summary: {
          transcript_id: summary.transcript_id,
          meeting_id: summary.meeting_id,
          executive_summary: summary.executive_summary,
          key_decisions: summary.key_decisions,
          action_items: summary.action_items,
          issues_discussed: summary.issues_discussed,
          rocks_mentioned: summary.rocks_mentioned,
          scorecard_metrics: summary.scorecard_metrics,
          notable_quotes: summary.notable_quotes,
          team_dynamics: summary.team_dynamics,
          eos_adherence: summary.eos_adherence,
          next_meeting_preparation: summary.next_meeting_preparation,
          meeting_sentiment: summary.meeting_sentiment,
          meeting_energy_score: summary.meeting_energy_score,
          productivity_score: summary.productivity_score,
          effectiveness_rating: summary.effectiveness_rating,
          improvement_suggestions: summary.improvement_suggestions,
          ai_model: summary.ai_model,
          ai_processing_time_seconds: summary.ai_processing_time_seconds,
          ai_cost_usd: summary.ai_cost_usd,
          created_at: summary.created_at
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to get AI summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve AI summary'
    });
  }
};