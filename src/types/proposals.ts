// ============================================================================
// PROPOSAL TYPE DEFINITIONS
// ============================================================================
// AI-powered proposal system for planning and applying changes to tasks/projects
// Implements Plan → Apply execution mode with audit trail

// ============================================================================
// ENUMS - Must match database CHECK constraints
// ============================================================================

/**
 * Status of the proposal lifecycle
 * MUST match database CHECK constraint in proposals table
 */
export type ProposalStatus =
  | 'draft'               // Proposal is being created
  | 'pending_review'      // Proposal ready for review
  | 'approved'            // Proposal has been approved
  | 'rejected'            // Proposal has been rejected
  | 'partially_approved'  // Some items approved, some rejected
  | 'archived';           // Proposal has been archived

// Legacy status aliases for backwards compatibility
export type LegacyProposalStatus =
  | 'pending'   // Maps to 'pending_review'
  | 'applied'   // Maps to 'archived' (after merge)
  | 'failed'    // No direct mapping
  | 'expired';  // No direct mapping

/**
 * Action type for individual proposal items
 * MUST match database CHECK constraint in proposal_items table
 */
export type ProposalItemAction =
  | 'add'         // Add a new entity
  | 'modify'      // Modify existing entity
  | 'remove';     // Remove entity

// Legacy action aliases for backwards compatibility
export type LegacyProposalItemAction =
  | 'create'      // Maps to 'add'
  | 'update'      // Maps to 'modify'
  | 'delete'      // Maps to 'remove'
  | 'assign'      // No direct mapping (use 'modify' with assignment change)
  | 'move'        // No direct mapping (use 'modify' with status/project change)
  | 'relate';     // No direct mapping (use 'add' with dependency entity_type)

/**
 * Entity type that can be affected by proposals
 * MUST match database CHECK constraint in proposal_items table
 */
export type ProposalItemEntityType =
  | 'task'        // Work item / task
  | 'milestone'   // Milestone
  | 'assignment'  // Task assignment
  | 'dependency'; // Task dependency

// Legacy entity type aliases for backwards compatibility
export type LegacyProposalItemEntityType =
  | 'work_item'   // Maps to 'task'
  | 'project'     // Not directly supported
  | 'doc'         // Not directly supported
  | 'label'       // Not directly supported
  | 'comment'     // Not directly supported
  | 'automation'; // Not directly supported

/**
 * Approval status for individual proposal items
 * MUST match database CHECK constraint in proposal_items table
 */
export type ProposalApprovalStatus =
  | 'pending'          // Awaiting review
  | 'approved'         // Item approved
  | 'rejected'         // Item rejected
  | 'needs_discussion'; // Item needs further discussion

/**
 * Source of proposal generation
 * MUST match database CHECK constraint in proposals table
 */
export type ProposalSourceType =
  | 'voice'   // From voice input / transcription
  | 'text'    // From text/chat input
  | 'file'    // From uploaded file
  | 'api';    // From external API

// Legacy source type aliases for backwards compatibility
export type LegacyProposalSourceType =
  | 'ai_assistant'     // Maps to 'text' or 'api'
  | 'voice_command'    // Maps to 'voice'
  | 'automation'       // Maps to 'api'
  | 'template'         // Maps to 'text'
  | 'manual';          // Maps to 'text'

// Legacy type aliases for backwards compatibility
export type ProposalItemStatus = ProposalApprovalStatus;
export type ProposalItemType = ProposalItemAction; // add | modify | remove

// ============================================================================
// AI ESTIMATE INTERFACES
// ============================================================================

/**
 * AI-generated time estimate for tasks
 */
export interface AIEstimate {
  /** Estimated hours to complete */
  hours: number;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Reasoning behind the estimate */
  reasoning?: string;
  /** Data sources used for estimate */
  sources?: Array<{
    type: 'historical_task' | 'similar_project' | 'team_velocity';
    id: string;
    title?: string;
    excerpt?: string;
  }>;
  /** Minimum estimated hours (pessimistic) */
  min_hours?: number;
  /** Maximum estimated hours (optimistic) */
  max_hours?: number;
}

/**
 * AI-generated assignment suggestion
 */
export interface AIAssignment {
  /** Suggested assignee user ID */
  user_id: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Reasoning behind the suggestion */
  reasoning?: string;
  /** Factors considered */
  factors?: {
    workload_score?: number;        // Current workload (lower is better)
    expertise_score?: number;       // Expertise match (higher is better)
    availability_score?: number;    // Availability (higher is better)
    historical_success?: number;    // Past success on similar tasks
  };
  /** Alternative suggestions */
  alternatives?: Array<{
    user_id: string;
    confidence: number;
    reasoning?: string;
  }>;
}

// ============================================================================
// MAIN PROPOSAL INTERFACE
// ============================================================================

/**
 * Main proposal entity representing a set of planned changes
 */
export interface Proposal {
  id: string;
  workspace_id: string;
  project_id?: string;  // Optional - proposals can span multiple projects

  /** Human-readable title */
  title: string;

  /** Detailed description/rationale */
  description?: string | null;

