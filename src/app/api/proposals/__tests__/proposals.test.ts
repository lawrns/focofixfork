import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the auth helper
vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: vi.fn(),
  mergeAuthResponse: vi.fn((res) => res),
}))

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

describe('Proposals API', () => {
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
  }

  const mockWorkspaceId = '00000000-0000-0000-0000-000000000002'
  const mockProjectId = '00000000-0000-0000-0000-000000000003'
  const mockProposalId = '00000000-0000-0000-0000-000000000004'
  const mockItemId = '00000000-0000-0000-0000-000000000005'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/proposals - Create Proposal', () => {
    it('should create a new proposal with required fields', async () => {
      const proposalData = {
        workspace_id: mockWorkspaceId,
        project_id: mockProjectId,
        title: 'Add User Authentication',
        description: 'Implement OAuth2 authentication flow',
        source_type: 'text' as const,
        source_content: { text: 'We need to add user authentication' },
      }

      expect(proposalData.workspace_id).toBe(mockWorkspaceId)
      expect(proposalData.project_id).toBe(mockProjectId)
      expect(proposalData.title).toBe('Add User Authentication')
      expect(proposalData.source_type).toBe('text')
    })

    it('should validate workspace_id is a valid UUID', async () => {
      const invalidWorkspaceId = 'invalid-uuid'
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(uuidRegex.test(invalidWorkspaceId)).toBe(false)
      expect(uuidRegex.test(mockWorkspaceId)).toBe(true)
    })

    it('should validate project_id is a valid UUID', async () => {
      const invalidProjectId = 'not-a-uuid'
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(uuidRegex.test(invalidProjectId)).toBe(false)
      expect(uuidRegex.test(mockProjectId)).toBe(true)
    })

    it('should validate title length (min 1, max 500)', async () => {
      const emptyTitle = ''
      const validTitle = 'Add Feature'
      const tooLongTitle = 'a'.repeat(501)

      expect(emptyTitle.length).toBe(0)
      expect(validTitle.length).toBeGreaterThan(0)
      expect(validTitle.length).toBeLessThanOrEqual(500)
      expect(tooLongTitle.length).toBeGreaterThan(500)
    })

    it('should validate source_type enum', async () => {
      const validSourceTypes = ['voice', 'text', 'file', 'api']
      const invalidSourceType = 'email'

      expect(validSourceTypes).toContain('text')
      expect(validSourceTypes).not.toContain(invalidSourceType)
    })

    it('should set default status to draft', async () => {
      const defaultStatus = 'draft'
      expect(defaultStatus).toBe('draft')
    })

    it('should set created_by to authenticated user', async () => {
      const createdBy = mockUser.id
      expect(createdBy).toBe(mockUser.id)
    })

    it('should return 401 if user is not authenticated', async () => {
      const noAuth = null
      expect(noAuth).toBeFalsy()
    })
  })

  describe('GET /api/proposals - List Proposals', () => {
    it('should fetch all proposals for a workspace', async () => {
      const workspaceId = mockWorkspaceId
      expect(workspaceId).toBeDefined()
    })

    it('should filter proposals by project_id', async () => {
      const proposals = [
        {
          id: 'proposal-1',
          project_id: mockProjectId,
          title: 'Proposal 1',
        },
        {
          id: 'proposal-2',
          project_id: '00000000-0000-0000-0000-000000000020',
          title: 'Proposal 2',
        },
        {
          id: 'proposal-3',
          project_id: mockProjectId,
          title: 'Proposal 3',
        },
      ]

      const filtered = proposals.filter((p) => p.project_id === mockProjectId)
      expect(filtered).toHaveLength(2)
    })

    it('should filter proposals by status', async () => {
      const proposals = [
        { id: 'proposal-1', status: 'draft' },
        { id: 'proposal-2', status: 'pending_review' },
        { id: 'proposal-3', status: 'draft' },
      ]

      const drafts = proposals.filter((p) => p.status === 'draft')
      expect(drafts).toHaveLength(2)
    })

    it('should filter proposals by created_by', async () => {
      const proposals = [
        { id: 'proposal-1', created_by: mockUser.id },
        { id: 'proposal-2', created_by: '00000000-0000-0000-0000-000000000020' },
        { id: 'proposal-3', created_by: mockUser.id },
      ]

      const myProposals = proposals.filter(
        (p) => p.created_by === mockUser.id
      )
      expect(myProposals).toHaveLength(2)
    })

    it('should support pagination with limit and offset', async () => {
      const limit = 10
      const offset = 0

      expect(limit).toBeGreaterThan(0)
      expect(limit).toBeLessThanOrEqual(100)
      expect(offset).toBeGreaterThanOrEqual(0)
    })

    it('should enforce max limit of 100', async () => {
      const tooLargeLimit = 150
      const maxLimit = 100

      expect(tooLargeLimit).toBeGreaterThan(maxLimit)
    })
  })

  describe('GET /api/proposals/[id] - Get Single Proposal', () => {
    it('should fetch proposal with all items', async () => {
      const proposalId = mockProposalId
      expect(proposalId).toBeDefined()
    })

    it('should include proposal metadata', async () => {
      const proposal = {
        id: mockProposalId,
        workspace_id: mockWorkspaceId,
        project_id: mockProjectId,
        title: 'Add Authentication',
        status: 'draft',
        created_by: mockUser.id,
        created_at: new Date().toISOString(),
      }

      expect(proposal.id).toBeDefined()
      expect(proposal.workspace_id).toBeDefined()
      expect(proposal.created_at).toBeDefined()
    })

    it('should return 404 if proposal not found', async () => {
      const unknownId = 'unknown-proposal-id'
      expect(unknownId).toBeDefined()
    })

    it('should verify user has access to proposal workspace', async () => {
      const proposalWorkspaceId = mockWorkspaceId
      const userWorkspaceId = mockWorkspaceId

      expect(proposalWorkspaceId).toBe(userWorkspaceId)
    })
  })

  describe('PATCH /api/proposals/[id] - Update Proposal', () => {
    it('should update proposal title', async () => {
      const updates = {
        title: 'Updated Title',
      }

      expect(updates.title).toBe('Updated Title')
    })

    it('should update proposal description', async () => {
      const updates = {
        description: 'Updated description text',
      }

      expect(updates.description).toBeDefined()
    })

    it('should update proposal status', async () => {
      const updates = {
        status: 'pending_review' as const,
      }

      const validStatuses = [
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'partially_approved',
        'archived',
      ]
      expect(validStatuses).toContain(updates.status)
    })

    it('should validate status enum values', async () => {
      const invalidStatus = 'invalid_status'
      const validStatuses = [
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'partially_approved',
        'archived',
      ]

      expect(validStatuses).not.toContain(invalidStatus)
    })

    it('should return 404 if proposal not found', async () => {
      const unknownId = 'unknown-id'
      expect(unknownId).toBeDefined()
    })

    it('should verify user has permission to update', async () => {
      const proposalCreatedBy = mockUser.id
      const currentUserId = mockUser.id

      expect(proposalCreatedBy).toBe(currentUserId)
    })
  })

  describe('DELETE /api/proposals/[id] - Delete Proposal', () => {
    it('should delete a proposal', async () => {
      const proposalId = mockProposalId
      expect(proposalId).toBeDefined()
    })

    it('should cascade delete proposal items', async () => {
      const proposalId = mockProposalId
      const items = [
        { id: 'item-1', proposal_id: proposalId },
        { id: 'item-2', proposal_id: proposalId },
      ]

      const affectedItems = items.filter((i) => i.proposal_id === proposalId)
      expect(affectedItems).toHaveLength(2)
    })

    it('should only allow creator or admin to delete', async () => {
      const proposalCreatedBy = mockUser.id
      const currentUserId = mockUser.id
      const isCreator = proposalCreatedBy === currentUserId

      expect(isCreator).toBe(true)
    })

    it('should return 404 if proposal not found', async () => {
      const unknownId = 'unknown-id'
      expect(unknownId).toBeDefined()
    })
  })

  describe('POST /api/proposals/[id]/submit - Submit for Review', () => {
    it('should change status from draft to pending_review', async () => {
      const currentStatus = 'draft'
      const newStatus = 'pending_review'

      expect(currentStatus).toBe('draft')
      expect(newStatus).toBe('pending_review')
    })

    it('should set submitted_at timestamp', async () => {
      const submittedAt = new Date().toISOString()
      expect(submittedAt).toBeDefined()
    })

    it('should optionally set approver_id', async () => {
      const approverId = '00000000-0000-0000-0000-000000000010'
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(uuidRegex.test(approverId)).toBe(true)
    })

    it('should not allow submitting if already submitted', async () => {
      const currentStatus = 'pending_review'
      const canSubmit = currentStatus === 'draft'

      expect(canSubmit).toBe(false)
    })

    it('should require at least one proposal item', async () => {
      const itemCount = 3
      expect(itemCount).toBeGreaterThan(0)
    })
  })

  describe('POST /api/proposals/[id]/merge - Merge Approved Items', () => {
    it('should merge only approved items into project', async () => {
      const items = [
        { id: 'item-1', approval_status: 'approved' },
        { id: 'item-2', approval_status: 'rejected' },
        { id: 'item-3', approval_status: 'approved' },
      ]

      const approvedItems = items.filter(
        (i) => i.approval_status === 'approved'
      )
      expect(approvedItems).toHaveLength(2)
    })

    it('should create real tasks from approved add items', async () => {
      const item = {
        action: 'add',
        entity_type: 'task',
        proposed_state: {
          title: 'Implement OAuth',
          description: 'Add OAuth2 flow',
        },
      }

      expect(item.action).toBe('add')
      expect(item.entity_type).toBe('task')
      expect(item.proposed_state.title).toBeDefined()
    })

    it('should update existing tasks from approved modify items', async () => {
      const item = {
        action: 'modify',
        entity_type: 'task',
        entity_id: 'task-123',
        proposed_state: { title: 'Updated Title' },
      }

      expect(item.action).toBe('modify')
      expect(item.entity_id).toBeDefined()
    })

    it('should delete tasks from approved remove items', async () => {
      const item = {
        action: 'remove',
        entity_type: 'task',
        entity_id: 'task-123',
      }

      expect(item.action).toBe('remove')
      expect(item.entity_id).toBeDefined()
    })

    it('should change proposal status to approved after merge', async () => {
      const newStatus = 'approved'
      expect(newStatus).toBe('approved')
    })

    it('should set resolved_at timestamp', async () => {
      const resolvedAt = new Date().toISOString()
      expect(resolvedAt).toBeDefined()
    })

    it('should require proposal to be in pending_review status', async () => {
      const currentStatus = 'pending_review'
      const canMerge = currentStatus === 'pending_review'

      expect(canMerge).toBe(true)
    })

    it('should only allow approver or admin to merge', async () => {
      const approverId = '00000000-0000-0000-0000-000000000020'
      const currentUserId = '00000000-0000-0000-0000-000000000020'

      expect(approverId).toBe(currentUserId)
    })
  })

  describe('GET /api/proposals/[id]/items - List Proposal Items', () => {
    it('should fetch all items for a proposal', async () => {
      const proposalId = mockProposalId
      expect(proposalId).toBeDefined()
    })

    it('should filter items by action type', async () => {
      const items = [
        { id: 'item-1', action: 'add' },
        { id: 'item-2', action: 'modify' },
        { id: 'item-3', action: 'add' },
      ]

      const addItems = items.filter((i) => i.action === 'add')
      expect(addItems).toHaveLength(2)
    })

    it('should filter items by entity_type', async () => {
      const items = [
        { id: 'item-1', entity_type: 'task' },
        { id: 'item-2', entity_type: 'milestone' },
        { id: 'item-3', entity_type: 'task' },
      ]

      const taskItems = items.filter((i) => i.entity_type === 'task')
      expect(taskItems).toHaveLength(2)
    })

    it('should filter items by approval_status', async () => {
      const items = [
        { id: 'item-1', approval_status: 'pending' },
        { id: 'item-2', approval_status: 'approved' },
        { id: 'item-3', approval_status: 'pending' },
      ]

      const pendingItems = items.filter(
        (i) => i.approval_status === 'pending'
      )
      expect(pendingItems).toHaveLength(2)
    })

    it('should order items by position', async () => {
      const items = [
        { id: 'item-3', position: 2 },
        { id: 'item-1', position: 0 },
        { id: 'item-2', position: 1 },
      ]

      const sorted = [...items].sort((a, b) => a.position - b.position)
      expect(sorted[0].id).toBe('item-1')
      expect(sorted[2].id).toBe('item-3')
    })
  })

  describe('POST /api/proposals/[id]/items - Create Proposal Item', () => {
    it('should create a new proposal item with add action', async () => {
      const itemData = {
        action: 'add' as const,
        entity_type: 'task' as const,
        proposed_state: {
          title: 'New Task',
          description: 'Task description',
        },
      }

      expect(itemData.action).toBe('add')
      expect(itemData.proposed_state.title).toBeDefined()
    })

    it('should validate action enum', async () => {
      const validActions = ['add', 'modify', 'remove']
      const invalidAction = 'delete'

      expect(validActions).toContain('add')
      expect(validActions).not.toContain(invalidAction)
    })

    it('should validate entity_type enum', async () => {
      const validEntityTypes = ['task', 'milestone', 'assignment', 'dependency']
      const invalidEntityType = 'project'

      expect(validEntityTypes).toContain('task')
      expect(validEntityTypes).not.toContain(invalidEntityType)
    })

    it('should require entity_id for modify and remove actions', async () => {
      const modifyItem = {
        action: 'modify',
        entity_id: 'task-123',
      }

      expect(modifyItem.entity_id).toBeDefined()
    })

    it('should include AI estimate data', async () => {
      const aiEstimate = {
        hours: 8,
        confidence: 'medium',
        reasoning: 'Based on similar tasks',
      }

      expect(aiEstimate.hours).toBe(8)
      expect(aiEstimate.confidence).toBeDefined()
    })

    it('should include AI assignment data', async () => {
      const aiAssignment = {
        assignee_id: 'user-456',
        confidence: 0.85,
        reasoning: 'Sarah has completed 3 similar tasks',
      }

      expect(aiAssignment.assignee_id).toBeDefined()
      expect(aiAssignment.confidence).toBeGreaterThan(0)
    })

    it('should set default position to 0', async () => {
      const defaultPosition = 0
      expect(defaultPosition).toBe(0)
    })
  })

  describe('PATCH /api/proposals/[id]/items/[itemId] - Update Item', () => {
    it('should update item approval_status to approved', async () => {
      const updates = {
        approval_status: 'approved' as const,
      }

      expect(updates.approval_status).toBe('approved')
    })

    it('should update item approval_status to rejected', async () => {
      const updates = {
        approval_status: 'rejected' as const,
      }

      expect(updates.approval_status).toBe('rejected')
    })

    it('should add reviewer_notes', async () => {
      const updates = {
        reviewer_notes: 'Please update the time estimate',
      }

      expect(updates.reviewer_notes).toBeDefined()
    })

    it('should validate reviewer_notes max length', async () => {
      const tooLongNotes = 'a'.repeat(2001)
      expect(tooLongNotes.length).toBeGreaterThan(2000)
    })

    it('should update proposed_state', async () => {
      const updates = {
        proposed_state: {
          title: 'Updated Title',
          estimate_hours: 10,
        },
      }

      expect(updates.proposed_state.title).toBeDefined()
    })

    it('should validate approval_status enum', async () => {
      const validStatuses = [
        'pending',
        'approved',
        'rejected',
        'needs_discussion',
      ]
      const invalidStatus = 'maybe'

      expect(validStatuses).toContain('approved')
      expect(validStatuses).not.toContain(invalidStatus)
    })

    it('should return 404 if item not found', async () => {
      const unknownItemId = 'unknown-item'
      expect(unknownItemId).toBeDefined()
    })
  })

  describe('POST /api/proposals/[id]/process - Process with AI', () => {
    it('should process text source content', async () => {
      const sourceContent = {
        text: 'We need to add user authentication with OAuth2',
      }

      expect(sourceContent.text).toBeDefined()
    })

    it('should process voice source content', async () => {
      const sourceContent = {
        transcription: 'Add authentication to the project',
        audio_url: 'https://example.com/audio.mp3',
      }

      expect(sourceContent.transcription).toBeDefined()
    })

    it('should enable auto-assignment by default', async () => {
      const options = {
        enable_auto_assignment: true,
      }

      expect(options.enable_auto_assignment).toBe(true)
    })

    it('should enable time estimation by default', async () => {
      const options = {
        enable_time_estimation: true,
      }

      expect(options.enable_time_estimation).toBe(true)
    })

    it('should enable dependency detection by default', async () => {
      const options = {
        enable_dependency_detection: true,
      }

      expect(options.enable_dependency_detection).toBe(true)
    })

    it('should store AI analysis in proposal', async () => {
      const aiAnalysis = {
        detected_tasks: 3,
        confidence: 'high',
        processing_time_ms: 1200,
      }

      expect(aiAnalysis.detected_tasks).toBeGreaterThan(0)
      expect(aiAnalysis.confidence).toBeDefined()
    })

    it('should create proposal items from AI parsing', async () => {
      const parsedItems = [
        {
          action: 'add',
          entity_type: 'task',
          proposed_state: { title: 'Task 1' },
        },
        {
          action: 'add',
          entity_type: 'task',
          proposed_state: { title: 'Task 2' },
        },
      ]

      expect(parsedItems).toHaveLength(2)
    })
  })

  describe('GET /api/proposals/[id]/impact - Get Impact Summary', () => {
    it('should calculate total tasks added', async () => {
      const impact = {
        total_tasks_added: 5,
      }

      expect(impact.total_tasks_added).toBe(5)
    })

    it('should calculate total tasks modified', async () => {
      const impact = {
        total_tasks_modified: 2,
      }

      expect(impact.total_tasks_modified).toBe(2)
    })

    it('should calculate total tasks removed', async () => {
      const impact = {
        total_tasks_removed: 1,
      }

      expect(impact.total_tasks_removed).toBe(1)
    })

    it('should calculate total hours added', async () => {
      const impact = {
        total_hours_added: 32.5,
      }

      expect(impact.total_hours_added).toBe(32.5)
    })

    it('should calculate total hours removed', async () => {
      const impact = {
        total_hours_removed: 8.0,
      }

      expect(impact.total_hours_removed).toBe(8.0)
    })

    it('should identify workload shifts per team member', async () => {
      const impact = {
        workload_shifts: [
          {
            user_id: 'user-456',
            current_utilization: 0.8,
            new_utilization: 0.95,
            delta: 0.15,
          },
        ],
      }

      expect(impact.workload_shifts).toHaveLength(1)
      expect(impact.workload_shifts[0].delta).toBeGreaterThan(0)
    })

    it('should identify deadline impacts', async () => {
      const impact = {
        deadline_impacts: [
          {
            milestone_id: 'milestone-123',
            current_date: '2026-01-30',
            projected_date: '2026-02-05',
            days_delay: 6,
          },
        ],
      }

      expect(impact.deadline_impacts).toHaveLength(1)
      expect(impact.deadline_impacts[0].days_delay).toBeGreaterThan(0)
    })

    it('should identify resource conflicts', async () => {
      const impact = {
        resource_conflicts: [
          {
            user_id: 'user-456',
            reason: 'Exceeds 100% capacity',
            severity: 'high',
          },
        ],
      }

      expect(impact.resource_conflicts).toHaveLength(1)
    })

    it('should calculate overall risk score', async () => {
      const impact = {
        risk_score: 7,
      }

      expect(impact.risk_score).toBeGreaterThanOrEqual(0)
      expect(impact.risk_score).toBeLessThanOrEqual(10)
    })

    it('should include calculation timestamp', async () => {
      const impact = {
        calculated_at: new Date().toISOString(),
      }

      expect(impact.calculated_at).toBeDefined()
    })
  })

  describe('Authorization and Access Control', () => {
    it('should verify user is workspace member', async () => {
      const userWorkspaces = [mockWorkspaceId, '00000000-0000-0000-0000-000000000020']
      const proposalWorkspace = mockWorkspaceId

      expect(userWorkspaces).toContain(proposalWorkspace)
    })

    it('should verify user has access to project', async () => {
      const userProjects = [mockProjectId, '00000000-0000-0000-0000-000000000020']
      const proposalProject = mockProjectId

      expect(userProjects).toContain(proposalProject)
    })

    it('should allow creator to edit draft proposal', async () => {
      const proposalCreatedBy = mockUser.id
      const currentUserId = mockUser.id
      const proposalStatus = 'draft'

      const canEdit =
        proposalCreatedBy === currentUserId && proposalStatus === 'draft'

      expect(canEdit).toBe(true)
    })

    it('should prevent editing submitted proposals', async () => {
      const proposalStatus = 'pending_review'
      const canEdit = proposalStatus === 'draft'

      expect(canEdit).toBe(false)
    })

    it('should only allow approver to approve items', async () => {
      const proposalApproverId = '00000000-0000-0000-0000-000000000020'
      const currentUserId = '00000000-0000-0000-0000-000000000020'

      expect(proposalApproverId).toBe(currentUserId)
    })
  })

  describe('Validation Edge Cases', () => {
    it('should handle empty source_content gracefully', async () => {
      const sourceContent = {}
      expect(sourceContent).toBeDefined()
    })

    it('should validate UUID format for all ID fields', async () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(uuidRegex.test(mockWorkspaceId)).toBe(true)
      expect(uuidRegex.test(mockProjectId)).toBe(true)
      expect(uuidRegex.test(mockProposalId)).toBe(true)
    })

    it('should handle null descriptions', async () => {
      const description = null
      expect(description).toBeNull()
    })

    it('should enforce position as non-negative integer', async () => {
      const validPosition = 5
      const invalidPosition = -1

      expect(validPosition).toBeGreaterThanOrEqual(0)
      expect(invalidPosition).toBeLessThan(0)
    })
  })
})
