import { z } from 'zod'

/**
 * Proposal status enum
 */
export const ProposalStatusEnum = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'partially_approved',
  'archived',
])

/**
 * Proposal source type enum
 */
export const ProposalSourceTypeEnum = z.enum(['voice', 'text', 'file', 'api'])

/**
 * Proposal item action enum
 */
export const ProposalItemActionEnum = z.enum(['add', 'modify', 'remove'])

/**
 * Proposal item entity type enum
 */
export const ProposalItemEntityTypeEnum = z.enum([
  'task',
  'milestone',
  'assignment',
  'dependency',
])

/**
 * Proposal item approval status enum
 */
export const ProposalItemApprovalStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'needs_discussion',
])

/**
 * Schema for GET /api/proposals - List proposals
 */
export const GetProposalsSchema = z.object({
  query: z
    .object({
      workspace_id: z.string().uuid().optional(),
      project_id: z.string().uuid().optional(),
      status: ProposalStatusEnum.optional(),
      created_by: z.string().uuid().optional(),
      limit: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().min(1).max(100))
        .optional(),
      offset: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().min(0))
        .optional(),
    })
    .optional(),
  body: z.object({}).optional(),
})

/**
 * Schema for POST /api/proposals - Create proposal
 */
export const CreateProposalSchema = z.object({
  body: z.object({
    workspace_id: z.string().uuid('Invalid workspace ID format'),
    project_id: z.string().uuid('Invalid project ID format'),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters'),
    description: z
      .string()
      .max(5000, 'Description must be less than 5000 characters')
      .nullable()
      .optional(),
    source_type: ProposalSourceTypeEnum,
    source_content: z
      .record(z.any())
      .default({})
      .describe('Source content as JSON object'),
    approval_config: z
      .object({
        require_all_items: z.boolean().default(false),
        auto_approve_threshold: z.number().nullable().optional(),
      })
      .optional(),
  }),
  query: z.object({}).optional(),
})

/**
 * Schema for GET /api/proposals/[id]
 */
export const GetProposalSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional(),
})

/**
 * Schema for PATCH /api/proposals/[id] - Update proposal
 */
export const UpdateProposalSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(500, 'Title must be less than 500 characters')
      .optional(),
    description: z
      .string()
      .max(5000, 'Description must be less than 5000 characters')
      .nullable()
      .optional(),
    status: ProposalStatusEnum.optional(),
    approval_config: z
      .object({
        require_all_items: z.boolean().optional(),
        auto_approve_threshold: z.number().nullable().optional(),
      })
      .optional(),
  }),
  query: z.object({}).optional(),
})

/**
 * Schema for DELETE /api/proposals/[id]
 */
export const DeleteProposalSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional(),
})

/**
 * Schema for POST /api/proposals/[id]/submit - Submit for review
 */
export const SubmitProposalSchema = z.object({
  body: z
    .object({
      approver_id: z.string().uuid('Invalid approver ID format').optional(),
    })
    .optional(),
  query: z.object({}).optional(),
})

/**
 * Schema for POST /api/proposals/[id]/merge - Merge approved items
 */
export const MergeProposalSchema = z.object({
  body: z
    .object({
      force: z.boolean().default(false).optional(),
    })
    .optional(),
  query: z.object({}).optional(),
})

/**
 * Schema for GET /api/proposals/[id]/items - List proposal items
 */
export const GetProposalItemsSchema = z.object({
  query: z
    .object({
      action: ProposalItemActionEnum.optional(),
      entity_type: ProposalItemEntityTypeEnum.optional(),
      approval_status: ProposalItemApprovalStatusEnum.optional(),
    })
    .optional(),
  body: z.object({}).optional(),
})

/**
 * Schema for POST /api/proposals/[id]/items - Create proposal item
 */
export const CreateProposalItemSchema = z.object({
  body: z.object({
    action: ProposalItemActionEnum,
    entity_type: ProposalItemEntityTypeEnum,
    entity_id: z.string().uuid('Invalid entity ID format').nullable().optional(),
    original_state: z.record(z.any()).nullable().optional(),
    proposed_state: z.record(z.any()),
    ai_estimate: z.record(z.any()).optional(),
    ai_assignment: z.record(z.any()).optional(),
    position: z.number().int().min(0).default(0).optional(),
  }),
  query: z.object({}).optional(),
})

/**
 * Schema for PATCH /api/proposals/[id]/items/[itemId] - Update proposal item
 */
export const UpdateProposalItemSchema = z.object({
  body: z.object({
    action: ProposalItemActionEnum.optional(),
    entity_type: ProposalItemEntityTypeEnum.optional(),
    entity_id: z.string().uuid('Invalid entity ID format').nullable().optional(),
    original_state: z.record(z.any()).nullable().optional(),
    proposed_state: z.record(z.any()).optional(),
    ai_estimate: z.record(z.any()).optional(),
    ai_assignment: z.record(z.any()).optional(),
    approval_status: ProposalItemApprovalStatusEnum.optional(),
    reviewer_notes: z.string().max(2000).nullable().optional(),
    position: z.number().int().min(0).optional(),
  }),
  query: z.object({}).optional(),
})

/**
 * Schema for POST /api/proposals/[id]/process - Process source content with AI
 */
export const ProcessProposalSchema = z.object({
  body: z
    .object({
      source_content: z.record(z.any()).optional(),
      options: z
        .object({
          enable_auto_assignment: z.boolean().default(true),
          enable_time_estimation: z.boolean().default(true),
          enable_dependency_detection: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),
  query: z.object({}).optional(),
})

/**
 * Schema for GET /api/proposals/[id]/impact - Get impact summary
 */
export const GetProposalImpactSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({}).optional(),
})

/**
 * Type exports for use in API routes
 */
export type ProposalStatus = z.infer<typeof ProposalStatusEnum>
export type ProposalSourceType = z.infer<typeof ProposalSourceTypeEnum>
export type ProposalItemAction = z.infer<typeof ProposalItemActionEnum>
export type ProposalItemEntityType = z.infer<typeof ProposalItemEntityTypeEnum>
export type ProposalItemApprovalStatus = z.infer<typeof ProposalItemApprovalStatusEnum>
