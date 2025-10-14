import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { CreateBackupSchema, DownloadBackupSchema } from '@/lib/validation/schemas/backup-api.schema'
import { BackupService, BackupOptions } from '@/lib/services/backup'

export async function POST(request: NextRequest) {
  return wrapRoute(CreateBackupSchema, async ({ input, user, correlationId }) => {
    const options: BackupOptions = input.body?.options || {}
    const backupData = await BackupService.createBackup(options)

    return {
      ...backupData,
      message: 'Backup created successfully'
    }
  })(request)
}

export async function GET(request: NextRequest) {
  return wrapRoute(DownloadBackupSchema, async ({ input, user, correlationId }) => {
    const options: BackupOptions = {
      includeComments: input.query?.includeComments || false,
      includeTimeTracking: input.query?.includeTimeTracking || false,
      includeFiles: input.query?.includeFiles || false
    }

    await BackupService.downloadBackup(options)

    return { message: 'Backup download initiated' }
  })(request)
}
