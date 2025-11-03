import { NextRequest, NextResponse } from 'next/server';
import { mermaidService } from '@/lib/services/mermaid';
import { ExportMermaidDiagramRequestSchema } from '@/lib/models/mermaid';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as 'png' | 'svg' | 'pdf';

    if (!format || !['png', 'svg', 'pdf'].includes(format)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be png, svg, or pdf',
          },
        },
        { status: 400 }
      );
    }

    const validatedData = ExportMermaidDiagramRequestSchema.parse({ format });
    const blob = await mermaidService.exportDiagram(params.id, validatedData);

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', blob.type);
    headers.set('Content-Disposition', `attachment; filename="diagram-${params.id}.${format}"`);

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Mermaid diagram export GET error:', error);
    
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

    if (error.message.includes('not yet implemented')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: error.message,
          },
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error.message || 'Failed to export diagram',
        },
      },
      { status: 500 }
    );
  }
}
