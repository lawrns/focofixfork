import { NextRequest, NextResponse } from 'next/server';
import { mermaidPublicService } from '@/lib/services/mermaid-public';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const diagram = await mermaidPublicService.getPublicDiagramByToken(params.token);

    return NextResponse.json({
      success: true,
      data: diagram,
    });
  } catch (error: any) {
    console.error('Mermaid public share GET error:', error);
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Public diagram not found or access revoked',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch public diagram',
        },
      },
      { status: 500 }
    );
  }
}
