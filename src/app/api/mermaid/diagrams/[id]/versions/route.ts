import { NextRequest, NextResponse } from 'next/server';
import { mermaidService } from '@/lib/services/mermaid';
import { CreateVersionRequestSchema } from '@/lib/models/mermaid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const versions = await mermaidService.getVersions(params.id);

    return NextResponse.json({
      success: true,
      data: versions,
    });
  } catch (error: any) {
    console.error('Mermaid diagram versions GET error:', error);
    
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
          message: error.message || 'Failed to fetch versions',
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
    const validatedData = CreateVersionRequestSchema.parse(body);

    const version = await mermaidService.createVersion(params.id, validatedData);

    return NextResponse.json({
      success: true,
      data: version,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Mermaid diagram versions POST error:', error);
    
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
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to create version',
        },
      },
      { status: 500 }
    );
  }
}
