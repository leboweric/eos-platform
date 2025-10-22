import React, { useState, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { useAudioRecording } from '../hooks/useAudioRecording';
import aiMeetingService from '../services/aiMeetingService';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const MeetingAIRecordingControls = ({ 
  meetingId, 
  organizationId,
  onTranscriptionStarted,
  onTranscriptionStopped 
}) => {
  const [transcriptionStatus, setTranscriptionStatus] = useState('not_started');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const {
    isRecording,
    recordingTime,
    error: recordingError,
    startRecording,
    stopRecording
  } = useAudioRecording(meetingId);

  // Check if AI is enabled for this org (from context or props)
  const aiEnabled = true; // TODO: Get from organization settings

  /**
   * Handle start recording
   */
  const handleStartRecording = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Start browser audio recording
      const started = await startRecording();
      if (!started) {
        setError('Could not access microphone');
        setIsProcessing(false);
        return;
      }

      // Start backend transcription
      await aiMeetingService.startTranscription(meetingId);
      setTranscriptionStatus('recording');
      
      if (onTranscriptionStarted) {
        onTranscriptionStarted();
      }

      setIsProcessing(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
      setIsProcessing(false);
    }
  };

  /**
   * Handle stop recording
   */
  const handleStopRecording = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Stop browser recording
      const audioBlob = await stopRecording();

      // Stop backend transcription and trigger AI summary
      await aiMeetingService.stopTranscription(meetingId);
      setTranscriptionStatus('processing');

      if (onTranscriptionStopped) {
        onTranscriptionStopped(audioBlob);
      }

      setIsProcessing(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(err.message || 'Failed to stop recording');
      setIsProcessing(false);
    }
  };

  // Poll for transcription status
  useEffect(() => {
    if (transcriptionStatus === 'processing') {
      const interval = setInterval(async () => {
        try {
          const status = await aiMeetingService.getTranscriptionStatus(meetingId);
          
          if (status.status === 'completed') {
            setTranscriptionStatus('completed');
            clearInterval(interval);
          } else if (status.status === 'failed') {
            setTranscriptionStatus('failed');
            setError('Transcription failed');
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [transcriptionStatus, meetingId]);

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
              Start AI Recording
            </Button>
          )}

          {isRecording && (
            <>
              <div className="flex items-center gap-2 text-red-600">
                <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
                <span className="font-medium">Recording</span>
                <span className="text-sm text-gray-600">{recordingTime}</span>
              </div>

              <Button
                onClick={handleStopRecording}
                disabled={isProcessing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop & Generate Summary
              </Button>
            </>
          )}

          {transcriptionStatus === 'processing' && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">Processing transcript & generating AI summary...</span>
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

      {(error || recordingError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || recordingError}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-gray-500">
        🤖 This meeting will be transcribed and analyzed by AI to capture action items and key decisions
      </div>
    </div>
  );
};