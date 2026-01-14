/**
 * Voice Controller Hook
 * Manages voice recording, transcription, and command execution
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceFeedback, VoiceCommand } from '@/lib/crico/types';

interface VoiceControllerState {
  isRecording: boolean;
  isProcessing: boolean;
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
  hasActiveCommand: boolean;
}

// Text-to-speech helper
function speakText(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function useVoiceController(): UseVoiceControllerReturn {
  const [state, setState] = useState<VoiceControllerState>({
    isRecording: false,
    isProcessing: false,
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
        headers: {
          'Content-Type': 'application/json',
        },
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
  }, [handleApiResponse]);

  // Process audio
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      // For demo/testing: Use Web Speech API for transcription
      // In production, this would send audio to backend for Whisper transcription
      const useBrowserSpeechAPI = true; // Toggle for demo mode

      if (useBrowserSpeechAPI && 'webkitSpeechRecognition' in window) {
        // Use browser's speech recognition for instant testing
        // Web Speech API types are not available, using any
        const SpeechRecognition = (window as Record<string, unknown>).webkitSpeechRecognition as new () => {
          continuous: boolean;
          interimResults: boolean;
          onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string; confidence: number } } } }) => void) | null;
          onerror: ((event: { error: string }) => void) | null;
          start: () => void;
        };
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = async (event) => {
          const transcriptResult = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence;

          // Send transcript to backend
          await processTranscript(transcriptResult, confidence);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setState(prev => ({
            ...prev,
            isProcessing: false,
            error: 'Failed to transcribe audio. Please try again.',
          }));
        };

        // Create audio URL and play for recognition
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);

        // Start recognition when audio starts playing
        audio.onplay = () => recognition.start();
        audio.play();

        return;
      }

      // Fallback: Send audio to backend (not implemented yet)
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });

      const base64Audio = (reader.result as string).split(',')[1];

      // Send to backend for processing
      const response = await fetch('/api/crico/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process',
          audio: base64Audio,
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
  }, [handleApiResponse, processTranscript]);

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
    setState({
      isRecording: false,
      isProcessing: false,
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
        headers: {
          'Content-Type': 'application/json',
        },
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
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    executeCommand,
    clearError,
    hasActiveCommand: state.command?.status === 'awaiting_confirmation' || false,
  };
}
