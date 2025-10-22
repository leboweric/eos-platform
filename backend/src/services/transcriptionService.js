import WebSocket from 'ws';
import { getClient } from '../config/database.js';
import aiTranscriptionService from './aiTranscriptionService.js';

class TranscriptionService {
  constructor() {
    this.activeConnections = new Map(); // Store active WebSocket connections
    this.initializeService();
  }

  initializeService() {
    console.log('🔍 [TranscriptionService] Initializing Direct WebSocket Service...');
    console.log('🔍 [TranscriptionService] Environment check:', {
      hasAssemblyAIKey: !!process.env.ASSEMBLYAI_API_KEY,
      keyPreview: process.env.ASSEMBLYAI_API_KEY ? `${process.env.ASSEMBLYAI_API_KEY.substring(0, 8)}...` : 'NOT_SET'
    });
    
    if (process.env.ASSEMBLYAI_API_KEY) {
      console.log('✅ [TranscriptionService] Direct WebSocket service initialized successfully');
    } else {
      console.warn('⚠️ [TranscriptionService] ASSEMBLYAI_API_KEY not configured - transcription disabled');
    }
  }

  /**
   * Start real-time transcription session using direct WebSocket connection
   */
  async startRealtimeTranscription(transcriptId, organizationId) {
    console.log(`🔍 [TranscriptionService] startRealtimeTranscription called for transcript ${transcriptId}`);
    console.log(`🔍 [TranscriptionService] organizationId: ${organizationId}`);
    
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('❌ [TranscriptionService] ASSEMBLYAI_API_KEY not configured');
      throw new Error('AssemblyAI API key not configured');
    }

