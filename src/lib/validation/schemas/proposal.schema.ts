import { z } from 'zod';

// ============================================================================
// PROPOSAL ZOD SCHEMAS
// ============================================================================
// Validation schemas for AI-powered proposal system

// ============================================================================
// ENUMS - Must match database CHECK constraints exactly
// ============================================================================

export const ProposalStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'partially_approved',
  'archived'
]);

export const ProposalItemActionSchema = z.enum([
  'add',
  'modify',
  'remove'
]);

export const ProposalItemEntityTypeSchema = z.enum([
  'work_item',
  'project',
  'doc',
  'label',
  'milestone',
  'comment',
  'automation'
]);

export const ProposalApprovalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected'
]);

export const ProposalSourceTypeSchema = z.enum([
  'ai_assistant',
  'voice_command',
  'automation',
  'template',
  'manual'
]);

export const DiscussionTypeSchema = z.enum([
  'comment',
  'question',
  'concern',
  'approval',
  'rejection'
]);

// ============================================================================
// AI ESTIMATE SCHEMAS
// ============================================================================

export const AIEstimateSourceSchema = z.object({
  type: z.enum(['historical_task', 'similar_project', 'team_velocity']),
  id: z.string().uuid(),
  title: z.string().optional(),
  excerpt: z.string().max(500).optional()
});

export const AIEstimateSchema = z.object({
  hours: z.number()
    .min(0, 'Hours must be non-negative')
    .max(10000, 'Hours must be less than 10000'),
  confidence: z.number()
    .min(0.0, 'Confidence must be between 0.0 and 1.0')
    .max(1.0, 'Confidence must be between 0.0 and 1.0'),
  reasoning: z.string()
    .max(2000, 'Reasoning must be less than 2000 characters')
    .optional(),
  sources: z.array(AIEstimateSourceSchema)
    .max(20, 'Cannot have more than 20 sources')
    .optional(),
  min_hours: z.number()
    .min(0, 'Min hours must be non-negative')
    .optional(),
  max_hours: z.number()
    .min(0, 'Max hours must be non-negative')
    .optional()
}).refine(
  (data) => !data.min_hours || !data.max_hours || data.min_hours <= data.max_hours,
  'Min hours must be less than or equal to max hours'
).refine(
  (data) => !data.min_hours || data.hours >= data.min_hours,
  'Hours must be greater than or equal to min hours'
).refine(
  (data) => !data.max_hours || data.hours <= data.max_hours,
  'Hours must be less than or equal to max hours'
);

// ============================================================================
// AI ASSIGNMENT SCHEMAS
// ============================================================================

export const AIAssignmentFactorsSchema = z.object({
  workload_score: z.number().min(0).max(1).optional(),
  expertise_score: z.number().min(0).max(1).optional(),
  availability_score: z.number().min(0).max(1).optional(),
  historical_success: z.number().min(0).max(1).optional()
});

export const AIAssignmentAlternativeSchema = z.object({
  user_id: z.string().uuid(),
  confidence: z.number()
    .min(0.0, 'Confidence must be between 0.0 and 1.0')
    .max(1.0, 'Confidence must be between 0.0 and 1.0'),
  reasoning: z.string()
    .max(1000, 'Reasoning must be less than 1000 characters')
    .optional()
});

export const AIAssignmentSchema = z.object({
  user_id: z.string().uuid(),
  confidence: z.number()
    .min(0.0, 'Confidence must be between 0.0 and 1.0')
    .max(1.0, 'Confidence must be between 0.0 and 1.0'),
  reasoning: z.string()
    .max(2000, 'Reasoning must be less than 2000 characters')
    .optional(),
  factors: AIAssignmentFactorsSchema.optional(),
  alternatives: z.array(AIAssignmentAlternativeSchema)
    .max(5, 'Cannot have more than 5 alternatives')
    .optional()
});

// ============================================================================
// PROPOSAL ITEM SCHEMAS
// ============================================================================

export const ProposalItemResultSchema = z.object({
  success: z.boolean(),
  applied_entity_id: z.string().uuid().optional(),
  error_message: z.string().max(1000).optional(),
  applied_at: z.string().datetime().optional()
});