  /** Current status */
  status: ProposalStatus;

  /** Source of proposal */
  source_type: ProposalSourceType;

  /** User who created the proposal */
  created_by: string;

  /** When proposal was submitted for review */
  submitted_at?: string | null;

  /** User who approved (if applicable) */
  approved_by?: string | null;
  approved_at?: string | null;

  /** User who rejected (if applicable) */
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;

  /** User who applied (if applicable) */
  applied_by?: string | null;
  applied_at?: string | null;

  /** Legacy: merged_at for backwards compatibility */
  merged_at?: string | null;

  /** Auto-expire proposal after this date */
  expires_at?: string | null;

  /** AI metadata */
  ai_metadata?: {
    model?: string;                // e.g., "deepseek-chat"
    prompt_hash?: string;          // Hash of system prompt used
    prompt_version?: string;       // Semantic version of prompts
    correlation_id?: string;       // Links related AI events
    confidence?: number;           // Overall confidence (0.0 - 1.0)
    processing_time_ms?: number;   // Time to generate proposal
    token_estimate?: {
      input: number;
      output: number;
    };
    cost_estimate_usd?: number;
  };

  /** Voice recording metadata (if from voice) */
  voice_metadata?: {
    recording_id?: string;
    transcript?: string;
    language?: string;
    duration_seconds?: number;
  };

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  created_at: string;
  updated_at: string;

