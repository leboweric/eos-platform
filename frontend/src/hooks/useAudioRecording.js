import { useState, useRef, useCallback, useEffect } from 'react';
import aiMeetingService from '../services/aiMeetingService';

export const useAudioRecording = (meetingId) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [transcriptChunks, setTranscriptChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const transcriptIdRef = useRef(null);
  const websocketRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Format recording time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Request microphone permission and check consent
  const requestPermissions = useCallback(async () => {
    try {
      setError(null);
      
      // Check if consent is required (this could be an organization setting)
      // For now, we'll show the consent banner if not already consented
      if (!hasConsent) {
        setShowConsentBanner(true);
        return false;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      streamRef.current = stream;
      return true;
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setError('Microphone access denied. Please enable microphone permissions and try again.');
      return false;
    }
  }, [hasConsent]);

  // Handle consent
  const handleConsent = useCallback((consented) => {
    setHasConsent(consented);
    setShowConsentBanner(false);
    
    if (consented) {
      // Store consent in localStorage for this session
      localStorage.setItem(`meeting-${meetingId}-consent`, 'true');
    }
  }, [meetingId]);

  // Check stored consent
  useEffect(() => {
    const storedConsent = localStorage.getItem(`meeting-${meetingId}-consent`);
    if (storedConsent === 'true') {
      setHasConsent(true);
    }
  }, [meetingId]);

  // Start real-time transcription WebSocket connection
  const connectWebSocket = useCallback((transcriptId) => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/transcription/${transcriptId}`;
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('WebSocket connected for real-time transcription');
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript') {
            const newChunk = {
              id: Date.now(),
              speaker: data.speaker || 'Speaker',
              text: data.text,
              timestamp: data.timestamp,
              confidence: data.confidence
            };
            
            setTranscriptChunks(prev => [...prev, newChunk]);
            setTranscript(prev => prev + ' ' + data.text);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Transcription may be interrupted.');
      };

      websocketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } catch (err) {
      console.error('Error connecting WebSocket:', err);
      setError('Failed to connect to transcription service');
    }
  }, []);

  // Send audio data to WebSocket
  const sendAudioData = useCallback((audioBlob) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(audioBlob);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Request permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsProcessing(false);
        return;
      }

      // Start transcription on backend
      const userId = JSON.parse(localStorage.getItem('auth-store') || '{}')?.state?.user?.id;
      const consentUserIds = userId ? [userId] : [];
      
      const transcriptionResult = await aiMeetingService.startTranscription(meetingId, consentUserIds);
      transcriptIdRef.current = transcriptionResult.transcript_id;

      // Connect WebSocket for real-time transcription
      connectWebSocket(transcriptionResult.transcript_id);

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to WebSocket for real-time processing
          sendAudioData(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');
      setTranscriptChunks([]);
      setIsProcessing(false);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording: ' + err.message);
      setIsProcessing(false);
    }
  }, [meetingId, requestPermissions, connectWebSocket, sendAudioData]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      setIsProcessing(true);

      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }

      // Close WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Create final transcript from chunks
      const finalTranscript = transcriptChunks.map(chunk => 
        `${chunk.speaker}: ${chunk.text}`
      ).join('\n');

      const structuredTranscript = {
        chunks: transcriptChunks,
        duration_seconds: recordingTime,
        total_words: transcript.split(' ').length
      };

      // Send final transcript to backend
      if (transcriptIdRef.current) {
        await aiMeetingService.stopTranscription(
          meetingId, 
          finalTranscript, 
          structuredTranscript
        );
      }

      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(false);

    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Failed to stop recording: ' + err.message);
      setIsProcessing(false);
    }
  }, [meetingId, isRecording, transcriptChunks, recordingTime, transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  return {
    // State
    isRecording,
    isPaused,
    recordingTime: formatTime(recordingTime),
    transcript,
    transcriptChunks,
    isProcessing,
    error,
    hasConsent,
    showConsentBanner,

    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    handleConsent,
    
    // Helpers
    clearError: () => setError(null)
  };
};