export const ProposalItemSchema = z.object({
  id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  sequence: z.number().int().min(0).optional(),
  action: ProposalItemActionSchema,
  entity_type: ProposalItemEntityTypeSchema,
  entity_id: z.string().uuid().nullable().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .nullable()
    .optional(),
  changes: z.record(z.unknown()).optional(),
  previous_values: z.record(z.unknown()).nullable().optional(),
  ai_estimate: AIEstimateSchema.optional(),
  ai_assignment: AIAssignmentSchema.optional(),
  depends_on: z.array(z.string().uuid())
    .max(20, 'Cannot have more than 20 dependencies')
    .optional(),
  status: ProposalApprovalStatusSchema.optional(),
  review_notes: z.string()
    .max(2000, 'Review notes must be less than 2000 characters')
    .nullable()
    .optional(),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: z.string().datetime().nullable().optional(),
  result: ProposalItemResultSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const CreateProposalItemSchema = z.object({
  action: ProposalItemActionSchema,
  entity_type: ProposalItemEntityTypeSchema,
  entity_id: z.string().uuid().nullable().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .trim()
    .nullable()
    .optional(),
  changes: z.record(z.unknown()),
  previous_values: z.record(z.unknown()).nullable().optional(),
  ai_estimate: AIEstimateSchema.optional(),
  ai_assignment: AIAssignmentSchema.optional(),
  depends_on: z.array(z.string().uuid())
    .max(20, 'Cannot have more than 20 dependencies')
    .optional(),
  sequence: z.number().int().min(0).optional()
}).refine(
  (data) => {
    // For modify/remove actions, entity_id is required
    if (['modify', 'remove'].includes(data.action)) {
      return !!data.entity_id;
    }
    return true;
  },
  {
    message: 'entity_id is required for modify and remove actions',
    path: ['entity_id']
  }
);

export const UpdateProposalItemSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .trim()
    .nullable()
    .optional(),
  changes: z.record(z.unknown()).optional(),
  status: ProposalApprovalStatusSchema.optional(),
  review_notes: z.string()
    .max(2000, 'Review notes must be less than 2000 characters')
    .nullable()
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

// ============================================================================
// PROPOSAL DISCUSSION SCHEMAS
// ============================================================================

export const ProposalDiscussionSchema = z.object({
  id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  proposal_item_id: z.string().uuid().nullable().optional(),
  type: DiscussionTypeSchema.optional(),
  mentions: z.array(z.string().uuid())
    .max(50, 'Cannot mention more than 50 users')
    .optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_resolved: z.boolean().optional(),
  resolved_at: z.string().datetime().nullable().optional(),
  resolved_by: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const CreateProposalDiscussionSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters')
    .trim(),
  proposal_item_id: z.string().uuid().nullable().optional(),
  type: DiscussionTypeSchema.default('comment'),
  mentions: z.array(z.string().uuid())
    .max(50, 'Cannot mention more than 50 users')
    .optional(),
  parent_id: z.string().uuid().nullable().optional()
});

// ============================================================================
// MAIN PROPOSAL SCHEMAS
// ============================================================================

export const ProposalAIMetadataSchema = z.object({
  model: z.string().max(100).optional(),
  prompt_hash: z.string().max(64).optional(),
  prompt_version: z.string().max(20).optional(),
  correlation_id: z.string().uuid().optional(),
  confidence: z.number().min(0.0).max(1.0).optional(),
  processing_time_ms: z.number().int().min(0).max(600000).optional(),
  token_estimate: z.object({
    input: z.number().int().min(0),
    output: z.number().int().min(0)
  }).optional(),
  cost_estimate_usd: z.number().min(0).max(1000).optional()
});

export const ProposalVoiceMetadataSchema = z.object({
  recording_id: z.string().uuid().optional(),
  transcript: z.string().max(10000).optional(),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  duration_seconds: z.number().min(0).max(3600).optional()
});

export const ProposalSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .nullable()
    .optional(),
  status: ProposalStatusSchema,
  source_type: ProposalSourceTypeSchema,
  owner_id: z.string().uuid(),
  submitted_at: z.string().datetime().nullable().optional(),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  rejected_by: z.string().uuid().nullable().optional(),
  rejected_at: z.string().datetime().nullable().optional(),
  rejection_reason: z.string()
    .max(2000, 'Rejection reason must be less than 2000 characters')
    .nullable()
    .optional(),
  applied_by: z.string().uuid().nullable().optional(),
  applied_at: z.string().datetime().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  ai_metadata: ProposalAIMetadataSchema.optional(),
  voice_metadata: ProposalVoiceMetadataSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const CreateProposalSchema = z.object({
  workspace_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .trim()
    .nullable()
    .optional(),
  source_type: ProposalSourceTypeSchema,
  items: z.array(CreateProposalItemSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Cannot have more than 100 items')
    .optional(),
  expires_at: z.string().datetime().nullable().optional(),
  ai_metadata: ProposalAIMetadataSchema.optional(),
  voice_metadata: ProposalVoiceMetadataSchema.optional(),
  metadata: z.record(z.unknown()).optional()
}).refine(
  (data) => {
    // If expires_at is provided, it must be in the future
    if (data.expires_at) {
      return new Date(data.expires_at) > new Date();
    }
    return true;
  },
  {
    message: 'Expiration date must be in the future',
    path: ['expires_at']
  }
);

export const UpdateProposalSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .trim()
    .nullable()
    .optional(),
  status: ProposalStatusSchema.optional(),
  expires_at: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
).refine(
  (data) => {
    // If expires_at is provided, it must be in the future
    if (data.expires_at) {
      return new Date(data.expires_at) > new Date();
    }
    return true;
  },
  {
    message: 'Expiration date must be in the future',
    path: ['expires_at']
  }
);

// ============================================================================
// ACTION SCHEMAS
// ============================================================================

export const ApproveProposalSchema = z.object({
  approval_notes: z.string()
    .max(2000, 'Approval notes must be less than 2000 characters')
    .optional()
});

export const RejectProposalSchema = z.object({
  rejection_reason: z.string()
    .min(1, 'Rejection reason is required')
    .max(2000, 'Rejection reason must be less than 2000 characters')
    .trim()
});

export const ApplyProposalSchema = z.object({
  item_ids: z.array(z.string().uuid())
    .min(1, 'At least one item must be selected')
    .max(100, 'Cannot apply more than 100 items at once')
    .optional(),
  skip_item_ids: z.array(z.string().uuid())
    .max(100, 'Cannot skip more than 100 items')
    .optional()
}).refine(
  (data) => {
    // item_ids and skip_item_ids are mutually exclusive
    if (data.item_ids && data.skip_item_ids) {
      return false;
    }
    return true;
  },
  {
    message: 'Cannot specify both item_ids and skip_item_ids',
    path: ['item_ids']
  }
);

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ProposalFiltersSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  status: z.union([
    ProposalStatusSchema,
    z.array(ProposalStatusSchema)
  ]).optional(),
  source_type: z.union([
    ProposalSourceTypeSchema,
    z.array(ProposalSourceTypeSchema)
  ]).optional(),
  owner_id: z.string().uuid().optional(),
  approved_by: z.string().uuid().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  expires_after: z.string().datetime().optional(),
  expires_before: z.string().datetime().optional(),
  search: z.string().max(200).optional()
});

