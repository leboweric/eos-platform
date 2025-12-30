import OpenAI from 'openai';
import { getClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import emailService from './emailService.js';
import { logMeetingError } from './meetingAlertService.js';

class AISummaryService {
  constructor() {
    this.openai = null;
    this.initializeOpenAI();
  }

  initializeOpenAI() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('✅ OpenAI service initialized for AI summaries');
    } else {
      console.warn('⚠️ OPENAI_API_KEY not configured - AI summaries disabled');
    }
  }

  /**
   * Generate comprehensive AI summary for EOS meeting transcript
   */
  async generateAISummary(transcriptId, rawTranscript) {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const startTime = Date.now();
    
    try {
      console.log(`🤖 Generating AI summary for transcript ${transcriptId}`);

      // Get meeting context from database
      const meetingContext = await this.getMeetingContext(transcriptId);
      
      // Generate AI summary using GPT-4 with EOS-specific prompts
      const aiSummary = await this.callOpenAIForSummary(rawTranscript, meetingContext);
      
      // Calculate processing time and cost
      const processingTime = (Date.now() - startTime) / 1000;
      const estimatedCost = this.calculateOpenAICost(rawTranscript, aiSummary);

      // Save AI summary to database
      await this.saveAISummary(transcriptId, aiSummary, processingTime, estimatedCost);
      console.log(`💾 Successfully saved AI summary for transcript ${transcriptId}`);

      // Send email to meeting participants
      try {
        console.log(`📧 Preparing to send summary email for transcript ${transcriptId}`);
        
        // Get meeting data for email
        const meetingData = await this.getMeetingDataForEmail(transcriptId, aiSummary, meetingContext);
        
        if (meetingData && meetingData.recipients && meetingData.recipients.length > 0) {
          console.log(`📧 Sending summary email to ${meetingData.recipients.length} recipients`);
          await emailService.sendMeetingSummary(meetingData.recipients, meetingData);
          console.log(`✅ Summary email sent successfully for transcript ${transcriptId}`);
        } else {
          console.warn(`⚠️ No recipients found for transcript ${transcriptId}, skipping email`);
        }
      } catch (emailError) {
        console.error(`❌ Failed to send summary email for ${transcriptId}:`, emailError);
        
        // Log to meeting alert system
        logMeetingError({
          organizationId: meetingContext?.organizationId,
          errorType: 'meeting_email_failed',
          severity: 'warning',
          errorMessage: `Failed to send summary email: ${emailError.message}`,
          context: { transcriptId, recipientCount: meetingData?.recipients?.length || 0 },
          meetingPhase: 'email'
        }).catch(err => console.error('Failed to log email error:', err));
        
        // Don't throw - AI summary was saved successfully, just log the email failure
      }

      // Mark transcript as completed - CRITICAL: This must succeed
      try {
        await this.updateTranscriptStatus(transcriptId, 'completed');
        console.log(`✅ Transcript ${transcriptId} marked as completed`);
      } catch (statusError) {
        console.error(`❌ Failed to update transcript status to completed:`, statusError);
        // Don't throw - AI summary was saved successfully, just log the status update failure
      }

      console.log(`✅ AI summary generated for transcript ${transcriptId} in ${processingTime}s`);

      return aiSummary;
    } catch (error) {
      console.error(`❌ Failed to generate AI summary for ${transcriptId}:`, error);
      
      // Log to meeting alert system - this is critical
      logMeetingError({
        organizationId: meetingContext?.organizationId,
        errorType: 'ai_summary_failed',
        severity: 'error',
        errorMessage: `Failed to generate AI summary: ${error.message}`,
        errorStack: error.stack,
        context: { transcriptId },
        meetingPhase: 'summary'
      }).catch(err => console.error('Failed to log AI summary error:', err));
      
      await this.updateTranscriptStatus(transcriptId, 'failed', {
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Get meeting context to enhance AI summary
   */
  async getMeetingContext(transcriptId) {
    const client = await getClient();
    try {
      const result = await client.query(`
        SELECT 
          m.scheduled_date,
          t.name as team_name,
          o.name as organization_name,
          mt.meeting_id, mt.organization_id
        FROM meeting_transcripts mt
        INNER JOIN meetings m ON mt.meeting_id = m.id
        INNER JOIN teams t ON m.team_id = t.id
        INNER JOIN organizations o ON mt.organization_id = o.id
        WHERE mt.id = $1
      `, [transcriptId]);

      return result.rows[0] || {};
    } finally {
      client.release();
    }
  }

  /**
   * Call OpenAI GPT-4 with EOS-specific prompts
   */
  async callOpenAIForSummary(transcript, context) {
    const prompt = this.buildEOSPrompt(transcript, context);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert AI assistant specialized in analyzing EOS (Entrepreneurial Operating System) business meetings. You understand EOS terminology, meeting structures, and business objectives. Provide detailed, actionable insights in valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent, factual outputs
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const aiSummary = JSON.parse(response.choices[0].message.content);
      
      // Add metadata
      aiSummary.ai_model = 'gpt-4o';
      aiSummary.ai_prompt_version = '2.0';
      aiSummary.generated_at = new Date().toISOString();
      
      return aiSummary;
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Log to meeting alert system
      logMeetingError({
        organizationId: context?.organizationId,
        errorType: 'openai_api_error',
        severity: 'error',
        errorMessage: `OpenAI API error: ${error.message}`,
        context: { model: 'gpt-4o', errorCode: error.code, errorType: error.type },
        meetingPhase: 'summary'
      }).catch(err => console.error('Failed to log OpenAI error:', err));
      
      throw new Error('Failed to generate AI summary');
    }
  }

  /**
   * Build comprehensive EOS-specific prompt
   */
  buildEOSPrompt(transcript, context) {
    return `
You are analyzing an EOS (Entrepreneurial Operating System) business meeting transcript. Extract comprehensive insights following EOS methodology.

MEETING CONTEXT:
- Meeting Type: Weekly EOS Meeting
- Team: ${context.team_name || 'Unknown'}
- Organization: ${context.organization_name || 'Unknown'}
- Date: ${context.scheduled_date || 'Unknown'}

MEETING TRANSCRIPT:
${transcript}

Analyze this transcript and provide a comprehensive JSON response with the following structure:

{
  "executive_summary": "2-3 paragraph summary focusing on key outcomes, decisions, and next steps",
  "meeting_type_analysis": "Analysis of how well this meeting followed EOS Level 10 structure (if applicable)",
  "key_decisions": [
    "Clear description of decision made during the meeting",
    "Another important decision if any"
  ],
  "action_items": [
    {
      "id": "unique_identifier",
      "task": "Specific, actionable description",
      "assignee": "Person assigned (if mentioned)",
      "due_date": "Due date if mentioned (YYYY-MM-DD format)",
      "priority": "high|medium|low",
      "category": "rock|todo|issue_follow_up|general",
      "milestone_related": "If related to a Rock milestone",
      "timestamp": "Approximate time in transcript when discussed",
      "confidence": "high|medium|low"
    }
  ],
  "issues_discussed": [
    {
      "id": "unique_identifier", 
      "issue": "Clear description of the issue/problem",
      "status": "solved|open|tabled",
      "solution": "Solution if resolved, or next steps if not",
      "impact_level": "high|medium|low",
      "department": "Department affected (if mentioned)",
      "timeline": "When this needs to be resolved",
      "timestamp": "Approximate time when discussed"
    }
  ],
  "rocks_mentioned": [
    {
      "rock_title": "Title or description of the Rock/Quarterly Priority",
      "status": "on_track|off_track|completed|at_risk",
      "update": "Status update or discussion summary",
      "owner": "Rock owner (if mentioned)",
      "due_date": "Rock due date (if mentioned)",
      "completion_percentage": "Estimated completion % (0-100)",
      "obstacles": "Any obstacles mentioned",
      "next_steps": "Next steps discussed for this Rock"
    }
  ],
  "discussion_topics": [
    {
      "topic": "Topic name/category",
      "duration_estimate": "Estimated time spent in minutes",
      "sentiment": "positive|neutral|negative|mixed",
      "energy_level": "high|medium|low",
      "consensus_reached": true/false,
      "follow_up_needed": true/false
    }
  ],
  "notable_quotes": [
    {
      "speaker": "Speaker name if identified",
      "quote": "Exact or well-paraphrased quote",
      "context": "Why this quote is significant",
      "timestamp": "Time when said"
    }
  ],
  "meeting_sentiment": "positive|neutral|negative|mixed",
  "meeting_energy_score": 1-10
}

Focus specifically on:
- EOS terminology and concepts (Rocks, Issues, To-Dos, Scorecard, VTO, etc.)
- Clear, actionable insights that leadership can act upon
- Identification of accountability gaps or clarity issues
- Extraction of measurable outcomes and commitments
- Assessment of team health and meeting effectiveness
- Recommendations for process improvement

Be thorough but concise. If information is not available in the transcript, mark fields as null or "not mentioned" rather than guessing.
`;
  }

  /**
   * Save AI summary to database
   */
  async saveAISummary(transcriptId, aiSummary, processingTime, estimatedCost) {
    const client = await getClient();
    try {
      // Get transcript info
      const transcriptResult = await client.query(
        'SELECT meeting_id, organization_id FROM meeting_transcripts WHERE id = $1',
        [transcriptId]
      );
      
      if (transcriptResult.rows.length === 0) {
        throw new Error('Transcript not found');
      }

      const { meeting_id, organization_id } = transcriptResult.rows[0];

      // Insert AI summary
      const summaryId = uuidv4();
      await client.query(`
        INSERT INTO meeting_ai_summaries (
          id, meeting_id, transcript_id, organization_id,
          executive_summary, key_decisions, discussion_topics,
          action_items, issues_discussed, rocks_priorities,
          notable_quotes, meeting_sentiment, meeting_energy_score,
          ai_model, ai_prompt_version, ai_processing_time_seconds, ai_cost_usd,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $17, NOW())
      `, [
        summaryId, meeting_id, transcriptId, organization_id,
        aiSummary.executive_summary,
        JSON.stringify(aiSummary.key_decisions || []), // JSONB
        JSON.stringify(aiSummary.discussion_topics || []), // JSONB
        JSON.stringify(aiSummary.action_items || []), // JSONB
        JSON.stringify(aiSummary.issues_discussed || []), // JSONB
        JSON.stringify(aiSummary.rocks_mentioned || []), // JSONB
        JSON.stringify(aiSummary.notable_quotes || []), // JSONB
        aiSummary.meeting_sentiment,
        typeof aiSummary.meeting_energy_score === 'number' ? aiSummary.meeting_energy_score : null,
        aiSummary.ai_model,
        aiSummary.ai_prompt_version,
        processingTime,
        estimatedCost
      ]);

      console.log(`💾 Saved AI summary for transcript ${transcriptId}`);
      
      // CRITICAL: Update the meeting snapshot with the AI summary
      // This allows the Meeting History modal to display the AI summary
      console.log('📝 Updating meeting snapshot with AI summary...');
      await client.query(`
        UPDATE meeting_snapshots 
        SET snapshot_data = jsonb_set(
          snapshot_data, 
          '{ai_summary}', 
          to_jsonb($1::text)
        )
        WHERE meeting_id = $2
      `, [aiSummary.executive_summary, meeting_id]);
      
      console.log('✅ Meeting snapshot updated with AI summary');
    } finally {
      client.release();
    }
  }

  /**
   * Create todos from AI-extracted action items
   */
  async createTodosFromActionItems(transcriptId, actionItemIds, userId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Get AI summary
      const summaryResult = await client.query(`
        SELECT action_items, meeting_id, organization_id 
        FROM meeting_ai_summaries mas
        INNER JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
        WHERE mas.transcript_id = $1
      `, [transcriptId]);

      if (summaryResult.rows.length === 0) {
        throw new Error('AI summary not found');
      }

      const { action_items, meeting_id, organization_id } = summaryResult.rows[0];
      const todosCreated = [];

      for (const itemId of actionItemIds) {
        const actionItem = action_items.find(item => item.id === itemId);
        if (!actionItem) continue;

        // Try to find assignee user ID
        let assigneeId = null;
        if (actionItem.assignee) {
          const userResult = await client.query(
            'SELECT id FROM users WHERE organization_id = $1 AND (name ILIKE $2 OR email ILIKE $2)',
            [organization_id, `%${actionItem.assignee}%`]
          );
          if (userResult.rows.length > 0) {
            assigneeId = userResult.rows[0].id;
          }
        }

        // Create todo
        const todoId = uuidv4();
        await client.query(`
          INSERT INTO todos (
            id, title, description, organization_id, assigned_to, due_date, 
            priority, created_by, source, source_meeting_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ai_extraction', $9, NOW())
        `, [
          todoId,
          actionItem.task,
          `Auto-generated from meeting AI summary.\n\nOriginal task: "${actionItem.task}"\nPriority: ${actionItem.priority}\nCategory: ${actionItem.category}`,
          organization_id,
          assigneeId,
          actionItem.due_date || null,
          actionItem.priority || 'medium',
          userId,
          meeting_id
        ]);

        todosCreated.push(todoId);
      }

      await client.query('COMMIT');
      console.log(`✅ Created ${todosCreated.length} todos from AI action items`);
      return todosCreated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create issues from AI-detected issues
   */
  async createIssuesFromAI(transcriptId, issueIds, userId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Get AI summary
      const summaryResult = await client.query(`
        SELECT issues_discussed, meeting_id, organization_id 
        FROM meeting_ai_summaries mas
        INNER JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
        WHERE mas.transcript_id = $1
      `, [transcriptId]);

      if (summaryResult.rows.length === 0) {
        throw new Error('AI summary not found');
      }

      const { issues_discussed, meeting_id, organization_id } = summaryResult.rows[0];
      const issuesCreated = [];

      for (const issueId of issueIds) {
        const aiIssue = issues_discussed.find(issue => issue.id === issueId);
        if (!aiIssue) continue;

        // Create issue
        const newIssueId = uuidv4();
        await client.query(`
          INSERT INTO issues (
            id, title, description, organization_id, status, priority,
            created_by, source, source_meeting_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai_extraction', $8, NOW())
        `, [
          newIssueId,
          aiIssue.issue,
          `Auto-generated from meeting AI analysis.\n\nIssue: "${aiIssue.issue}"\n${aiIssue.solution ? `Solution: ${aiIssue.solution}` : ''}\nImpact Level: ${aiIssue.impact_level}`,
          organization_id,
          aiIssue.status === 'solved' ? 'solved' : 'open',
          aiIssue.impact_level || 'medium',
          userId,
          meeting_id
        ]);

        issuesCreated.push(newIssueId);
      }

      await client.query('COMMIT');
      console.log(`✅ Created ${issuesCreated.length} issues from AI detection`);
      return issuesCreated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update transcript status
   */
  async updateTranscriptStatus(transcriptId, status, metadata = {}) {
    const client = await getClient();
    try {
      const updateFields = ['status = $2'];
      const values = [transcriptId, status];
      let paramCount = 2;

      if (status === 'completed') {
        updateFields.push(`processing_completed_at = NOW()`);
      }

      if (metadata.error_message) {
        paramCount++;
        updateFields.push(`error_message = $${paramCount}`);
        values.push(metadata.error_message);
      }

      await client.query(`
        UPDATE meeting_transcripts 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $1
      `, values);
    } finally {
      client.release();
    }
  }

  /**
   * Calculate estimated OpenAI cost
   */
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

  /**
   * Get meeting data formatted for email
   */
  async getMeetingDataForEmail(transcriptId, aiSummary, meetingContext) {
    const client = await getClient();
    try {
      // Get meeting details
      const meetingResult = await client.query(`
        SELECT 
          m.id as meeting_id,
          m.scheduled_date,
          m.actual_start_time,
          m.actual_end_time,
          m.rating,
          t.id as team_id,
          t.name as team_name,
          o.id as organization_id,
          o.name as organization_name,
          o.theme_primary_color,
          u.first_name || ' ' || u.last_name as facilitator_name
        FROM meeting_transcripts mt
        INNER JOIN meetings m ON mt.meeting_id = m.id
        INNER JOIN teams t ON m.team_id = t.id
        INNER JOIN organizations o ON mt.organization_id = o.id
        LEFT JOIN users u ON m.facilitator_id = u.id
        WHERE mt.id = $1
      `, [transcriptId]);

      if (meetingResult.rows.length === 0) {
        console.error(`No meeting found for transcript ${transcriptId}`);
        return null;
      }

      const meeting = meetingResult.rows[0];

      // Get all team members as recipients (not just attendees)
      const participantsResult = await client.query(`
        SELECT DISTINCT u.email, u.first_name, u.last_name
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
          AND u.email IS NOT NULL
          AND u.is_active = true
      `, [meeting.team_id]);

      const recipients = participantsResult.rows.map(p => p.email);

      if (recipients.length === 0) {
        console.warn(`No team members found for team ${meeting.team_id}`);
        return null;
      }

      // Wait for snapshot with retry (up to 30 seconds)
      // This handles the race condition where AI summary completes before snapshot is created
      let snapshotData = null;
      const maxRetries = 6; // 6 retries * 5 seconds = 30 seconds max

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const snapshotResult = await client.query(`
          SELECT snapshot_data
          FROM meeting_snapshots
          WHERE meeting_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [meeting.meeting_id]);
        
        if (snapshotResult.rows.length > 0) {
          snapshotData = snapshotResult.rows[0].snapshot_data;
          console.log(`✅ Found meeting snapshot with data (attempt ${attempt + 1})`);
          break;
        }
        
        if (attempt < maxRetries - 1) {
          console.log(`⏳ Snapshot not found yet, waiting 5 seconds... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
      }

      if (!snapshotData) {
        console.warn('⚠️ No meeting snapshot found after 30 seconds of retrying');
      }

      // Calculate duration
      const duration = meeting.actual_end_time && meeting.actual_start_time
        ? Math.round((new Date(meeting.actual_end_time) - new Date(meeting.actual_start_time)) / 60000)
        : null;

      // Format meeting data for email template
      return {
        recipients,
        organizationId: meeting.organization_id,
        organizationName: meeting.organization_name,
        teamName: meeting.team_name,
        meetingType: 'Level 10 Meeting',
        meetingDate: meeting.scheduled_date || meeting.actual_start_time,
        duration: meeting.total_duration_minutes || snapshotData?.duration || duration || 90,
        rating: meeting.rating || snapshotData?.rating,
        facilitatorName: meeting.facilitator_name,
        themeColor: meeting.theme_primary_color || '#6366f1',
        aiSummary: aiSummary.executive_summary,
        
        // Get data from snapshot if available
        headlines: snapshotData?.headlines || { customer: [], employee: [] },
        cascadingMessages: snapshotData?.cascadingMessages || [],
        
        // Handle new structured snapshot format with separate solved/new categories
        issues: {
          solved: (snapshotData?.issues?.solved || []).map(issue => ({
            title: issue.title || issue.issue || 'Untitled issue',
            owner: issue.owner_name || issue.owner || null
          })),
          new: (snapshotData?.issues?.new || []).map(issue => ({
            title: issue.title || issue.issue || 'Untitled issue', 
            owner: issue.owner_name || issue.owner || null
          }))
        },
        
        // Handle new structured snapshot format for todos
        todos: {
          completed: (snapshotData?.todos?.completed || []).map(todo => 
            todo.title || todo.todo || 'Untitled'
          ),
          new: (snapshotData?.todos?.added || []).map(todo => ({
            title: todo.title || todo.todo || 'Untitled',
            assignee: todo.assigned_to_name || todo.assignee || 'Unassigned',
            dueDate: todo.dueDate || (todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date')
          }))
        },
        
        attendees: participantsResult.rows.map(p => ({
          name: `${p.first_name} ${p.last_name}`,
          email: p.email
        }))
      };
    } finally {
      client.release();
    }
  }
}

// Create singleton instance
const aiSummaryService = new AISummaryService();

export default aiSummaryService;