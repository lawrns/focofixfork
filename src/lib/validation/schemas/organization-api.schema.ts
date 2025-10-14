import { z } from 'zod'

/**
 * Schema for GET /api/organizations
 */
export const GetOrganizationsSchema = z.object({
  query: z.object({
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/organizations
 */
export const CreateOrganizationApiSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
    slug: z.string().min(2).max(100).optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/organization/invite
 */
export const InviteMemberSchema = z.object({
  body: z.object({
    organizationId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member')
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for GET /api/organization/members
 */
export const ListOrganizationMembersSchema = z.object({
  query: z.object({
    organizationId: z.string().uuid()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for GET /api/organizations/[id]/invitations
 */
export const GetOrgInvitationsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'accepted', 'expired', 'revoked']).optional()
  }).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/organizations/[id]/invitations
 */
export const CreateOrgInvitationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member')
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for DELETE /api/organizations/[id]/invitations/[invitationId]
 */
export const DeleteInvitationSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/organizations/[id]/invitations/[invitationId]/resend
 */
export const ResendInvitationSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for GET /api/organizations/[id]/members
 */
export const GetOrgMembersSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional()
})

/**
 * Schema for POST /api/organizations/[id]/members
 */
export const AddOrgMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    role: z.enum(['admin', 'member']).default('member')
  }).strict(),
  query: z.object({}).optional()
})
