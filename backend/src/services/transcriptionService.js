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
    console.log('🔍 [TranscriptionService] WebSocket availability check:', {
      WebSocketClass: typeof WebSocket,
      WebSocketConstructor: !!WebSocket,
      nodeVersion: process.version
    });
    
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('❌ [TranscriptionService] ASSEMBLYAI_API_KEY not configured');
      throw new Error('AssemblyAI API key not configured');
    }

    try {
      console.log(`🎙️ [TranscriptionService] Starting direct WebSocket transcription for transcript ${transcriptId}`);
      
      // STEP 1: Store connection IMMEDIATELY (before WebSocket creation) to prevent race conditions
      const connectionData = {
        websocket: null, // Will be set after WebSocket creation
        organizationId,
        transcriptChunks: [],
        latestTranscriptText: '', // Store latest transcript for v3 API partial transcripts
        latestTurnOrder: 0,
        startTime: new Date(),
        status: 'connecting', // Track connection state: 'connecting' | 'active' | 'failed'
        isActive: false, // Legacy field for backward compatibility
        sessionId: null,
        audioBuffer: [], // Buffer audio chunks while connecting
        errorMessage: null
      };
      
      this.activeConnections.set(transcriptId, connectionData);
      console.log('🔑 [TranscriptionService] Connection stored BEFORE WebSocket creation:', {
        transcriptId,
        status: connectionData.status,
        totalConnections: this.activeConnections.size,
        connectionStored: this.activeConnections.has(transcriptId)
      });
      
      // STEP 2: Create WebSocket connection
      const sampleRate = 16000;
      const encoding = 'pcm_s16le';
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${sampleRate}&encoding=${encoding}&token=${process.env.ASSEMBLYAI_API_KEY}`;
      console.log('🔍 [TranscriptionService] Connecting to Universal Streaming API v3:', wsUrl.replace(process.env.ASSEMBLYAI_API_KEY, 'xxx...xxx'));
      
      console.log('🔗 [WebSocket] Creating connection:', {
        url: wsUrl,
        hasApiKey: !!process.env.ASSEMBLYAI_API_KEY,
        apiKeyPreview: process.env.ASSEMBLYAI_API_KEY ? `${process.env.ASSEMBLYAI_API_KEY.substring(0, 8)}...` : 'NONE'
      });
      
      // Universal Streaming API uses token in URL, no headers needed
      const ws = new WebSocket(wsUrl);
      
      console.log('🔍 [WebSocket] Created with readyState:', {
        transcriptId,
        readyState: ws.readyState,
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED,
        url: ws.url
      });
      
      // STEP 3: Update connection with WebSocket reference
      connectionData.websocket = ws;
      
      // STEP 4: Set up Promise with improved error handling
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('⏰ [WebSocket] Connection timeout after 10 seconds for transcript:', transcriptId);
          ws.close();
          // Don't delete connection - mark as failed to allow retry
          connectionData.status = 'failed';
          connectionData.errorMessage = 'WebSocket connection timeout after 10 seconds';
          console.log('❌ [TranscriptionService] Connection marked as FAILED (timeout):', {
            transcriptId,
            status: connectionData.status,
            totalConnections: this.activeConnections.size
          });
          reject(new Error('WebSocket connection timeout after 10 seconds'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ [WebSocket] OPEN event fired for transcript:', transcriptId);
          console.log('✅ [TranscriptionService] Connected to streaming.assemblyai.com');
          
          connectionData.isActive = true;
          connectionData.status = 'active';
          console.log('🟢 [WebSocket] Connection marked as ACTIVE:', {
            transcriptId,
            status: connectionData.status,
            isActive: connectionData.isActive,
            connectionExists: this.activeConnections.has(transcriptId)
          });
          
          // Universal Streaming API v3 - no session config needed, parameters are in URL
          console.log('🔧 [TranscriptionService] Universal Streaming API connected - ready to receive audio');
          
          resolve({
            sessionId: transcriptId,
            status: 'connected'
          });
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📨 [WebSocket] MESSAGE event fired:', {
              transcriptId,
              messageType: message.type || 'transcript',
              messagePreview: JSON.stringify(message).substring(0, 100),
              hasTranscript: !!message.transcript,
              endOfTurn: message.end_of_turn
            });
            
            // Universal Streaming API v3 format
            if (message.type === 'Begin') {
              console.log('🎬 [WebSocket] Session Begin received:', {
                transcriptId,
                sessionId: message.id,
                expires_at: message.expires_at
              });
              connectionData.sessionId = message.id;
            } else if (message.transcript) {
              // v3 API provides transcript in every message
              const isPartial = !message.end_of_turn;
              
              console.log(`${isPartial ? '🔄' : '📝'} [WebSocket] ${isPartial ? 'Partial' : 'Final'}Transcript:`, {
                transcriptId,
                text: message.transcript?.substring(0, 50) + '...',
                turnOrder: message.turn_order,
                endOfTurn: message.end_of_turn,
                isFormatted: message.turn_is_formatted
              });
              
              // CRITICAL: Store the latest transcript text (partial or final)
              // This ensures we capture content even if end_of_turn never comes
              connectionData.latestTranscriptText = message.transcript;
              connectionData.latestTurnOrder = message.turn_order;
              
              if (isPartial) {
                // Emit partial updates for real-time display
                this.emitTranscriptUpdate(transcriptId, {
                  type: 'partial_transcript',
                  text: message.transcript,
                  speaker: 'Speaker'
                });
              } else {
                // Final transcript - store it in chunks AND update latest
                connectionData.transcriptChunks.push({
                  text: message.transcript,
                  confidence: message.confidence || 0.9, // v3 doesn't always provide confidence
                  speaker: 'Speaker',
                  timestamp: new Date().toISOString(),
                  turn_order: message.turn_order,
                  start_time: message.audio_start,
                  end_time: message.audio_end
                });
                
                // Emit final transcript chunk
                this.emitTranscriptUpdate(transcriptId, {
                  type: 'transcript_chunk',
                  text: message.transcript,
                  speaker: 'Speaker',
                  confidence: message.confidence
                });
                
                // Clear latest text since it's now in chunks
                connectionData.latestTranscriptText = '';
              }
            }
          } catch (parseError) {
            console.error('❌ [WebSocket] Failed to parse message:', {
              transcriptId,
              error: parseError.message,
              rawData: data.toString().substring(0, 200)
            });
          }
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          console.error('❌ [WebSocket] ERROR event fired:', {
            transcriptId,
            message: error.message,
            code: error.code,
            errno: error.errno,
            type: error.type,
            fullError: error
          });
          
          // STEP 3: Update connection to failed status instead of just marking inactive
          connectionData.status = 'failed';
          connectionData.isActive = false;
          connectionData.errorMessage = error.message;
          
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
          console.log('🔌 [WebSocket] CLOSE event fired:', {
            transcriptId,
            code,
            reason: reason?.toString(),
            wasClean: code === 1000,
            wasActive: connectionData.isActive,
            readyState: ws.readyState
          });
          
          // STEP 3: Update connection status instead of just marking inactive
          if (code === 1000) {
            // Clean closure - mark as completed
            connectionData.status = 'completed';
          } else {
            // Abnormal closure - mark as failed
            connectionData.status = 'failed';
            connectionData.errorMessage = `WebSocket closed with code ${code}: ${reason?.toString() || 'Unknown reason'}`;
          }
          connectionData.isActive = false;
          
          if (code === 1006) {
            console.error('🔍 [WebSocket] Code 1006 - Abnormal closure (possible TLS/network issue)');
          } else if (code === 1002) {
            console.error('🔍 [WebSocket] Code 1002 - Protocol error');
          } else if (code === 1003) {
            console.error('🔍 [WebSocket] Code 1003 - Unsupported data type');
          } else if (code === 3005) {
            console.error('🔍 [WebSocket] Code 3005 - Invalid Message Type (session config format issue)');
            console.error('🔍 [WebSocket] This indicates the session configuration was sent in wrong format');
          } else if (code === 4000) {
            console.error('🔍 [WebSocket] Code 4000 - AssemblyAI specific error');
          } else if (code === 4105) {
            console.error('🔍 [WebSocket] Code 4105 - Model deprecated. Using Universal Streaming API v3 now.');
            console.error('🔍 [WebSocket] The old v2/realtime endpoint is no longer supported');
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
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`📝 Final transcript chunk for ${transcriptId}:`, transcript.text);
        }
        
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
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`🔄 Partial transcript for ${transcriptId}:`, partial.text);
      }
      
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
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('🔍 [sendAudioData] Looking for connection:', {
        transcriptId,
        totalConnections: this.activeConnections.size,
        allConnectionIds: Array.from(this.activeConnections.keys()),
        hasThisConnection: this.activeConnections.has(transcriptId)
      });
    }
    
    const connection = this.activeConnections.get(transcriptId);
    
    if (!connection) {
      console.warn(`⚠️ No connection found for transcript ${transcriptId}`, {
        totalConnections: this.activeConnections.size,
        allConnectionIds: Array.from(this.activeConnections.keys())
      });
      return false;
    }

    // STEP 4: Enhanced status checking and audio buffering
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('🔍 [sendAudioData] Connection status check:', {
        transcriptId,
        status: connection.status,
        isActive: connection.isActive,
        hasWebSocket: !!connection.websocket,
        wsReadyState: connection.websocket?.readyState,
        bufferSize: connection.audioBuffer?.length || 0
      });
    }

    // Check connection status and handle accordingly
    if (connection.status === 'failed') {
      console.error(`❌ [sendAudioData] Connection failed for transcript ${transcriptId}: ${connection.errorMessage}`);
      return false;
    }

    if (connection.status === 'connecting') {
      // Buffer audio data while connecting
      console.log(`🔄 [sendAudioData] Connection still connecting, buffering audio for ${transcriptId}`);
      if (!connection.audioBuffer) {
        connection.audioBuffer = [];
      }
      connection.audioBuffer.push(audioBuffer);
      console.log(`📦 [sendAudioData] Buffered audio chunk, total buffered: ${connection.audioBuffer.length}`);
      return true; // Return true to indicate audio was handled (buffered)
    }

    if (connection.status === 'active' && connection.websocket && connection.websocket.readyState === WebSocket.OPEN) {
      try {
        // STEP 4: Send any buffered audio first
        if (connection.audioBuffer && connection.audioBuffer.length > 0) {
          console.log(`📤 [sendAudioData] Sending ${connection.audioBuffer.length} buffered audio chunks for ${transcriptId}`);
          for (const bufferedChunk of connection.audioBuffer) {
            connection.websocket.send(bufferedChunk);
          }
          connection.audioBuffer = []; // Clear buffer after sending
          console.log(`✅ [sendAudioData] Sent all buffered audio for ${transcriptId}`);
        }

        // Send current audio data
        connection.websocket.send(audioBuffer);
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`📤 [sendAudioData] Sent real-time audio data for ${transcriptId}`);
        }
        return true;
      } catch (error) {
        console.error(`❌ [sendAudioData] Failed to send audio data for ${transcriptId}:`, error);
        // Mark connection as failed
        connection.status = 'failed';
        connection.errorMessage = error.message;
        return false;
      }
    } else {
      console.warn(`⚠️ [sendAudioData] WebSocket not ready for transcript ${transcriptId}`, {
        status: connection.status,
        hasWebSocket: !!connection.websocket,
        readyState: connection.websocket?.readyState
      });
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
      let fullTranscript = connection.transcriptChunks
        .map(chunk => `${chunk.speaker}: ${chunk.text}`)
        .join('\n');

      // CRITICAL: Include latest transcript text if no chunks were saved
      // This handles the case where we only received partial transcripts
      if (fullTranscript.length === 0 && connection.latestTranscriptText) {
        fullTranscript = `Speaker: ${connection.latestTranscriptText}`;
        console.log('📝 [StopTranscription] Using latest transcript text (no final chunks saved):', {
          transcriptId,
          textLength: connection.latestTranscriptText.length,
          textPreview: connection.latestTranscriptText.substring(0, 100) + '...'
        });
      } else if (connection.latestTranscriptText && fullTranscript.length > 0) {
        // Append any remaining latest text to existing chunks
        fullTranscript += `\nSpeaker: ${connection.latestTranscriptText}`;
        console.log('📝 [StopTranscription] Appending latest transcript text to chunks:', {
          transcriptId,
          chunksCount: connection.transcriptChunks.length,
          latestTextLength: connection.latestTranscriptText.length
        });
      }

      const wordCount = fullTranscript.length > 0 ? fullTranscript.split(' ').length : 0;

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

  /**
   * Save all active transcription sessions to database for graceful shutdown
   */
  async saveAllActiveSessions() {
    const activeSessions = Array.from(this.activeConnections.entries());
    console.log(`💾 [TranscriptionService] Saving ${activeSessions.length} active session(s) to database`);
    
    if (activeSessions.length === 0) {
      console.log('💾 [TranscriptionService] No active sessions to save');
      return;
    }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const [transcriptId, sessionData] of activeSessions) {
        try {
          // Accumulate all transcript chunks into a single text
          const partialTranscript = sessionData.transcriptChunks
            .map(chunk => chunk.text || '')
            .join(' ')
            .trim();

          await client.query(`
            INSERT INTO transcription_sessions (
              transcript_id, organization_id, partial_transcript, status, 
              started_at, last_activity_at
            ) VALUES ($1, $2, $3, 'active', $4, NOW())
            ON CONFLICT (transcript_id) 
            DO UPDATE SET 
              partial_transcript = EXCLUDED.partial_transcript,
              last_activity_at = NOW(),
              updated_at = NOW()
          `, [
            transcriptId,
            sessionData.organizationId,
            partialTranscript,
            sessionData.startTime
          ]);
          
          console.log(`💾 [TranscriptionService] Saved session ${transcriptId} (${partialTranscript.length} chars)`);
        } catch (error) {
          console.error(`❌ [TranscriptionService] Error saving session ${transcriptId}:`, error);
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ [TranscriptionService] Successfully saved ${activeSessions.length} session(s)`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [TranscriptionService] Error saving sessions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all WebSocket connections gracefully
   */
  async closeAllConnections() {
    console.log(`🔌 [TranscriptionService] Closing ${this.activeConnections.size} WebSocket connection(s)`);
    
    const closePromises = [];
    
    for (const [transcriptId, connection] of this.activeConnections.entries()) {
      if (connection.websocket) {
        closePromises.push(
          new Promise((resolve) => {
            try {
              connection.websocket.close(1000, 'Server shutting down');
              console.log(`🔌 [TranscriptionService] Closed connection ${transcriptId}`);
            } catch (error) {
              console.error(`❌ [TranscriptionService] Error closing connection ${transcriptId}:`, error);
            }
            resolve();
          })
        );
      }
    }
    
    await Promise.all(closePromises);
    this.activeConnections.clear();
    console.log('✅ [TranscriptionService] All connections closed');
  }

  /**
   * Recover a transcription session from database
   */
  async recoverSession(transcriptId) {
    try {
      const client = await getClient();
      
      const result = await client.query(`
        SELECT * FROM transcription_sessions
        WHERE transcript_id = $1 AND status = 'active'
        ORDER BY last_activity_at DESC
        LIMIT 1
      `, [transcriptId]);
      
      client.release();
      
      if (result.rows.length > 0) {
        const session = result.rows[0];
        console.log(`🔄 [TranscriptionService] Recovered session ${transcriptId} from database`);
        console.log(`🔄 [TranscriptionService] Session data: ${session.partial_transcript?.length || 0} chars, last active: ${session.last_activity_at}`);
        return session;
      }
      
      console.log(`🔄 [TranscriptionService] No session found in database for ${transcriptId}`);
      return null;
    } catch (error) {
      console.error(`❌ [TranscriptionService] Error recovering session ${transcriptId}:`, error);
      return null;
    }
  }

  /**
   * Mark a session as completed in database
   */
  async completeSession(transcriptId) {
    try {
      const client = await getClient();
      
      await client.query(`
        UPDATE transcription_sessions 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE transcript_id = $1
      `, [transcriptId]);
      
      client.release();
      console.log(`✅ [TranscriptionService] Marked session ${transcriptId} as completed`);
    } catch (error) {
      console.error(`❌ [TranscriptionService] Error completing session ${transcriptId}:`, error);
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