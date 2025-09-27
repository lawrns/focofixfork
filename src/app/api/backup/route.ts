import { NextRequest, NextResponse } from 'next/server';
import { BackupService, BackupOptions } from '@/lib/services/backup';

export async function POST(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json();
    const options: BackupOptions = body.options || {};

    const backupData = await BackupService.createBackup(options);

    return NextResponse.json({
      success: true,
      data: backupData,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Backup creation error:', error);

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create backup' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url);
    const options: BackupOptions = {
      includeComments: searchParams.get('includeComments') === 'true',
      includeTimeTracking: searchParams.get('includeTimeTracking') === 'true',
      includeFiles: searchParams.get('includeFiles') === 'true',
    };

    await BackupService.downloadBackup(options);

    return NextResponse.json({
      success: true,
      message: 'Backup download initiated'
    });
  } catch (error) {
    console.error('Backup download error:', error);

    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to download backup' },
      { status: 500 }
    );
  }
}
