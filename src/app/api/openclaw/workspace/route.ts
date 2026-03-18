/**
 * OpenClaw Workspace Files API
 * GET: List all workspace files
 * POST: Create/update a workspace file
 */

import { NextRequest, NextResponse } from 'next/server';
import { listWorkspaceFiles, writeWorkspaceFile } from '@/lib/openclaw/files';
import type { OpenClawApiResponse } from '@/lib/openclaw/types';

export async function GET(): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const files = await listWorkspaceFiles();
    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    console.error('Failed to list workspace files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list workspace files' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<OpenClawApiResponse<unknown>>> {
  try {
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content must be a string' },
        { status: 400 }
      );
    }

    // Validate filename (only allow .md files)
    if (!filename.endsWith('.md')) {
      return NextResponse.json(
        { success: false, error: 'Only .md files are allowed' },
        { status: 400 }
      );
    }

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const file = await writeWorkspaceFile(filename, content);
    return NextResponse.json({ success: true, data: file });
  } catch (error) {
    console.error('Failed to write workspace file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to write workspace file' },
      { status: 500 }
    );
  }
}
