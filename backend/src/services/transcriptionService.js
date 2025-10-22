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
      
      // Connect to Universal Streaming API (v3) - new endpoint
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
      
      // Store connection details
      const connectionData = {
        websocket: ws,
        organizationId,
        transcriptChunks: [],
        latestTranscriptText: '', // Store latest transcript for v3 API partial transcripts
        latestTurnOrder: 0,
        startTime: new Date(),
        isActive: false, // Will be set to true when connected
        sessionId: null
      };
      
      this.activeConnections.set(transcriptId, connectionData);
      console.log('🔑 [TranscriptionService] Connection stored for transcript:', {
        transcriptId,
        totalConnections: this.activeConnections.size,
        connectionStored: this.activeConnections.has(transcriptId)
      });
      
      // Return a Promise that resolves when connection is established
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          this.activeConnections.delete(transcriptId);
          reject(new Error('WebSocket connection timeout after 10 seconds'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ [WebSocket] OPEN event fired for transcript:', transcriptId);
          console.log('✅ [TranscriptionService] Connected to streaming.assemblyai.com');
          
          connectionData.isActive = true;
          console.log('🟢 [WebSocket] Connection marked as ACTIVE:', {
            transcriptId,
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
          console.log('🔌 [WebSocket] CLOSE event fired:', {
            transcriptId,
            code,
            reason: reason?.toString(),
            wasClean: code === 1000,
            wasActive: connectionData.isActive,
            readyState: ws.readyState
          });
          
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
    console.log('🔍 [sendAudioData] Looking for connection:', {
      transcriptId,
      totalConnections: this.activeConnections.size,
      allConnectionIds: Array.from(this.activeConnections.keys()),
      hasThisConnection: this.activeConnections.has(transcriptId)
    });
    
    const connection = this.activeConnections.get(transcriptId);
    
    if (!connection || !connection.isActive) {
      console.warn(`⚠️ No active connection for transcript ${transcriptId}`, {
        connectionExists: !!connection,
        isActive: connection?.isActive,
        allConnections: Array.from(this.activeConnections.entries()).map(([id, conn]) => ({
          id,
          isActive: conn.isActive,
          hasWebSocket: !!conn.websocket
        }))
      });
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
}

// Create singleton instance
const transcriptionService = new TranscriptionService();

// Clean up inactive connections every 10 minutes
setInterval(() => {
  transcriptionService.cleanupInactiveConnections();
}, 10 * 60 * 1000);

export default transcriptionService;