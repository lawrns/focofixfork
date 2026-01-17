/**
 * Voice Controller Hook
 * Manages voice recording, transcription, and command execution
 * Now with TTS feedback using ElevenLabs or browser fallback
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceFeedback, VoiceCommand } from '@/lib/crico/types';
import { getTTSService, stopSpeaking } from '@/lib/voice/tts-service';
import { useAuth } from '@/lib/contexts/auth-context';

interface VoiceControllerState {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  feedback: VoiceFeedback | null;
  error: string | null;
  command: VoiceCommand | null;
  audioLevel: number;
}

interface UseVoiceControllerReturn extends VoiceControllerState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  executeCommand: (commandId: string, confirmTranscript: string) => Promise<void>;
  clearError: () => void;
  stopSpeaking: () => void;
  hasActiveCommand: boolean;
}

/**
 * Enhanced TTS helper that uses ElevenLabs if available, falls back to browser
 */
async function speakText(text: string): Promise<void> {
  try {
    const tts = getTTSService();
    await tts.speak(text);
  } catch (error) {
    console.error('[Voice Controller] TTS error:', error);
    // Fallback to basic browser speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export function useVoiceController(): UseVoiceControllerReturn {
  const { session } = useAuth();
  const [state, setState] = useState<VoiceControllerState>({
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: '',
    feedback: null,
    error: null,
    command: null,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session?.access_token]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Start audio level monitoring
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 256;

      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalized = Math.min(1, average / 128);

        setState(prev => ({ ...prev, audioLevel: normalized }));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
    }
  }, []);

  // Stop audio level monitoring
  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setState(prev => ({ ...prev, audioLevel: 0 }));
  }, []);

  // Handle API response
  const handleApiResponse = useCallback(async (response: Response) => {
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to process voice command');
    }

    const { commandId, status, feedback, confirmationRequired } = result.data;

    setState(prev => ({
      ...prev,
      isProcessing: false,
      transcript: feedback.message,
      feedback,
      command: { id: commandId, status, confirmationRequired } as VoiceCommand,
    }));

    // Speak feedback if available
    if (feedback.speakable) {
      speakText(feedback.speakable);
    }
  }, []);

  // Process transcript
  const processTranscript = useCallback(async (transcript: string, confidence: number) => {
    try {
      const response = await fetch('/api/crico/voice', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'process',
          transcript,
          sttConfidence: confidence,
        }),
      });

      await handleApiResponse(response);
    } catch (error) {
      console.error('Failed to process transcript:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process command',
      }));
    }
  }, [handleApiResponse, getAuthHeaders]);

  // Process audio - sends to server for Whisper transcription
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      // Convert audio blob to base64 for server transmission
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });

      const base64Audio = (reader.result as string).split(',')[1];

      // Send to backend for Whisper transcription and command processing
      const response = await fetch('/api/crico/voice', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'process',
          audio: base64Audio,
          mimeType: audioBlob.type || 'audio/webm',
        }),
      });

      await handleApiResponse(response);

    } catch (error) {
      console.error('Failed to process audio:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process command',
      }));
    }
  }, [handleApiResponse, getAuthHeaders]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Check for microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Reset state
      audioChunksRef.current = [];
      setState(prev => ({
        ...prev,
        isRecording: true,
        transcript: '',
        error: null,
        feedback: null,
      }));

      // Start audio level monitoring
      startAudioLevelMonitoring(stream);

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopAudioLevelMonitoring();

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Process the audio
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error
          ? error.message
          : 'Failed to access microphone. Please check permissions.',
        isRecording: false,
      }));
    }
  }, [startAudioLevelMonitoring, stopAudioLevelMonitoring, processAudio]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
    }
    stopAudioLevelMonitoring();
    stopSpeaking();
    setState({
      isRecording: false,
      isProcessing: false,
      isSpeaking: false,
      transcript: '',
      feedback: null,
      error: null,
      command: null,
      audioLevel: 0,
    });
  }, [stopAudioLevelMonitoring]);

  const executeCommand = useCallback(async (commandId: string, confirmTranscript: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      const response = await fetch('/api/crico/voice', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'confirm',
          commandId,
          transcript: confirmTranscript,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to execute command');
      }

      const { status, feedback } = result.data;

      setState(prev => ({
        ...prev,
        isProcessing: false,
        feedback,
        command: prev.command ? { ...prev.command, status } : null,
      }));

      // Speak feedback
      if (feedback.speakable) {
        speakText(feedback.speakable);
      }

    } catch (error) {
      console.error('Failed to execute command:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to execute command',
      }));
    }
  }, [getAuthHeaders]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Stop any ongoing TTS
  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    executeCommand,
    clearError,
    stopSpeaking: handleStopSpeaking,
    hasActiveCommand: state.command?.status === 'awaiting_confirmation' || false,
  };
}
