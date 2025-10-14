import { z } from 'zod'

/**
 * Schema for POST /api/invitations/[token]/accept
 */
export const AcceptInvitationSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})
