import { NextRequest, NextResponse } from 'next/server';
import { mermaidService } from '@/lib/services/mermaid';
import { UpdateMermaidDiagramRequestSchema } from '@/lib/models/mermaid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('shareToken') || undefined;

    const diagram = await mermaidService.getDiagram(params.id, shareToken);

    return NextResponse.json({
      success: true,
      data: diagram,
    });
  } catch (error: any) {
    console.error('Mermaid diagram GET error:', error);
    
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
          message: error.message || 'Failed to fetch diagram',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = UpdateMermaidDiagramRequestSchema.parse(body);

    const diagram = await mermaidService.updateDiagram(params.id, validatedData);

    return NextResponse.json({
      success: true,
      data: diagram,
    });
  } catch (error: any) {
    console.error('Mermaid diagram PUT error:', error);
    
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
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update diagram',
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
    await mermaidService.deleteDiagram(params.id);

    return NextResponse.json({
      success: true,
      message: 'Diagram deleted successfully',
    });
  } catch (error: any) {
    console.error('Mermaid diagram DELETE error:', error);
    
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
          message: error.message || 'Failed to delete diagram',
        },
      },
      { status: 500 }
    );
  }
}
