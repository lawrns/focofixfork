import { NextRequest, NextResponse } from 'next/server';
import { mermaidService } from '@/lib/services/mermaid';
import { ShareMermaidDiagramRequestSchema } from '@/lib/models/mermaid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const diagram = await mermaidService.getDiagram(params.id);

    return NextResponse.json({
      success: true,
      data: {
        is_public: diagram.is_public,
        share_token: diagram.share_token,
        shares: diagram.shares,
      },
    });
  } catch (error: any) {
    console.error('Mermaid diagram share GET error:', error);
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Diagram not found',
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
          message: error.message || 'Failed to fetch share settings',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = ShareMermaidDiagramRequestSchema.parse(body);

    const diagram = await mermaidService.shareDiagram(params.id, validatedData);

    return NextResponse.json({
      success: true,
      data: diagram,
    });
  } catch (error: any) {
    console.error('Mermaid diagram share POST error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Diagram not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SHARE_ERROR',
          message: error.message || 'Failed to share diagram',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;

    await mermaidService.revokeShare(params.id, userId);

    return NextResponse.json({
      success: true,
      message: 'Share access revoked successfully',
    });
  } catch (error: any) {
    console.error('Mermaid diagram share DELETE error:', error);
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Diagram not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'Failed to revoke share access',
        },
      },
      { status: 500 }
    );
  }
}
