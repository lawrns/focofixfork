/**
 * OpenClaw Individual Workspace File API
 * GET: Read a specific workspace file
 * PUT: Update a specific workspace file
 * DELETE: Delete a specific workspace file
 */

import { NextRequest, NextResponse } from 'next/server';
import { readWorkspaceFile, writeWorkspaceFile, deleteWorkspaceFile } from '@/lib/openclaw/files';
import type { OpenClawApiResponse } from '@/lib/openclaw/types';

interface RouteParams {
  params: Promise<{ filename: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // Validate filename
    if (!decodedFilename.endsWith('.md')) {
      return NextResponse.json(
        { success: false, error: 'Only .md files are allowed' },
        { status: 400 }
      );
    }

    const file = await readWorkspaceFile(decodedFilename);
    return NextResponse.json({ success: true, data: file });
  } catch (error) {
    console.error('Failed to read workspace file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read workspace file' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    const body = await request.json();
    const { content } = body;

    // Validate filename
    if (!decodedFilename.endsWith('.md')) {
      return NextResponse.json(
        { success: false, error: 'Only .md files are allowed' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content must be a string' },
        { status: 400 }
      );
    }

    const file = await writeWorkspaceFile(decodedFilename, content);
    return NextResponse.json({ success: true, data: file });
  } catch (error) {
    console.error('Failed to write workspace file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to write workspace file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);

    // Validate filename
    if (!decodedFilename.endsWith('.md')) {
      return NextResponse.json(
        { success: false, error: 'Only .md files are allowed' },
        { status: 400 }
      );
    }

    await deleteWorkspaceFile(decodedFilename);
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete workspace file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workspace file' },
      { status: 500 }
    );
  }
}
