import { AssemblyAI } from 'assemblyai';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

let assemblyAI;
let openai;

const initializeServices = () => {
  if (!assemblyAI && process.env.ASSEMBLYAI_API_KEY) {
    assemblyAI = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });
  }
  
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
};

class AITranscriptionService {
  constructor() {
    initializeServices();
  }

  // Create a new transcript record
  async createTranscriptRecord(meetingId, organizationId, consentUserIds = []) {
    const client = await db.getClient();
    
    // Log connection details
    console.log('🔍 DATABASE CONNECTION:', {
      database: client.database,
      host: client.host,
      port: client.port,
      user: client.user
    });
    
    try {
      await client.query('BEGIN');
      
      const transcriptId = uuidv4();
      console.log('[createTranscriptRecord] 🆔 Generated transcript ID:', transcriptId);
      console.log('[createTranscriptRecord] 🔗 Meeting ID:', meetingId);
      console.log('[createTranscriptRecord] 🏢 Organization ID:', organizationId);
      
      // Use RETURNING to verify INSERT succeeded
      const result = await client.query(`
        INSERT INTO meeting_transcripts (
          id,
          meeting_id, 
          organization_id, 
          status, 
          consent_obtained, 
          consent_obtained_from,
          transcription_service,
          processing_started_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'processing', $4, $5, 'assemblyai', NOW(), NOW(), NOW())
        RETURNING id
      `, [transcriptId, meetingId, organizationId, consentUserIds.length > 0, consentUserIds]);
      
      if (result.rows.length === 0) {
        throw new Error('INSERT returned no rows - failed silently');
      }
      
      const insertedId = result.rows[0].id;
      console.log('[createTranscriptRecord] ✅ Inserted ID:', insertedId);
      
      if (insertedId !== transcriptId) {
        throw new Error(`ID mismatch: expected ${transcriptId}, got ${insertedId}`);
      }
      
      await client.query('COMMIT');
      console.log('✅ [createTranscriptRecord] Transaction committed with ID:', insertedId);
      
      return { id: insertedId, meeting_id: meetingId, organization_id: organizationId, status: 'processing' };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [createTranscriptRecord] Failed:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        meetingId,
        organizationId
      });
      throw error; // DON'T suppress this error!
    } finally {
      client.release();
    }
  }

  // Start real-time transcription session
  async startRealtimeTranscription(transcriptId) {
    if (!assemblyAI) {
      throw new Error('AssemblyAI API key not configured');
    }

    try {
      // Create a real-time transcription session
      const realtimeTranscriber = assemblyAI.realtime.transcriber({
        sampleRate: 16000,
        encoding: 'pcm_s16le',
        // Enable speaker diarization
        speaker_labels: true,
        // Custom vocabulary for EOS terms
        custom_vocabulary: [
          'EOS', 'Rock', 'Rocks', 'IDS', 'VTO', 'V/TO', 'Scorecard', 
          'Level 10', 'L10', 'Segue', 'Traction', 'Quarterly', 'Priorities'
        ],
        // Auto-detect action items
        auto_chapters: true,
        entity_detection: true,
        sentiment_analysis: true,
        // Boost accuracy for business terms
        boost_param: 'high'
      });

      // Store the session for this transcript
      await this.updateTranscriptStatus(transcriptId, 'recording', {
        session_id: realtimeTranscriber.sessionId
      });

      return realtimeTranscriber;
    } catch (error) {
      console.error('Failed to start real-time transcription:', error);
      await this.updateTranscriptStatus(transcriptId, 'failed');
      throw error;
    }
  }

  // Process completed transcript with AI
  async processTranscriptWithAI(transcriptId, rawTranscript, structuredTranscript) {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    
    try {
      // Store the raw transcript first
      await this.updateTranscriptContent(transcriptId, rawTranscript, structuredTranscript);

      // Generate AI summary
      const aiSummary = await this.generateAISummary(rawTranscript);
      
      // Calculate processing time and cost
      const processingTime = (Date.now() - startTime) / 1000;
      const estimatedCost = this.calculateOpenAICost(rawTranscript, aiSummary);

      // Store AI summary
      await this.storeAISummary(transcriptId, aiSummary, processingTime, estimatedCost);

      // Mark transcript as completed
      await this.updateTranscriptStatus(transcriptId, 'completed');

      return aiSummary;
    } catch (error) {
      console.error('Failed to process transcript with AI:', error);
      await this.updateTranscriptStatus(transcriptId, 'failed');
      throw error;
    }
  }

  // Generate AI summary using GPT-4
  async generateAISummary(transcript) {
    const prompt = `
You are an AI assistant specialized in analyzing EOS (Entrepreneurial Operating System) Level 10 meetings. 

Analyze this meeting transcript and extract the following information:

MEETING TRANSCRIPT:
${transcript}

Please provide a JSON response with the following structure:

{
  "executive_summary": "2-3 paragraph summary of the meeting",
  "key_decisions": ["Decision 1", "Decision 2"],
  "action_items": [
    {
      "task": "Description of the action item",
      "assignee": "Person assigned (if mentioned)",
      "due_date": "Due date if mentioned (YYYY-MM-DD format)",
      "timestamp": "Approximate time in transcript when discussed",
      "confidence": "high|medium|low"
    }
  ],
  "issues_discussed": [
    {
      "issue": "Description of the issue",
      "status": "solved|open|tabled",
      "solution": "Solution if resolved",
      "timestamp": "Approximate time when discussed"
    }
  ],
  "rocks_mentioned": [
    {
      "rock_title": "Title or description of the Rock/Priority",
      "status": "on_track|off_track|completed",
      "update": "Status update mentioned"
    }
  ],
  "discussion_topics": [
    {
      "topic": "Topic name",
      "duration_minutes": "Estimated time spent",
      "sentiment": "positive|neutral|negative"
    }
  ],
  "notable_quotes": [
    {
      "speaker": "Speaker name if identified",
      "quote": "Exact or paraphrased quote",
      "timestamp": "Time when said"
    }
  ],
  "meeting_sentiment": "positive|neutral|negative",
  "meeting_energy_score": 1-10
}

Focus on:
- EOS terminology (Rocks, Issues, To-Dos, Scorecard, etc.)
- Clear action items with assignees
- Problems identified and solutions discussed
- Decisions made by the team
- Overall tone and energy of the meeting
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing business meetings and extracting actionable insights.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const aiSummary = JSON.parse(response.choices[0].message.content);
      
      // Add metadata
      aiSummary.ai_model = 'gpt-4-turbo-preview';
      aiSummary.ai_prompt_version = '1.0';
      
      return aiSummary;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  // Update transcript status
  async updateTranscriptStatus(transcriptId, status, metadata = {}) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      const updateFields = ['status = $2'];
      const values = [transcriptId, status];
      let paramCount = 2;

      if (status === 'completed') {
        updateFields.push(`processing_completed_at = NOW()`);
      }

      if (Object.keys(metadata).length > 0) {
        paramCount++;
        updateFields.push(`transcript_service_id = $${paramCount}`);
        values.push(metadata.session_id || null);
      }

      await client.query(`
        UPDATE meeting_transcripts 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $1
      `, values);
      
      await client.query('COMMIT');
      console.log('✅ Transcript status update transaction committed');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transcript status update transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update transcript content
  async updateTranscriptContent(transcriptId, rawTranscript, structuredTranscript) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      const wordCount = rawTranscript.split(' ').length;
      
      await client.query(`
        UPDATE meeting_transcripts 
        SET raw_transcript = $2, 
            transcript_json = $3,
            word_count = $4,
            updated_at = NOW()
        WHERE id = $1
      `, [transcriptId, rawTranscript, JSON.stringify(structuredTranscript), wordCount]);
      
      await client.query('COMMIT');
      console.log('✅ Transcript content update transaction committed');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transcript content update transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Store AI summary
  async storeAISummary(transcriptId, aiSummary, processingTime, estimatedCost) {
    console.log('🆔🆔🆔 [AI-ANALYSIS] CRITICAL ID TRACKING:', {
      receivedTranscriptId: transcriptId,
      willLookupMeetingInfo: true,
      willInsertAISummary: true,
      mustExistInDatabase: true
    });
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Get meeting and organization info
      const transcriptResult = await client.query(
        'SELECT meeting_id, organization_id FROM meeting_transcripts WHERE id = $1',
        [transcriptId]
      );
      
      if (transcriptResult.rows.length === 0) {
        throw new Error('Transcript not found');
      }

      const { meeting_id, organization_id } = transcriptResult.rows[0];

      const result = await client.query(`
        INSERT INTO meeting_ai_summaries (
          meeting_id,
          transcript_id, 
          organization_id,
          executive_summary,
          key_decisions,
          discussion_topics,
          action_items,
          issues_discussed,
          rocks_mentioned,
          notable_quotes,
          meeting_sentiment,
          meeting_energy_score,
          ai_model,
          ai_prompt_version,
          ai_processing_time_seconds,
          ai_cost_usd
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        meeting_id,
        transcriptId,
        organization_id,
        aiSummary.executive_summary,
        aiSummary.key_decisions,
        JSON.stringify(aiSummary.discussion_topics),
        JSON.stringify(aiSummary.action_items),
        JSON.stringify(aiSummary.issues_discussed),
        JSON.stringify(aiSummary.rocks_mentioned),
        JSON.stringify(aiSummary.notable_quotes),
        aiSummary.meeting_sentiment,
        aiSummary.meeting_energy_score,
        aiSummary.ai_model,
        aiSummary.ai_prompt_version,
        processingTime,
        estimatedCost
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('AI summary INSERT returned no rows - failed silently');
      }
      
      const summaryId = result.rows[0].id;
      console.log('[storeAISummary] ✅ Inserted AI summary with ID:', summaryId);
      
      await client.query('COMMIT');
      console.log('✅ AI summary transaction committed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ AI summary transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get transcript by meeting ID
  async getTranscriptByMeetingId(meetingId, organizationId) {
    const client = await db.getClient();
    try {
      const result = await client.query(`
        SELECT mt.*, mas.* 
        FROM meeting_transcripts mt
        LEFT JOIN meeting_ai_summaries mas ON mt.id = mas.transcript_id
        WHERE mt.meeting_id = $1 AND mt.organization_id = $2 AND mt.deleted_at IS NULL
        ORDER BY mt.created_at DESC
        LIMIT 1
      `, [meetingId, organizationId]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Search transcripts
  async searchTranscripts(organizationId, query, filters = {}) {
    const client = await db.getClient();
    try {
      let whereClause = 'mt.organization_id = $1 AND mt.deleted_at IS NULL';
      let params = [organizationId];
      let paramCount = 1;

      if (query) {
        paramCount++;
        whereClause += ` AND (mt.raw_transcript ILIKE $${paramCount} OR mas.executive_summary ILIKE $${paramCount})`;
        params.push(`%${query}%`);
      }

      if (filters.teamId) {
        paramCount++;
        whereClause += ` AND m.team_id = $${paramCount}`;
        params.push(filters.teamId);
      }

      if (filters.startDate) {
        paramCount++;
        whereClause += ` AND m.meeting_date >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        whereClause += ` AND m.meeting_date <= $${paramCount}`;
        params.push(filters.endDate);
      }

      const result = await client.query(`
        SELECT 
          mt.id as transcript_id,
          mt.meeting_id,
          m.meeting_date,
          m.meeting_type,
          t.name as team_name,
          mt.raw_transcript,
          mas.executive_summary,
          mas.action_items,
          mas.issues_discussed
        FROM meeting_transcripts mt
        INNER JOIN meetings m ON mt.meeting_id = m.id
        INNER JOIN teams t ON m.team_id = t.id
        LEFT JOIN meeting_ai_summaries mas ON mt.id = mas.transcript_id
        WHERE ${whereClause}
        ORDER BY m.meeting_date DESC
        LIMIT 50
      `, params);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Delete transcript (compliance)
  async deleteTranscript(transcriptId, organizationId, hardDelete = false) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      if (hardDelete) {
        // Permanently delete
        await client.query(
          'DELETE FROM meeting_ai_summaries WHERE transcript_id = $1',
          [transcriptId]
        );
        await client.query(
          'DELETE FROM meeting_transcripts WHERE id = $1 AND organization_id = $2',
          [transcriptId, organizationId]
        );
      } else {
        // Soft delete
        await client.query(
          'UPDATE meeting_transcripts SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2',
          [transcriptId, organizationId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Log transcript access (audit trail)
  async logTranscriptAccess(transcriptId, userId, organizationId, accessType, ipAddress, userAgent) {
    const client = await db.getClient();
    try {
      await client.query(`
        INSERT INTO transcript_access_log (
          transcript_id, user_id, organization_id, access_type, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [transcriptId, userId, organizationId, accessType, ipAddress, userAgent]);
    } finally {
      client.release();
    }
  }

  // Calculate estimated OpenAI cost
  calculateOpenAICost(inputText, outputObject) {
    // Rough token estimation: 1 token ≈ 0.75 words
    const inputTokens = Math.ceil(inputText.split(' ').length / 0.75);
    const outputTokens = Math.ceil(JSON.stringify(outputObject).split(' ').length / 0.75);
    
    // GPT-4 Turbo pricing (as of 2024)
    const inputCostPer1k = 0.01;  // $0.01 per 1K input tokens
    const outputCostPer1k = 0.03; // $0.03 per 1K output tokens
    
    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;
    
    return Number((inputCost + outputCost).toFixed(4));
  }

  // Create todos from AI action items
  async createTodosFromActionItems(meetingId, organizationId, actionItemIds, userId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get the AI summary
      const summaryResult = await client.query(
        'SELECT action_items FROM meeting_ai_summaries WHERE meeting_id = $1',
        [meetingId]
      );

      if (summaryResult.rows.length === 0) {
        throw new Error('AI summary not found');
      }

      const actionItems = summaryResult.rows[0].action_items;
      const todosCreated = [];

      for (const itemId of actionItemIds) {
        const actionItem = actionItems.find(item => item.id === itemId);
        if (!actionItem) continue;

        // Find assignee user ID if possible
        let assigneeId = null;
        if (actionItem.assignee) {
          const userResult = await client.query(
            'SELECT id FROM users WHERE organization_id = $1 AND (name ILIKE $2 OR email ILIKE $2)',
            [organizationId, `%${actionItem.assignee}%`]
          );
          if (userResult.rows.length > 0) {
            assigneeId = userResult.rows[0].id;
          }
        }

        // Create the todo
        const todoResult = await client.query(`
          INSERT INTO todos (
            title, description, organization_id, assigned_to, due_date, 
            created_by, source, source_meeting_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'ai_extraction', $7)
          RETURNING id
        `, [
          actionItem.task,
          `Auto-generated from meeting AI summary. Original: "${actionItem.task}"`,
          organizationId,
          assigneeId,
          actionItem.due_date || null,
          userId,
          meetingId
        ]);

        todosCreated.push(todoResult.rows[0].id);
      }

      await client.query('COMMIT');
      return todosCreated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Create issues from AI detected issues
  async createIssuesFromAIDetection(meetingId, organizationId, issueIds, userId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get the AI summary
      const summaryResult = await client.query(
        'SELECT issues_discussed FROM meeting_ai_summaries WHERE meeting_id = $1',
        [meetingId]
      );

      if (summaryResult.rows.length === 0) {
        throw new Error('AI summary not found');
      }

      const issuesDiscussed = summaryResult.rows[0].issues_discussed;
      const issuesCreated = [];

      for (const issueId of issueIds) {
        const aiIssue = issuesDiscussed.find(issue => issue.id === issueId);
        if (!aiIssue) continue;

        // Create the issue
        const issueResult = await client.query(`
          INSERT INTO issues (
            title, description, organization_id, status, 
            created_by, source, source_meeting_id
          )
          VALUES ($1, $2, $3, $4, $5, 'ai_extraction', $6)
          RETURNING id
        `, [
          aiIssue.issue,
          `Auto-generated from meeting AI summary. ${aiIssue.solution ? 'Suggested solution: ' + aiIssue.solution : ''}`,
          organizationId,
          aiIssue.status === 'solved' ? 'solved' : 'open',
          userId,
          meetingId
        ]);

        issuesCreated.push(issueResult.rows[0].id);
      }

      await client.query('COMMIT');
      return issuesCreated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AITranscriptionService();