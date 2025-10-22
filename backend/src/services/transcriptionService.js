import { AssemblyAI, RealtimeTranscriber } from 'assemblyai';
import db from '../config/database.js';

class TranscriptionService {
  constructor() {
    this.assemblyAI = null;
    this.activeConnections = new Map(); // Store active transcription sessions
    this.initializeAssemblyAI();
  }

  initializeAssemblyAI() {
    console.log('🔍 [TranscriptionService] Initializing AssemblyAI...');
    console.log('🔍 [TranscriptionService] Environment check:', {
      hasAssemblyAIKey: !!process.env.ASSEMBLYAI_API_KEY,
      keyPreview: process.env.ASSEMBLYAI_API_KEY ? `${process.env.ASSEMBLYAI_API_KEY.substring(0, 8)}...` : 'NOT_SET'
    });
    
    if (process.env.ASSEMBLYAI_API_KEY) {
      try {
        this.assemblyAI = new AssemblyAI({
          apiKey: process.env.ASSEMBLYAI_API_KEY,
        });
        
        console.log('✅ [TranscriptionService] AssemblyAI service initialized successfully');
        
        // Debug: Check what methods are available on the client
        console.log('🔍 [TranscriptionService] Available methods on client:', {
          hasRealtime: !!this.assemblyAI.realtime,
          realtimeType: typeof this.assemblyAI.realtime,
          realtimeMethods: this.assemblyAI.realtime ? Object.getOwnPropertyNames(this.assemblyAI.realtime) : 'N/A',
          clientMethods: Object.getOwnPropertyNames(this.assemblyAI).slice(0, 10) // First 10 methods
        });
        
      } catch (error) {
        console.error('❌ [TranscriptionService] Failed to initialize AssemblyAI:', error.message);
        throw error;
      }
    } else {
      console.warn('⚠️ [TranscriptionService] ASSEMBLYAI_API_KEY not configured - transcription disabled');
    }
  }

  /**
   * Start real-time transcription session
   */
  async startRealtimeTranscription(transcriptId, organizationId) {
    console.log(`🔍 [TranscriptionService] startRealtimeTranscription called for transcript ${transcriptId}`);
    console.log(`🔍 [TranscriptionService] organizationId: ${organizationId}`);
    console.log(`🔍 [TranscriptionService] assemblyAI instance:`, !!this.assemblyAI);
    
    if (!this.assemblyAI) {
      console.error('❌ [TranscriptionService] AssemblyAI not configured');
      throw new Error('AssemblyAI not configured');
    }

    try {
      console.log(`🎙️ [TranscriptionService] Starting real-time transcription for transcript ${transcriptId}`);

      // Create temporary token for WebSocket connection (Universal Streaming)
      console.log('[TranscriptionService] Creating temporary token for Universal Streaming...');
      
      // Debug: Check if realtime methods exist
      console.log('🔍 [TranscriptionService] Checking realtime API:', {
        hasRealtime: !!this.assemblyAI.realtime,
        hasCreateTemporaryToken: !!(this.assemblyAI.realtime && this.assemblyAI.realtime.createTemporaryToken),
        realtimePrototype: this.assemblyAI.realtime ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.assemblyAI.realtime)) : 'N/A'
      });
      
      const tokenResponse = await this.assemblyAI.realtime.createTemporaryToken({
        expires_in: 3600, // 1 hour
        // Explicitly request Universal Streaming model (not deprecated best model)
        language_code: 'en', // Required for Universal Streaming
      });
      
      console.log('[TranscriptionService] Token created:', {
        hasToken: !!tokenResponse.token,
        tokenLength: tokenResponse.token?.length,
        expiresIn: 3600,
        timestamp: new Date().toISOString()
      });
      
      // Token validation debugging
      console.log('[TranscriptionService] Token validation:', {
        tokenType: typeof tokenResponse.token,
        tokenStart: tokenResponse.token?.substring(0, 20),
        apiKeyStart: process.env.ASSEMBLYAI_API_KEY?.substring(0, 20),
        fullTokenResponse: tokenResponse
      });

      // Create real-time transcriber with Universal Streaming (simplified config)
      console.log('[TranscriptionService] Creating transcriber with config:', {
        sample_rate: 16000,
        encoding: 'pcm_s16le',
        enable_extra_session_information: true,
        punctuate: true,
        format_text: true,
        hasToken: !!tokenResponse.token
      });
      
      // Try multiple approaches for Universal Streaming (SDK v4.18.2)
      let realtimeTranscriber;
      
