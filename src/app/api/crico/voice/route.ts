/**
 * CRICO Voice API
 * Process voice commands with safety controls
 * Supports OpenAI Whisper for speech-to-text transcription
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  processVoiceCommand,
  confirmVoiceCommand,
  cancelVoiceCommand,
} from '@/lib/crico/voice/voice-controller';
import type { Environment } from '@/lib/crico/types';

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  base64Audio: string,
  mimeType: string = 'audio/webm'
): Promise<{ text: string; confidence: number }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Convert base64 to buffer
  const audioBuffer = Buffer.from(base64Audio, 'base64');

  // Determine file extension from mime type
  const extensions: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  const ext = extensions[mimeType] || 'webm';

  // Create FormData with audio file
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', audioBlob, `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');

  // Call OpenAI Whisper API
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    console.error('[Voice API] Whisper error:', error);
    throw new Error(`Whisper API error: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();

  // verbose_json response includes segments with confidence info
  // Calculate average confidence from segments if available
  let confidence = 0.9; // Default confidence
  if (result.segments && result.segments.length > 0) {
    const avgLogprob = result.segments.reduce(
      (sum: number, seg: { avg_logprob: number }) => sum + seg.avg_logprob,
      0
    ) / result.segments.length;
    // Convert log probability to confidence (rough approximation)
    confidence = Math.min(0.99, Math.max(0.5, 1 + avgLogprob / 2));
  }

  return {
    text: result.text?.trim() || '',
    confidence,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header or session
    const authHeader = request.headers.get('authorization');
    let userId: string | undefined;
    
    if (authHeader && supabaseAdmin) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, transcript, audio, mimeType, sttConfidence, commandId, environment } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const sessionId = request.headers.get('x-session-id') || crypto.randomUUID();
    const env: Environment = environment || 'development';

    switch (action) {
      case 'process': {
        let processedTranscript = transcript;
        let processedConfidence = sttConfidence || 0.95;

        // If audio is provided without transcript, use Whisper for transcription
        if (audio && !transcript) {
          try {
            console.log('[Voice API] Transcribing audio with Whisper...');
            const transcription = await transcribeWithWhisper(audio, mimeType);
            processedTranscript = transcription.text;
            processedConfidence = transcription.confidence;
            console.log('[Voice API] Transcription result:', { text: processedTranscript, confidence: processedConfidence });
          } catch (whisperError) {
            console.error('[Voice API] Whisper transcription failed:', whisperError);
            return NextResponse.json(
              { error: whisperError instanceof Error ? whisperError.message : 'Failed to transcribe audio' },
              { status: 500 }
            );
          }
        }

        if (!processedTranscript) {
          return NextResponse.json(
            { error: 'No audio or transcript provided' },
            { status: 400 }
          );
        }

        const result = await processVoiceCommand(
          processedTranscript,
          processedConfidence,
          userId,
          sessionId,
          env
        );

        return NextResponse.json({
          success: true,
          data: {
            commandId: result.command.id,
            status: result.command.status,
            feedback: result.feedback,
            actionId: result.action?.id,
            confirmationRequired: result.command.confirmationRequired,
          },
        });
      }

      case 'confirm': {
        if (!commandId || !transcript) {
          return NextResponse.json(
            { error: 'CommandId and confirmation transcript are required' },
            { status: 400 }
          );
        }

        const result = await confirmVoiceCommand(
          commandId,
          transcript,
          userId,
          env
        );

        return NextResponse.json({
          success: true,
          data: {
            commandId: result.command.id,
            status: result.command.status,
            feedback: result.feedback,
            actionId: result.action?.id,
          },
        });
      }

      case 'cancel': {
        if (!commandId) {
          return NextResponse.json(
            { error: 'CommandId is required' },
            { status: 400 }
          );
        }

        await cancelVoiceCommand(commandId);

        return NextResponse.json({
          success: true,
          data: { cancelled: true },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
