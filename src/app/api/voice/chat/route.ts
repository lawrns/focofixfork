import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/services/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { messages, provider } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Create AI service with specified provider or default
    const ai = new (await import('@/lib/services/ai-service')).AIService(provider);
    
    const response = await ai.chatCompletion(messages);

    return NextResponse.json({
      success: true,
      response,
      provider: ai.getProviderInfo()
    });

  } catch (error: any) {
    console.error('Voice chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process voice chat',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