  // Relations
  creator?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };

  approver?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };

  reviewer?: {  // Legacy field
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// ============================================================================
// PROPOSAL ITEM INTERFACE
// ============================================================================

/**
 * Individual item within a proposal representing a single change
 */
export interface ProposalItem {
  id: string;
  proposal_id: string;

  /** Sequence order within proposal */
  sequence?: number;
  position?: number;  // Legacy field

  /** Type of action to perform */
  action: ProposalItemAction;
  item_type?: ProposalItemType;  // Legacy field

  /** Entity type being affected */
  entity_type: ProposalItemEntityType;

  /** Existing entity ID (for update/delete actions) */
  entity_id?: string | null;

  /** Title/name of the item */
  title: string;

  /** Detailed description */
  description?: string | null;

  /** Changes to apply (field-level) */
  changes?: Record<string, unknown>;
  proposed_data?: Record<string, unknown>;  // Legacy field

  /** Previous values (for rollback) */
  previous_values?: Record<string, unknown> | null;
  current_data?: Record<string, unknown> | null;  // Legacy field

  /** AI-generated estimate */
  ai_estimate?: AIEstimate;

  /** AI-generated assignment */
  ai_assignment?: AIAssignment;

  /** Dependencies on other proposal items */
  depends_on?: string[];

  /** Item status for approval workflow */
  status?: ProposalItemStatus;

  /** Review notes */
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;

  /** Result after application */
  result?: {
    success: boolean;
    applied_entity_id?: string;
    error_message?: string;
    applied_at?: string;
  };

  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROPOSAL DISCUSSION INTERFACE
// ============================================================================

/**
 * Discussion/comment on a proposal
 */
export interface ProposalDiscussion {
  id: string;
  proposal_id: string;
  user_id: string;

  /** Comment content */
  content: string;

  /** Referenced proposal item (optional) */
  proposal_item_id?: string | null;

  /** Discussion type */
  type?: 'comment' | 'question' | 'concern' | 'approval' | 'rejection';

  /** Mentioned users */
  mentions?: string[];

  /** Parent comment (for threading) */
  parent_id?: string | null;

  /** Resolved status for questions/concerns */
  is_resolved?: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;

  created_at: string;
  updated_at: string;

  // Relations
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// ============================================================================
// PROPOSAL IMPACT SUMMARY
// ============================================================================

/**
 * Summary of proposal impact across the workspace
 */
export interface ProposalImpactSummary {
  /** Total items in proposal */
  total_items: number;

  /** Breakdown by action type */
  by_action?: Record<ProposalItemAction, number>;
  items_by_type?: {  // Legacy field
    add: number;
    modify: number;
    remove: number;
  };

  /** Breakdown by status */
  items_by_status?: {
    pending: number;
    approved: number;
    rejected: number;
  };

  /** Breakdown by entity type */
  by_entity?: Record<ProposalItemEntityType, number>;
  entities_affected?: {  // Legacy field
    tasks: number;
    projects: number;
    milestones: number;
  };

  /** Affected projects */
  affected_projects?: Array<{
    project_id: string;
    project_name: string;
    item_count: number;
  }>;

  /** Affected team members */
  affected_users?: Array<{
    user_id: string;
    user_name?: string;
    assigned_items: number;
    workload_impact_hours?: number;
  }>;

  /** Total estimated effort */
  total_estimate_hours?: number;

  /** Average AI confidence */
  average_confidence?: number;

  /** Risk factors */
  risks?: Array<{
    level: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to create a new proposal
 */
export interface CreateProposalRequest {
  workspace_id: string;
  project_id?: string;
  title: string;
  description?: string | null;
  source_type: ProposalSourceType;
  items?: Array<Omit<ProposalItem, 'id' | 'proposal_id' | 'created_at' | 'updated_at' | 'result'>>;
  expires_at?: string | null;
  ai_metadata?: Proposal['ai_metadata'];
  voice_metadata?: Proposal['voice_metadata'];
  metadata?: Record<string, unknown>;
}

// Legacy alias
export interface CreateProposalData extends Omit<CreateProposalRequest, 'source_type'> {
  created_by: string;
  source_type?: ProposalSourceType;
}

/**
 * Request to update a proposal
 */
export interface UpdateProposalRequest {
  title?: string;
  description?: string | null;
  status?: ProposalStatus;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

// Legacy alias
export type UpdateProposalData = UpdateProposalRequest;

/**
 * Request to create a proposal item
 */
export interface CreateProposalItemRequest {
  action: ProposalItemAction;
  entity_type: ProposalItemEntityType;
  entity_id?: string | null;
  title: string;
  description?: string | null;
  changes: Record<string, unknown>;
  previous_values?: Record<string, unknown> | null;
  ai_estimate?: AIEstimate;
  ai_assignment?: AIAssignment;
  depends_on?: string[];
  sequence?: number;
}

// Legacy alias
export interface CreateProposalItemData {
  item_type: ProposalItemType;
  entity_type: 'task' | 'project' | 'milestone';
  entity_id?: string | null;
  proposed_data: Record<string, unknown>;
  current_data?: Record<string, unknown> | null;
  position?: number;
}

/**
 * Request to update a proposal item
 */
export interface UpdateProposalItemRequest {
  title?: string;
  description?: string | null;
  changes?: Record<string, unknown>;
  status?: ProposalItemStatus;
  review_notes?: string | null;
}

// Legacy alias
export interface UpdateProposalItemData {
  proposed_data?: Record<string, unknown>;
  status?: ProposalItemStatus;
  review_notes?: string | null;
}

/**
 * Request to approve a proposal
 */
export interface ApproveProposalRequest {
  approval_notes?: string;
}

/**
 * Request to reject a proposal
 */
export interface RejectProposalRequest {
  rejection_reason: string;
}

/**
 * Request to apply a proposal
 */
export interface ApplyProposalRequest {
  /** Apply only specific items (optional) */
  item_ids?: string[];
  /** Skip items with these IDs */
  skip_item_ids?: string[];
}

/**
 * Response after applying a proposal
 */
export interface ApplyProposalResponse {
  success: boolean;
  proposal_id: string;
  applied_count: number;
  failed_count: number;
  results: Array<{
    item_id: string;
    success: boolean;
    entity_id?: string;
    error?: string;
  }>;
  execution_time_ms: number;
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * Filters for querying proposals
 */
export interface ProposalFilters {
  workspace_id?: string;
  project_id?: string;
  status?: ProposalStatus | ProposalStatus[];
  source_type?: ProposalSourceType | ProposalSourceType[];
  created_by?: string;
  approved_by?: string;
  created_after?: string;
  created_before?: string;
  expires_after?: string;
  expires_before?: string;
  search?: string;
}

/**
 * Sort options for proposals
 */
export interface ProposalSortOptions {
  sort_by?: 'created_at' | 'updated_at' | 'approved_at' | 'applied_at' | 'expires_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Pagination for proposals
 */
export interface ProposalPaginationOptions {
  page?: number;
  page_size?: number;
  offset?: number;
  limit?: number;
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

/**
 * Proposal with all items included
 */
export interface ProposalWithItems extends Proposal {
  items: ProposalItem[];
}

/**
 * Proposal with impact summary
 */
export interface ProposalWithImpact extends Proposal {
  impact: ProposalImpactSummary;
  impact_summary?: ProposalImpactSummary;  // Legacy field
}

/**
 * Full proposal details with items, impact, and discussions
 */
export interface ProposalDetails extends ProposalWithItems {
  impact: ProposalImpactSummary;
  discussions: ProposalDiscussion[];
  discussion_count: number;
}

// Legacy alias
export type ProposalWithDetails = ProposalDetails;

// ============================================================================
// AUDIT EVENT INTERFACE
// ============================================================================

/**
 * Audit event for proposal lifecycle actions
 */
export interface ProposalAuditEvent {
  id: string;
  proposal_id: string;

  /** Action performed */
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'applied' | 'expired';

  /** User who performed action */
  user_id?: string;

  /** Changes made */
  changes?: Record<string, { old: unknown; new: unknown }>;

  /** Reason/notes */
  reason?: string;

  /** AI-related metadata */
  is_ai_action?: boolean;
  ai_confidence?: number;

  created_at: string;

  // Relations
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type guard to check if proposal can be edited
 */
export type EditableProposal = Extract<ProposalStatus, 'draft' | 'pending_review'>;

/**
 * Type guard to check if proposal can be applied/merged
 */
export type ApplicableProposal = Extract<ProposalStatus, 'approved' | 'partially_approved'>;

/**
 * Type guard to check if proposal is final
 */
export type FinalProposal = Extract<ProposalStatus, 'rejected' | 'archived'>;
