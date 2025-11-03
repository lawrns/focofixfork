import { NextRequest, NextResponse } from 'next/server';
import { mermaidService } from '@/lib/services/mermaid';
import { CreateMermaidDiagramRequestSchema } from '@/lib/models/mermaid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || undefined;
    const isPublic = searchParams.get('isPublic') === 'true' ? true : searchParams.get('isPublic') === 'false' ? false : undefined;
    const sharedWithMe = searchParams.get('sharedWithMe') === 'true';
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const result = await mermaidService.listDiagrams({
      organizationId,
      isPublic,
      sharedWithMe,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.diagrams,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('Mermaid diagrams GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch diagrams',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateMermaidDiagramRequestSchema.parse(body);

    const diagram = await mermaidService.createDiagram(validatedData);

    return NextResponse.json({
      success: true,
      data: diagram,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Mermaid diagrams POST error:', error);
    
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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to create diagram',
        },
      },
      { status: 500 }
    );
  }
}