    try {
      console.log(`🎙️ [TranscriptionService] Starting direct WebSocket transcription for transcript ${transcriptId}`);
      
      // Connect directly to streaming.assemblyai.com (bypass SDK IP issue)
      const wsUrl = 'wss://streaming.assemblyai.com/v3/ws?sample_rate=16000';
      console.log('🔍 [TranscriptionService] Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: process.env.ASSEMBLYAI_API_KEY
        }
      });
      
      // Store connection details
      const connectionData = {
        websocket: ws,
        organizationId,
        transcriptChunks: [],
        startTime: new Date(),
        isActive: false, // Will be set to true when connected
        sessionId: null
      };
      
      this.activeConnections.set(transcriptId, connectionData);
      
      // Return a Promise that resolves when connection is established
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          this.activeConnections.delete(transcriptId);
          reject(new Error('WebSocket connection timeout after 10 seconds'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ [TranscriptionService] Connected to streaming.assemblyai.com');
          
          connectionData.isActive = true;
          
          // Configure the session
          ws.send(JSON.stringify({
            sample_rate: 16000,
            encoding: 'pcm_s16le',
            language_code: 'en',
            punctuate: true,
            format_text: true
          }));
          
          console.log('🔧 [TranscriptionService] Session configuration sent');
          
          resolve({
            sessionId: transcriptId,
            status: 'connected'
          });
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📨 [TranscriptionService] Message received:', message.message_type);
            
            if (message.message_type === 'SessionBegins') {
              console.log('🎬 [TranscriptionService] Session started:', message.session_id);
              connectionData.sessionId = message.session_id;
            } else if (message.message_type === 'PartialTranscript') {
              console.log('🔄 [TranscriptionService] Partial transcript:', message.text);
              
              // Emit partial updates for real-time display
              this.emitTranscriptUpdate(transcriptId, {
                type: 'partial_transcript',
                text: message.text,
                speaker: 'Speaker'
              });
            } else if (message.message_type === 'FinalTranscript') {
              console.log('📝 [TranscriptionService] Final transcript:', message.text);
              
              connectionData.transcriptChunks.push({
                text: message.text,
                confidence: message.confidence,
                speaker: 'Speaker',
                timestamp: new Date().toISOString(),
                start_time: message.audio_start,
                end_time: message.audio_end
              });
              
              // Emit final transcript chunk
              this.emitTranscriptUpdate(transcriptId, {
                type: 'transcript_chunk',
                text: message.text,
                speaker: 'Speaker',
                confidence: message.confidence
              });
            }
          } catch (parseError) {
            console.error('❌ [TranscriptionService] Failed to parse message:', parseError);
          }
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          console.error('❌ [TranscriptionService] WebSocket error:', {
            message: error.message,
            code: error.code,
            errno: error.errno
          });
          
          connectionData.isActive = false;
          
          this.emitTranscriptUpdate(transcriptId, {
            type: 'error',
            message: 'Transcription connection error'
          });
          
          if (ws.readyState === WebSocket.CONNECTING) {
            reject(error);
          }
        });
        
        ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          console.log('🔌 [TranscriptionService] WebSocket closed:', {
            code,
            reason: reason?.toString(),
            wasActive: connectionData.isActive
          });
          
          connectionData.isActive = false;
          
          if (code === 1006) {
            console.error('🔍 [TranscriptionService] Code 1006 - This was the TLS certificate issue!');
            console.error('🎯 [TranscriptionService] Should be fixed with direct hostname connection');
          }
        });
      });

    } catch (error) {
      console.error(`❌ [TranscriptionService] Failed to start real-time transcription:`, error.message);
      console.error(`❌ [TranscriptionService] Error stack:`, error.stack);
      console.error(`❌ [TranscriptionService] Error details:`, {
        name: error.name,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      });
      
      // Update transcript status to failed
      try {
        await this.updateTranscriptStatus(transcriptId, 'failed', {
          error_message: error.message
        });
        console.log('✅ [TranscriptionService] Updated transcript status to failed');
      } catch (updateError) {
        console.error('❌ [TranscriptionService] Failed to update transcript status:', updateError.message);
      }

      throw error;
    }
  }

  /**
   * Set up event handlers for the transcriber
   */
  setupTranscriberEvents(transcriber, transcriptId) {
    const connection = this.activeConnections.get(transcriptId);
    if (!connection) return;

    // Handle transcript chunks
    transcriber.on('transcript', (transcript) => {
      if (transcript.message_type === 'FinalTranscript') {
        console.log(`📝 Final transcript chunk for ${transcriptId}:`, transcript.text);
        
        connection.transcriptChunks.push({
          text: transcript.text,
          confidence: transcript.confidence,
          speaker: transcript.speaker || 'Speaker',
          timestamp: new Date().toISOString(),
          start_time: transcript.audio_start,
          end_time: transcript.audio_end
        });

        // Emit to meeting participants via socket
        this.emitTranscriptUpdate(transcriptId, {
          type: 'transcript_chunk',
          text: transcript.text,
          speaker: transcript.speaker || 'Speaker',
          confidence: transcript.confidence
        });
      }
    });

    // Handle partial transcripts (real-time feedback)
    transcriber.on('partial-transcript', (partial) => {
      console.log(`🔄 Partial transcript for ${transcriptId}:`, partial.text);
      
      // Emit partial updates for real-time display
      this.emitTranscriptUpdate(transcriptId, {
        type: 'partial_transcript',
        text: partial.text,
        speaker: partial.speaker || 'Speaker'
      });
    });

    // Handle errors with detailed logging
    transcriber.on('error', (error) => {
      console.error('[TranscriptionService] DETAILED ERROR:', {
        transcriptId,
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        fullError: error
      });
      connection.isActive = false;
      
      this.emitTranscriptUpdate(transcriptId, {
        type: 'error',
        message: 'Transcription error occurred'
      });
    });

    // Handle connection close with detailed logging
    transcriber.on('close', (code, reason) => {
      console.error('[TranscriptionService] CONNECTION CLOSED:', {
        transcriptId,
        code,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
        wasActive: connection.isActive
      });
      connection.isActive = false;
    });
  }

  /**
   * Send audio data to AssemblyAI via direct WebSocket
   */
  async sendAudioData(transcriptId, audioBuffer) {
    const connection = this.activeConnections.get(transcriptId);
    
    if (!connection || !connection.isActive) {
      console.warn(`⚠️ No active connection for transcript ${transcriptId}`);
      return false;
    }

    try {
      // Send audio data directly via WebSocket
      if (connection.websocket && connection.websocket.readyState === WebSocket.OPEN) {
        connection.websocket.send(audioBuffer);
        return true;
      } else {
        console.warn(`⚠️ WebSocket not ready for transcript ${transcriptId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to send audio data for ${transcriptId}:`, error);
      return false;
    }
  }

  /**
   * Stop real-time transcription
   */
  async stopRealtimeTranscription(transcriptId) {
    const connection = this.activeConnections.get(transcriptId);
    
    if (!connection) {
      console.warn(`⚠️ No connection found for transcript ${transcriptId}`);
      return null;
    }

    try {
      console.log(`🛑 Stopping real-time transcription for ${transcriptId}`);

      // Mark as inactive
      connection.isActive = false;

      // Close the WebSocket connection
      if (connection.websocket) {
        connection.websocket.send(JSON.stringify({ terminate_session: true }));
        connection.websocket.close();
      }

      // Calculate duration
      const endTime = new Date();
      const durationSeconds = Math.round((endTime - connection.startTime) / 1000);

      // Combine all transcript chunks
      const fullTranscript = connection.transcriptChunks
        .map(chunk => `${chunk.speaker}: ${chunk.text}`)
        .join('\n');

      const wordCount = fullTranscript.split(' ').length;

      // Save transcript to database
      await this.saveTranscriptContent(transcriptId, {
        rawTranscript: fullTranscript,
        structuredTranscript: connection.transcriptChunks,
        wordCount,
        durationSeconds
      });

      // Clean up connection
      this.activeConnections.delete(transcriptId);

      console.log(`✅ Transcription stopped for ${transcriptId}. Duration: ${durationSeconds}s, Words: ${wordCount}`);

      return {
        transcriptId,
        fullTranscript,
        wordCount,
        durationSeconds,
        chunks: connection.transcriptChunks
      };

    } catch (error) {
      console.error(`❌ Failed to stop transcription for ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Save transcript content to database
   */
  async saveTranscriptContent(transcriptId, data) {
    console.log('[SAVE] 🆔 Saving transcript ID:', transcriptId);
    console.log('[SAVE] 🆔 Content data:', {
      transcriptId,
      wordCount: data.wordCount,
      durationSeconds: data.durationSeconds,
      hasRawTranscript: !!data.rawTranscript,
      rawTranscriptLength: data.rawTranscript?.length,
      timestamp: new Date().toISOString()
    });
    
    const client = await getClient();
    try {
      await client.query(`
        UPDATE meeting_transcripts 
        SET 
          raw_transcript = $2,
          transcript_json = $3,
          word_count = $4,
          audio_duration_seconds = $5,
          status = 'processing_ai',
          updated_at = NOW()
        WHERE id = $1
      `, [
        transcriptId,
        data.rawTranscript,
        JSON.stringify(data.structuredTranscript),
        data.wordCount,
        data.durationSeconds
      ]);

      console.log(`💾 Saved transcript content for ${transcriptId}`);
      
      // Trigger AI analysis if transcript has content
      if (data.rawTranscript && data.rawTranscript.trim().length > 50) {
        console.log('[AI-TRIGGER] 🆔 Triggering AI analysis for transcript ID:', transcriptId);
        console.log('[AI-TRIGGER] 🆔 Context:', {
          transcriptId,
          transcriptLength: data.rawTranscript.length,
          wordCount: data.wordCount,
          timestamp: new Date().toISOString()
        });
        
        // Trigger AI analysis using the proper service (async, don't block)
        console.log(`🤖 [TranscriptionService] Triggering AI analysis for ${transcriptId}`);
        aiTranscriptionService.processTranscriptWithAI(transcriptId, data.rawTranscript, data.structuredTranscript).catch(error => {
          console.error(`❌ [TranscriptionService] Error triggering AI analysis: ${error.message}`);
          console.error(`❌ [TranscriptionService] Full error:`, error);
        });
      }
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

      console.log(`📊 Updated transcript ${transcriptId} status to: ${status}`);
    } finally {
      client.release();
    }
  }

  /**
   * Emit transcript updates to meeting participants
   */
  emitTranscriptUpdate(transcriptId, data) {
    console.log(`📡 Emitting transcript update for ${transcriptId}:`, data.type);
    
    // Import meetingSocketService dynamically to avoid circular dependency
    import('./meetingSocketService.js').then(({ default: meetingSocketService }) => {
      if (meetingSocketService.io) {
        // Broadcast to all connected clients (they'll filter by transcript ID)
        meetingSocketService.io.emit('transcript-update', {
          transcriptId,
          ...data
        });
      }
    }).catch(error => {
      console.error('Error importing meetingSocketService:', error);
    });
  }

  /**
   * Trigger AI analysis for completed transcript
   */
  async triggerAIAnalysis(transcriptId, rawTranscript) {
    console.log('[AI-START] 🆔 Analyzing transcript ID:', transcriptId);
    console.log('[AI-START] 🆔 Context:', {
      transcriptId,
      rawTranscriptLength: rawTranscript?.length,
      startTime: new Date().toISOString()
    });
    
    const client = await getClient();
    try {
      // VERIFY THE TRANSCRIPT EXISTS FIRST (catch ghost transcript issue)
      console.log('[AI-ANALYSIS] 🔍 Verifying transcript exists in database...');
      const transcriptCheck = await client.query(
        'SELECT id, meeting_id, status FROM meeting_transcripts WHERE id = $1',
        [transcriptId]
      );
      
      if (transcriptCheck.rows.length === 0) {
        console.error('[AI-ANALYSIS] ❌ CRITICAL: Transcript does not exist in database!', {
          transcriptId,
          thisIsTheProblem: 'AI is being triggered with a transcript ID that was never saved',
          possibleCause: 'Duplicate transcript creation or ghost ID generation'
        });
        throw new Error(`Transcript ${transcriptId} not found in database - this is the ghost transcript bug!`);
      }
      
      console.log('[AI-ANALYSIS] ✅ Transcript exists in database:', {
        transcriptId,
        meetingId: transcriptCheck.rows[0].meeting_id,
        status: transcriptCheck.rows[0].status
      });
      
      console.log(`🤖 [TranscriptionService] Starting AI analysis for ${transcriptId}`);
      
      // Get transcript details for meetingId and organizationId
      const transcriptQuery = await client.query(`
        SELECT mt.*, m.organization_id as meeting_organization_id
        FROM meeting_transcripts mt
        LEFT JOIN meetings m ON mt.meeting_id = m.id
        WHERE mt.id = $1
      `, [transcriptId]);
      
      if (transcriptQuery.rows.length === 0) {
        throw new Error(`Transcript ${transcriptId} not found`);
      }
      
      const transcript = transcriptQuery.rows[0];
      const meetingId = transcript.meeting_id;
      const organizationId = transcript.organization_id || transcript.meeting_organization_id;
      
      console.log('[DEBUG] 🆔 Variable assignments:', {
        inputTranscriptId: transcriptId,
        extractedMeetingId: meetingId,
        extractedOrgId: organizationId,
        transcriptRecordId: transcript.id,
        transcriptMeetingId: transcript.meeting_id
      });
      
      console.log(`🔍 [TranscriptionService] Processing transcript for meeting ${meetingId}, org ${organizationId}`);
      
      // Import OpenAI for analysis
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // AI analysis prompt
      const prompt = `Analyze this meeting transcript and extract key information in JSON format:

TRANSCRIPT:
${rawTranscript}

Please provide a JSON response with the following structure:
{
  "executive_summary": "2-3 paragraph summary of the meeting",
  "key_decisions": ["Decision 1", "Decision 2"],
  "action_items": ["Action item 1", "Action item 2"],
  "issues_discussed": ["Issue 1", "Issue 2"],
  "meeting_sentiment": "positive/neutral/negative",
  "effectiveness_rating": 8.5
}`;

      console.log(`🧠 [TranscriptionService] Sending to GPT-4 for analysis...`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const analysisText = response.choices[0].message.content.trim();
      let analysis;
      
      try {
        // Extract JSON from response
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI analysis JSON:', parseError);
        throw new Error('Invalid AI analysis response format');
      }
      
      console.log(`✅ [TranscriptionService] AI analysis completed successfully`);
      
      // Save to database with CORRECT column names
      const { v4: uuidv4 } = await import('uuid');
      const summaryId = uuidv4();
      
      // DOUBLE CHECK: Ensure we have the right IDs
      console.log('[DEBUG] 🆔 Final ID validation before INSERT:', {
        originalTranscriptId: transcriptId,
        extractedMeetingId: meetingId,
        extractedOrgId: organizationId,
        summaryId: summaryId,
        schemaOrder: 'id, meeting_id, transcript_id, organization_id...'
      });
      
      // Build parameters array with CORRECT column order (meeting_id before transcript_id!)
      const parameters = [
        summaryId,                                          // $1: id
        meetingId,                                          // $2: meeting_id 
        transcriptId,                                       // $3: transcript_id (MUST be original transcript ID!)
        organizationId,                                     // $4: organization_id
        analysis.executive_summary || 'No summary provided', // $5: executive_summary
        JSON.stringify(analysis.key_decisions || []),       // $6: key_decisions
        JSON.stringify(analysis.action_items || []),        // $7: action_items
        JSON.stringify(analysis.issues_discussed || []),    // $8: issues_discussed
        'gpt-4'                                             // $9: ai_model
      ];
      
      // Validate all parameters are non-null
      const hasNullParams = parameters.some((p, i) => p === null || p === undefined);
      if (hasNullParams) {
        console.error('[AIAnalysis] NULL parameters detected:', parameters.map((p, i) => `$${i+1}: ${p}`));
        throw new Error('NULL parameters not allowed in AI summary insert');
      }
      
      console.log('[AI-INSERT] 🆔 Inserting for transcript ID:', transcriptId);
      console.log('[AI-INSERT] 🆔 Parameters:', {
        summaryId: parameters[0],
        meetingId: parameters[1],
        transcriptId: parameters[2],  // Should match!
        organizationId: parameters[3],
        timestamp: new Date().toISOString()
      });
      
      console.log('[AIAnalysis] About to insert with parameters:', {
        paramCount: parameters.length,
        expectedParams: 9,
        transcriptId,
        meetingId,
        organizationId,
        hasSummary: !!analysis.executive_summary,
        hasDecisions: !!(analysis.key_decisions && analysis.key_decisions.length),
        hasActionItems: !!(analysis.action_items && analysis.action_items.length),
        parameters: parameters.map((p, i) => `$${i+1}: ${typeof p} (${String(p).substring(0, 50)}...)`)
      });
      
      await client.query(`
        INSERT INTO meeting_ai_summaries (
          id, meeting_id, transcript_id, organization_id,
          executive_summary, key_decisions, action_items, issues_discussed,
          ai_model, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, parameters);
      
      // Update transcript status to completed
      await this.updateTranscriptStatus(transcriptId, 'completed');
      
      console.log(`🎉 [TranscriptionService] AI analysis saved for ${transcriptId}`);
      
    } catch (error) {
      console.error(`❌ [TranscriptionService] AI analysis failed for ${transcriptId}:`, error);
      
      // Update transcript status to failed
      await this.updateTranscriptStatus(transcriptId, 'failed', {
        error_message: `AI analysis failed: ${error.message}`
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active transcription session
   */
  getActiveSession(transcriptId) {
    return this.activeConnections.get(transcriptId);
  }

  /**
   * Check if transcription is active for transcript ID
   */
  isTranscriptionActive(transcriptId) {
    const connection = this.activeConnections.get(transcriptId);
    return connection && connection.isActive;
  }

  /**
   * Get transcription statistics
   */
  getStats() {
    const activeSessions = Array.from(this.activeConnections.values())
      .filter(conn => conn.isActive).length;
    
    return {
      activeSessions,
      totalSessions: this.activeConnections.size,
      assemblyAIConfigured: !!process.env.ASSEMBLYAI_API_KEY
    };
  }

  /**
   * Clean up inactive connections (called periodically)
   */
  cleanupInactiveConnections() {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    for (const [transcriptId, connection] of this.activeConnections.entries()) {
      if (!connection.isActive || connection.startTime < cutoffTime) {
        console.log(`🧹 Cleaning up inactive connection for transcript ${transcriptId}`);
        
        if (connection.websocket) {
          try {
            connection.websocket.close();
          } catch (err) {
            console.error(`Error closing WebSocket for ${transcriptId}:`, err);
          }
        }
        
        this.activeConnections.delete(transcriptId);
      }
    }
  }
}

// Create singleton instance
const transcriptionService = new TranscriptionService();

// Clean up inactive connections every 10 minutes
setInterval(() => {
  transcriptionService.cleanupInactiveConnections();
}, 10 * 60 * 1000);

export default transcriptionService;