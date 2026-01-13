/**
 * CRICO Voice API
 * Process voice commands with safety controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  processVoiceCommand,
  confirmVoiceCommand,
  cancelVoiceCommand,
} from '@/lib/crico/voice/voice-controller';
import type { Environment } from '@/lib/crico/types';

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
    const { action, transcript, sttConfidence, commandId, environment } = body;

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
        if (!transcript || sttConfidence === undefined) {
          return NextResponse.json(
            { error: 'Transcript and sttConfidence are required' },
            { status: 400 }
          );
        }

        const result = await processVoiceCommand(
          transcript,
          sttConfidence,
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
