import { AssemblyAI } from 'assemblyai';
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

      // Create real-time transcriber with Universal Streaming (new API)
      console.log('🔍 [TranscriptionService] Creating Universal Streaming transcriber...');
      const realtimeTranscriber = this.assemblyAI.realtime.transcriber({
        sample_rate: 16000,
        encoding: 'pcm_s16le',
        // Required for Universal Streaming
        enable_extra_session_information: true,
        // Core transcription features
        punctuate: true,
        format_text: true,
        // Speaker identification (if supported in streaming)
        speaker_labels: false, // Often not supported in real-time streaming
        // Custom vocabulary for EOS terms (simplified for streaming)
        word_boost: [
          'EOS', 'Rock', 'Rocks', 'IDS', 'VTO', 'Scorecard', 
          'Level 10', 'L10', 'Traction', 'Quarterly', 'Priorities',
          'Accountability', 'Action Items', 'Todo', 'Issues'
        ],
        // Boost accuracy 
        boost_param: 'default'
        // Note: auto_chapters, entity_detection, sentiment_analysis 
        // are typically for batch processing, not real-time streaming
      });

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

      // Connect to AssemblyAI
      console.log('🔍 [TranscriptionService] Connecting to AssemblyAI...');
      await realtimeTranscriber.connect();

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

    // Handle errors
    transcriber.on('error', (error) => {
      console.error(`❌ Transcription error for ${transcriptId}:`, error);
      connection.isActive = false;
      
      this.emitTranscriptUpdate(transcriptId, {
        type: 'error',
        message: 'Transcription error occurred'
      });
    });

    // Handle connection close
    transcriber.on('close', (code, reason) => {
      console.log(`🔌 Transcription connection closed for ${transcriptId}:`, code, reason);
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