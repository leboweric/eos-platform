import OpenAI from 'openai';
import { getClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

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

      // Mark transcript as completed
      await this.updateTranscriptStatus(transcriptId, 'completed');

      console.log(`✅ AI summary generated for transcript ${transcriptId} in ${processingTime}s`);

      return aiSummary;
    } catch (error) {
      console.error(`❌ Failed to generate AI summary for ${transcriptId}:`, error);
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
          m.meeting_type, m.meeting_date,
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
        model: 'gpt-4-turbo-preview',
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
      aiSummary.ai_model = 'gpt-4-turbo-preview';
      aiSummary.ai_prompt_version = '2.0';
      aiSummary.generated_at = new Date().toISOString();
      
      return aiSummary;
    } catch (error) {
      console.error('OpenAI API error:', error);
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
- Meeting Type: ${context.meeting_type || 'Unknown'}
- Team: ${context.team_name || 'Unknown'}
- Organization: ${context.organization_name || 'Unknown'}
- Date: ${context.meeting_date || 'Unknown'}

MEETING TRANSCRIPT:
${transcript}

Analyze this transcript and provide a comprehensive JSON response with the following structure:

{
  "executive_summary": "2-3 paragraph summary focusing on key outcomes, decisions, and next steps",
  "meeting_type_analysis": "Analysis of how well this meeting followed EOS Level 10 structure (if applicable)",
  "key_decisions": [
    {
      "decision": "Description of the decision made",
      "rationale": "Why this decision was made",
      "impact": "Expected impact on the organization/team",
      "decision_maker": "Person who made the decision (if mentioned)",
      "confidence": "high|medium|low"
    }
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
  "scorecard_metrics": [
    {
      "metric_name": "Name of the metric discussed",
      "current_value": "Current value if mentioned", 
      "target_value": "Target/goal value",
      "trend": "improving|declining|stable|unknown",
      "discussion": "What was discussed about this metric"
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
  "team_dynamics": {
    "participation_level": "high|medium|low",
    "collaboration_quality": "excellent|good|fair|poor",
    "conflict_resolution": "Any conflicts and how they were handled",
    "leadership_effectiveness": "Assessment of meeting leadership"
  },
  "eos_adherence": {
    "level_10_structure": "How well did this follow Level 10 format",
    "time_management": "Was the meeting well-timed",
    "focus_level": "Did the team stay focused on agenda",
    "accountability": "Level of accountability demonstrated"
  },
  "next_meeting_preparation": [
    {
      "item": "What should be prepared for next meeting",
      "owner": "Who is responsible",
      "deadline": "When it should be ready"
    }
  ],
  "meeting_sentiment": "positive|neutral|negative|mixed",
  "meeting_energy_score": 1-10,
  "productivity_score": 1-10,
  "effectiveness_rating": {
    "score": 1-10,
    "rationale": "Why this score was given"
  },
  "improvement_suggestions": [
    "Specific suggestions for improving future meetings"
  ]
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
          action_items, issues_discussed, rocks_mentioned,
          scorecard_metrics, notable_quotes, team_dynamics,
          eos_adherence, next_meeting_preparation,
          meeting_sentiment, meeting_energy_score, productivity_score,
          effectiveness_rating, improvement_suggestions,
          ai_model, ai_prompt_version, ai_processing_time_seconds, ai_cost_usd,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW())
      `, [
        summaryId, meeting_id, transcriptId, organization_id,
        aiSummary.executive_summary,
        JSON.stringify(aiSummary.key_decisions),
        JSON.stringify(aiSummary.discussion_topics),
        JSON.stringify(aiSummary.action_items),
        JSON.stringify(aiSummary.issues_discussed),
        JSON.stringify(aiSummary.rocks_mentioned),
        JSON.stringify(aiSummary.scorecard_metrics),
        JSON.stringify(aiSummary.notable_quotes),
        JSON.stringify(aiSummary.team_dynamics),
        JSON.stringify(aiSummary.eos_adherence),
        JSON.stringify(aiSummary.next_meeting_preparation),
        aiSummary.meeting_sentiment,
        aiSummary.meeting_energy_score,
        aiSummary.productivity_score,
        JSON.stringify(aiSummary.effectiveness_rating),
        JSON.stringify(aiSummary.improvement_suggestions),
        aiSummary.ai_model,
        aiSummary.ai_prompt_version,
        processingTime,
        estimatedCost
      ]);

      console.log(`💾 Saved AI summary for transcript ${transcriptId}`);
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
}

// Create singleton instance
const aiSummaryService = new AISummaryService();

export default aiSummaryService;