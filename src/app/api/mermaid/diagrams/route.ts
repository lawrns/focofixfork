import { NextRequest, NextResponse } from 'next/server';
import { mermaidPublicService } from '@/lib/services/mermaid-public';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const options = {
      organizationId: searchParams.get('organizationId') || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : undefined,
      sharedWithMe: searchParams.get('sharedWithMe') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await mermaidPublicService.listDiagrams(options);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Failed to list diagrams:', error);
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

    const diagram = await mermaidPublicService.createDiagram(body);

    return NextResponse.json({
      success: true,
      data: diagram,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Mermaid diagrams POST error:', error);
    
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