export const ProposalSortOptionsSchema = z.object({
  sort_by: z.enum(['created_at', 'updated_at', 'approved_at', 'applied_at', 'expires_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export const ProposalPaginationOptionsSchema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;
export type ProposalItemAction = z.infer<typeof ProposalItemActionSchema>;
export type ProposalItemEntityType = z.infer<typeof ProposalItemEntityTypeSchema>;
export type ProposalApprovalStatus = z.infer<typeof ProposalApprovalStatusSchema>;
export type ProposalSourceType = z.infer<typeof ProposalSourceTypeSchema>;
export type DiscussionType = z.infer<typeof DiscussionTypeSchema>;

export type AIEstimate = z.infer<typeof AIEstimateSchema>;
export type AIAssignment = z.infer<typeof AIAssignmentSchema>;
export type ProposalItem = z.infer<typeof ProposalItemSchema>;
export type CreateProposalItem = z.infer<typeof CreateProposalItemSchema>;
export type UpdateProposalItem = z.infer<typeof UpdateProposalItemSchema>;
export type ProposalDiscussion = z.infer<typeof ProposalDiscussionSchema>;
export type CreateProposalDiscussion = z.infer<typeof CreateProposalDiscussionSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type CreateProposal = z.infer<typeof CreateProposalSchema>;
export type UpdateProposal = z.infer<typeof UpdateProposalSchema>;
export type ApproveProposal = z.infer<typeof ApproveProposalSchema>;
export type RejectProposal = z.infer<typeof RejectProposalSchema>;
export type ApplyProposal = z.infer<typeof ApplyProposalSchema>;
export type ProposalFilters = z.infer<typeof ProposalFiltersSchema>;
export type ProposalSortOptions = z.infer<typeof ProposalSortOptionsSchema>;
export type ProposalPaginationOptions = z.infer<typeof ProposalPaginationOptionsSchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

export const validateProposal = (data: unknown) => {
  return ProposalSchema.safeParse(data);
};

export const validateCreateProposal = (data: unknown) => {
  return CreateProposalSchema.safeParse(data);
};

export const validateUpdateProposal = (data: unknown) => {
  return UpdateProposalSchema.safeParse(data);
};

export const validateProposalItem = (data: unknown) => {
  return ProposalItemSchema.safeParse(data);
};

export const validateCreateProposalItem = (data: unknown) => {
  return CreateProposalItemSchema.safeParse(data);
};

export const validateUpdateProposalItem = (data: unknown) => {
  return UpdateProposalItemSchema.safeParse(data);
};

export const validateProposalDiscussion = (data: unknown) => {
  return ProposalDiscussionSchema.safeParse(data);
};

export const validateCreateProposalDiscussion = (data: unknown) => {
  return CreateProposalDiscussionSchema.safeParse(data);
};

export const validateApproveProposal = (data: unknown) => {
  return ApproveProposalSchema.safeParse(data);
};

export const validateRejectProposal = (data: unknown) => {
  return RejectProposalSchema.safeParse(data);
};

export const validateApplyProposal = (data: unknown) => {
  return ApplyProposalSchema.safeParse(data);
};

export const validateProposalFilters = (data: unknown) => {
  return ProposalFiltersSchema.safeParse(data);
};

export const validateAIEstimate = (data: unknown) => {
  return AIEstimateSchema.safeParse(data);
};

export const validateAIAssignment = (data: unknown) => {
  return AIAssignmentSchema.safeParse(data);
};
