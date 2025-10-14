import { z } from 'zod'

/**
 * Schema for POST /api/backup
 */
export const CreateBackupSchema = z.object({
  body: z.object({
    options: z.object({
      includeComments: z.boolean().optional(),
      includeTimeTracking: z.boolean().optional(),
      includeFiles: z.boolean().optional()
    }).optional()
  }).optional(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/backup
 */
export const DownloadBackupSchema = z.object({
  query: z.object({
    includeComments: z.string().transform(val => val === 'true').optional(),
    includeTimeTracking: z.string().transform(val => val === 'true').optional(),
    includeFiles: z.string().transform(val => val === 'true').optional()
  }).optional(),
  body: z.object({}).optional()
})
