import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/axiosConfig';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AudioService } from '../services/audioService';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export const MeetingAIRecordingControls = ({ 
  meetingId, 
  organizationId,
  onTranscriptionStarted,
  onTranscriptionStopped,
  onRecordingStateChange
}) => {
  console.log('🎙️ AI Recording Controls rendered', { meetingId, organizationId });
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState('not_started');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  
  // Refs for PCM audio service
  const audioServiceRef = useRef(null);
  const socketRef = useRef(null);
  const transcriptIdRef = useRef(null);

  // Check if AI is enabled for this org (from context or props)
  const aiEnabled = true; // TODO: Get from organization settings

  // Timer for recording duration
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Notify parent component when recording state changes
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange({
        isRecording,
        transcriptId: transcriptIdRef.current,
        recordingTime,
        transcriptionStatus
      });
    }
  }, [isRecording, recordingTime, transcriptionStatus, onRecordingStateChange]);

  // Format recording time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      // Cleanup PCM audio service
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
      
      // Cleanup WebSocket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Cleanup audio stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);

  /**
   * Handle start recording - EXACTLY like the successful manual test
   */
  const handleStartRecording = async () => {
    console.log('🎙️ [AI Recording] Starting PCM audio recording...');
    console.log('🔍 [AI Recording] Using organizationId:', organizationId);
    console.log('🔍 [AI Recording] Using meetingId:', meetingId);
    
    try {
      setError(null);
      setIsProcessing(true);

      // Validate required parameters
      if (!organizationId) {
        throw new Error('Organization ID is required for AI recording');
      }
      
      if (!meetingId) {
        throw new Error('Meeting ID is required for AI recording');
      }

      // Request microphone access with specific audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,  // AssemblyAI requirement
          channelCount: 1,    // Mono audio
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      console.log('✅ [AI Recording] Microphone access granted!', stream);
      setAudioStream(stream);

      // Start backend transcription
      console.log('📡 [AI Recording] Starting transcription via API...');
      const transcriptionResponse = await api.post('/transcription/start', {
        meetingId,
        organizationId
      });

      console.log('✅ [AI Recording] Transcription started:', transcriptionResponse.data);
      transcriptIdRef.current = transcriptionResponse.data.transcript_id;
      setCurrentMeetingId(transcriptionResponse.data.meeting_id); // Store actual meeting ID

      // Connect to WebSocket for real-time audio streaming - MUST use correct path!
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.axplatform.app' 
        : 'http://localhost:3001';
        
      console.log('🔌 [AI Recording] Connecting to meeting socket:', socketUrl);
      socketRef.current = io(socketUrl, {
        path: '/meeting-socket',  // CRITICAL: Backend uses custom path
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });
      
      socketRef.current.on('connect', () => {
        console.log('✅ [AI Recording] Socket connected for real-time audio:', {
          socketId: socketRef.current.id,
          path: '/meeting-socket'
        });
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ [AI Recording] Socket connection error:', error);
      });

      // Initialize PCM Audio Service
      audioServiceRef.current = new AudioService();
      
      const onAudioData = (base64PCM) => {
        console.log('📥 [Frontend] onAudioData callback triggered');
        console.log('🔍 [Frontend] Socket and ID check:', {
          hasSocket: !!socketRef.current,
          socketConnected: socketRef.current?.connected,
          socketReadyState: socketRef.current?.readyState,
          hasTranscriptId: !!transcriptIdRef.current,
          transcriptId: transcriptIdRef.current,
          dataLength: base64PCM.length
        });
        
        if (socketRef.current && transcriptIdRef.current) {
          console.log('📤 Sending to backend via socket.emit');
          
          socketRef.current.emit('audio-chunk', {
            transcriptId: transcriptIdRef.current,
            audioData: base64PCM
          });
          
          console.log('✅ [Frontend] Socket.emit called successfully');
        } else {
          console.error('❌ [Frontend] Cannot send audio - missing requirements:', {
            hasSocket: !!socketRef.current,
            socketConnected: socketRef.current?.connected,
            hasTranscriptId: !!transcriptIdRef.current,
            transcriptId: transcriptIdRef.current
          });
        }
      };

      const audioInitialized = await audioServiceRef.current.initialize(stream, onAudioData);
      
      if (!audioInitialized) {
        throw new Error('Failed to initialize PCM audio capture');
      }

      // Start PCM audio capture
      audioServiceRef.current.startCapture();
      
      console.log(`🎙️ [AI Recording] Using ${audioServiceRef.current.getImplementationType()} for PCM capture`);
      
      setTranscriptionStatus('recording');
      setIsRecording(true);
      setRecordingTime(0);
      
      if (onTranscriptionStarted) {
        onTranscriptionStarted();
      }

      console.log('✅ [AI Recording] PCM recording started successfully');
      setIsProcessing(false);

    } catch (error) {
      console.error('❌ [AI Recording] Failed to start recording:', error);
      
      let errorMessage = 'Could not start AI note taking';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please click "Allow" when prompted.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is in use by another application.';
      } else {
        errorMessage = `Note taking error: ${error.message}`;
      }
      
      setError(errorMessage);
      setIsRecording(false);
      setIsProcessing(false);
      
      // Cleanup on error
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  };

  /**
   * Handle stop recording - NON-BLOCKING VERSION
   */
  const handleStopRecording = async () => {
    console.log('🛑 [AI Recording] Stopping PCM recording...');
    
    try {
      setError(null);
      setIsProcessing(true);

      // Stop PCM audio capture
      if (audioServiceRef.current) {
        audioServiceRef.current.stopCapture();
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
        console.log('🔇 [AI Recording] PCM audio service stopped');
      }

      // Stop audio stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => {
          track.stop();
          console.log('🔇 [AI Recording] Stopped track:', track.label);
        });
        setAudioStream(null);
      }

      // Disconnect WebSocket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('🔌 [AI Recording] WebSocket disconnected');
      }

      // Stop backend transcription (fire and forget - no blocking)
      console.log('📡 [AI Recording] Stopping transcription via API...');
      await api.post('/transcription/stop', {
        meetingId,
        organizationId
      });

      // Update state immediately - no waiting for processing
      setTranscriptionStatus('stopped');
      setIsRecording(false);
      setIsProcessing(false);

      if (onTranscriptionStopped) {
        onTranscriptionStopped();
      }

      // Show simple toast - no blocking modal
      toast.success("Note taking stopped", {
        description: "AI summary will be generated when you conclude the meeting",
        duration: 4000
      });

      console.log('✅ [AI Recording] PCM recording stopped successfully');
      
    } catch (err) {
      console.error('❌ [AI Recording] Error stopping recording:', err);
      setError(err.message || 'Failed to stop recording');
      setIsProcessing(false);
      
      // Show error toast
      toast.error("Error stopping note taking", {
        description: err.message || 'Failed to stop note taking',
        duration: 4000
      });
    }
  };

  // New function: Conclude the specific meeting created for this recording
  const handleConcludeMeeting = async () => {
    if (!currentMeetingId) {
      console.error('❌ No meeting ID to conclude');
      toast.error('No active recording session to conclude');
      return;
    }

    try {
      console.log('🏁 [AI Recording] Concluding meeting:', currentMeetingId);
      
      // Use the meetings service to conclude the specific meeting
      const token = localStorage.getItem('accessToken');
      const teamIdFromComposite = meetingId.split('-')[0]; // Extract teamId from composite
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/organizations/${organizationId}/teams/${teamIdFromComposite}/meetings/conclude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          specificMeetingId: currentMeetingId, // Target the specific meeting
          meetingType: 'ai-recording',
          duration: Math.floor(recordingTime / 60), // Convert seconds to minutes
          rating: 5, // Default good rating for AI recordings
          notes: 'AI Recording Session'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to conclude meeting');
      }

      const result = await response.json();
      console.log('✅ [AI Recording] Meeting concluded successfully:', result);
      
      // Clear the current meeting
      setCurrentMeetingId(null);
      
      toast.success('Meeting concluded! AI summary email will be sent shortly.');
      
    } catch (error) {
      console.error('❌ [AI Recording] Failed to conclude meeting:', error);
      toast.error('Failed to conclude meeting: ' + error.message);
    }
  };


  if (!aiEnabled) {
    return null;
  }

  return (
    <div className="meeting-ai-recording-controls bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isRecording && transcriptionStatus === 'not_started' && (
            <Button
              onClick={handleStartRecording}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              Start AI Note Taking
            </Button>
          )}

          {isRecording && (
            <>
              <div className="flex items-center gap-3">
                {/* Recording indicator */}
                <div className="flex items-center gap-2 text-sm text-green-600 animate-pulse">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span>AI taking notes...</span>
                </div>

                {/* Recording time */}
                <span className="text-sm text-gray-600 font-mono">{formatTime(recordingTime)}</span>
              </div>

              <Button
                onClick={handleStopRecording}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop Note Taking
              </Button>
            </>
          )}

          {transcriptionStatus === 'stopped' && currentMeetingId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-blue-700 font-medium">Your AI Meeting Summary is processing</span>
            </div>
          )}

          {transcriptionStatus === 'completed' && (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">AI Summary Ready</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-xs text-gray-500">
        🤖 This meeting will be transcribed and analyzed by AI to capture action items and key decisions
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        💡 Tip: Choose "Allow while visiting the site" for the best experience
      </div>
    </div>
  );
};