      console.log('[TranscriptionService] Attempting method 1: createTranscriber...');
      try {
        // Method 1: createTranscriber (newer SDK pattern)
        realtimeTranscriber = this.assemblyAI.realtime.createTranscriber({
          token: tokenResponse.token,
          sampleRate: 16000,  // camelCase
          encoding: 'pcm_s16le',
          enableExtraSessionInformation: true,  // camelCase
          punctuate: true,
          formatText: true,  // camelCase
          languageCode: 'en',  // camelCase
          model: 'universal-1'
        });
        console.log('✅ [TranscriptionService] Method 1 (createTranscriber) succeeded');
      } catch (error1) {
        console.log('❌ [TranscriptionService] Method 1 failed:', error1.message);
        
        console.log('[TranscriptionService] Attempting method 2: transcriber...');
        try {
          // Method 2: transcriber (original pattern with snake_case)
          realtimeTranscriber = this.assemblyAI.realtime.transcriber({
            token: tokenResponse.token,
            sample_rate: 16000,  // snake_case
            encoding: 'pcm_s16le',
            enable_extra_session_information: true,  // snake_case
            punctuate: true,
            format_text: true,  // snake_case
            language_code: 'en',  // snake_case
            model: 'universal-1'
          });
          
          // Debug transcriber object
          console.log('[TranscriptionService] Transcriber object created:', {
            hasConnect: typeof realtimeTranscriber.connect === 'function',
            hasOn: typeof realtimeTranscriber.on === 'function',
            hasSendAudio: typeof realtimeTranscriber.sendAudio === 'function',
            hasClose: typeof realtimeTranscriber.close === 'function',
            methods: Object.getOwnPropertyNames(realtimeTranscriber).slice(0, 10),
            transcriber: !!realtimeTranscriber
          });
          
          console.log('✅ [TranscriptionService] Method 2 (transcriber) succeeded');
        } catch (error2) {
          console.log('❌ [TranscriptionService] Method 2 failed:', error2.message);
          console.log('❌ [TranscriptionService] Method 2 full error:', {
            name: error2.name,
            message: error2.message,
            stack: error2.stack,
            code: error2.code
          });
          
          console.log('[TranscriptionService] Attempting method 3: RealtimeTranscriber...');
          // Method 3: Direct RealtimeTranscriber class
          realtimeTranscriber = new RealtimeTranscriber({
            token: tokenResponse.token,
            apiKey: process.env.ASSEMBLYAI_API_KEY,
            sampleRate: 16000,
            encoding: 'pcm_s16le',
            model: 'universal-1'
          });
          console.log('✅ [TranscriptionService] Method 3 (RealtimeTranscriber) succeeded');
        }
      }
      
      console.log('[TranscriptionService] Transcriber created, attempting connection...');

      console.log('✅ [TranscriptionService] Real-time transcriber created');

      // Store the connection
      console.log('🔍 [TranscriptionService] Storing connection in activeConnections...');
      this.activeConnections.set(transcriptId, {
        transcriber: realtimeTranscriber,
        organizationId,
        transcriptChunks: [],
        startTime: new Date(),
        isActive: true
      });

      console.log('✅ [TranscriptionService] Connection stored');

      // Set up event handlers
      console.log('🔍 [TranscriptionService] Setting up transcriber events...');
      this.setupTranscriberEvents(realtimeTranscriber, transcriptId);

      console.log('✅ [TranscriptionService] Event handlers set up');

      // Test token validity before attempting connection
      console.log('🔍 [TranscriptionService] Testing token validity...');
      try {
        // Decode JWT token to inspect contents (without verification)
        const tokenParts = tokenResponse.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('🔍 [TranscriptionService] Token payload:', {
            exp: payload.exp,
            iat: payload.iat,
            isExpired: payload.exp ? (Date.now() / 1000) > payload.exp : 'unknown',
            timeUntilExpiry: payload.exp ? Math.round(payload.exp - (Date.now() / 1000)) : 'unknown',
            hasRequiredFields: !!(payload.exp && payload.iat)
          });
        }
      } catch (tokenDecodeError) {
        console.warn('⚠️ [TranscriptionService] Could not decode token:', tokenDecodeError.message);
      }

      // Connect to AssemblyAI with detailed error handling
      console.log('🔍 [TranscriptionService] Attempting WebSocket connection to AssemblyAI...');
      console.log('🔍 [TranscriptionService] Connection details:', {
        hasTranscriber: !!realtimeTranscriber,
        transcriberType: typeof realtimeTranscriber,
        connectMethod: typeof realtimeTranscriber.connect,
        tokenLength: tokenResponse.token?.length
      });
      
      try {
        await realtimeTranscriber.connect();
        console.log('✅ [TranscriptionService] WebSocket connection established successfully!');
      } catch (connectError) {
        console.error('❌ [TranscriptionService] WebSocket connection failed:', {
          message: connectError.message,
          code: connectError.code,
          name: connectError.name,
          stack: connectError.stack,
          wsCode: connectError.code, // WebSocket error codes
          tokenValid: !!tokenResponse.token,
          apiKeyValid: !!process.env.ASSEMBLYAI_API_KEY
        });
        
        // Add specific guidance for common WebSocket error codes
        if (connectError.code === 1006) {
          console.error('🔍 [TranscriptionService] Code 1006 (Abnormal Closure) suggests:');
          console.error('   - Invalid token or API key');
          console.error('   - Network connectivity issue');
          console.error('   - AssemblyAI service rejection');
        }
        
        throw connectError;
      }

      console.log(`✅ [TranscriptionService] Real-time transcription started for transcript ${transcriptId}`);
      return {
        sessionId: transcriptId,
        status: 'connected'
      };

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
   * Send audio data to AssemblyAI
   */
  async sendAudioData(transcriptId, audioBuffer) {
    const connection = this.activeConnections.get(transcriptId);
    
    if (!connection || !connection.isActive) {
      console.warn(`⚠️ No active connection for transcript ${transcriptId}`);
      return false;
    }

    try {
      // Send audio data to AssemblyAI
      connection.transcriber.sendAudio(audioBuffer);
      return true;
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

      // Close the transcriber connection
      if (connection.transcriber) {
        await connection.transcriber.close();
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
    const client = await db.getClient();
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
    } finally {
      client.release();
    }
  }

  /**
   * Update transcript status
   */
  async updateTranscriptStatus(transcriptId, status, metadata = {}) {
    const client = await db.getClient();
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
      assemblyAIConfigured: !!this.assemblyAI
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
        
        if (connection.transcriber) {
          connection.transcriber.close().catch(err => 
            console.error(`Error closing transcriber for ${transcriptId}:`, err)
          );
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