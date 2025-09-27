import { NextRequest, NextResponse } from 'next/server';
import { BackupService, BackupData } from '@/lib/services/backup';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No backup file provided' },
        { status: 400 }
      );
    }

    const backupData = await BackupService.uploadBackup(file);
    await BackupService.restoreBackup(backupData);

    return NextResponse.json({
      success: true,
      message: 'Backup restored successfully',
      restored: {
        organizations: backupData.organizations?.length || 0,
        projects: backupData.projects?.length || 0,
        milestones: backupData.milestones?.length || 0,
        tasks: backupData.tasks?.length || 0,
        comments: backupData.comments?.length || 0,
        timeEntries: backupData.timeEntries?.length || 0,
      }
    });
  } catch (error) {
    console.error('Backup restore error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to restore backup' },
      { status: 500 }
    );
  }
}
