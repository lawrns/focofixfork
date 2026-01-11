import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/services/ai-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Use OpenAI for transcription (DeepSeek doesn't support audio)
    const openaiService = new (await import('@/lib/services/ai-service')).AIService('openai');
    
    const transcription = await openaiService.transcribe(audioFile);

    return NextResponse.json({
      success: true,
      transcription,
      provider: 'openai'
    });

  } catch (error: any) {
    console.error('Voice transcription API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
