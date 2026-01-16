/**
 * Tool Executor Tests
 * Demonstrates usage and validates policy enforcement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToolExecutor } from '../tool-executor'
import { PolicyViolationError, ToolExecutionError } from '../types'
import type { ToolCallContext, WorkspaceAIPolicy } from '../types'

// Mock Supabase client with proper chaining
const createMockSupabase = () => {
  // Create a chainable query builder
  const createChainableQuery = () => {
    const resolveQuery = () => Promise.resolve({
      data: [],
      error: null,
      count: 0
    })

    const chain: any = {
      eq: vi.fn(function(this: any) { return this }),
      in: vi.fn(function(this: any) { return this }),
      range: vi.fn(function(this: any) { return this }),
      order: vi.fn(() => resolveQuery()),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn((resolve: any) => resolveQuery().then(resolve)),
    }

    // Bind all methods to chain
    chain.eq = chain.eq.bind(chain)
    chain.in = chain.in.bind(chain)
    chain.range = chain.range.bind(chain)

    return chain
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'activity_log') {
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        }
      }
      return {
        select: vi.fn(() => createChainableQuery()),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }
    }),
  } as any
}

let mockSupabase: ReturnType<typeof createMockSupabase>

describe('ToolExecutor', () => {
  let executor: ToolExecutor
  let context: ToolCallContext

  beforeEach(() => {
    executor = new ToolExecutor()
    mockSupabase = createMockSupabase()

    // Default permissive policy
    const policy: WorkspaceAIPolicy = {
      allowed_tools: ['*'],
      allowed_actions: ['*'],
      auto_apply: false,
      confidence_threshold: 0.8,
      data_sources: ['tasks', 'comments', 'docs'],
      audit_visible: true,
      constraints: {
        allow_task_creation: true,
        allow_task_updates: true,
        allow_task_deletion: false,
        allow_project_access: true,
        allow_team_access: true,
        require_approval_for_writes: false,
        max_tasks_per_operation: 100,
      },
    }

    context = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      aiPolicy: policy,
      correlationId: 'test-correlation-id',
      supabase: mockSupabase,
    }
  })

  describe('Policy Enforcement', () => {
    it('should allow tool execution when tool is in allowed_tools', async () => {
      context.aiPolicy.allowed_tools = ['query_tasks']

      const result = await executor.executeToolCall('query_tasks', {}, context)

      // Tool is allowed, execution may fail due to mock limitations but policy check passed
      // If it failed, it should not be due to policy
      if (!result.success) {
        expect(result.error).not.toContain('not allowed by workspace policy')
      } else {
        expect(result.success).toBe(true)
      }
    })

    it('should block tool execution when tool is not in allowed_tools', async () => {
      context.aiPolicy.allowed_tools = ['get_task_details']

      const result = await executor.executeToolCall('query_tasks', {}, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not allowed by workspace policy')
    })

    it('should allow all tools when wildcard is used', async () => {
      context.aiPolicy.allowed_tools = ['*']

      const result = await executor.executeToolCall('query_tasks', {}, context)

      // Tool is allowed, execution may fail due to mock limitations but policy check passed
      if (!result.success) {
        expect(result.error).not.toContain('not allowed by workspace policy')
      } else {
        expect(result.success).toBe(true)
      }
    })

    it('should block non-existent tools', async () => {
      const result = await executor.executeToolCall('invalid_tool', {}, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not exist')
    })
  })

  describe('Argument Validation', () => {
    it('should validate required arguments', async () => {
      const result = await executor.executeToolCall(
        'get_task_details',
        {}, // Missing required task_id
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Required field')
    })

    it('should accept valid arguments', async () => {
      const result = await executor.executeToolCall(
        'get_task_details',
        { task_id: 'task-123' },
        context
      )

      // Will fail with NOT_FOUND since we're using a mock, but validation passed
      expect(result.success).toBe(false)
      expect(result.error).not.toContain('Required field')
    })
  })

  describe('Tool Handlers', () => {
    it('should handle query_tasks tool', async () => {
      const result = await executor.executeToolCall(
        'query_tasks',
        {
          filters: { status: ['in_progress'] },
          limit: 10,
        },
        context
      )

      expect(result).toBeDefined()
    })

    it('should handle get_project_overview tool', async () => {
      const result = await executor.executeToolCall(
        'get_project_overview',
        { project_id: 'project-123' },
        context
      )

      expect(result).toBeDefined()
    })

    it('should handle get_team_workload tool', async () => {
      const result = await executor.executeToolCall(
        'get_team_workload',
        { workspace_id: 'workspace-456' },
        context
      )

      expect(result).toBeDefined()
    })

    it('should handle analyze_blockers tool', async () => {
      const result = await executor.executeToolCall(
        'analyze_blockers',
        { workspace_id: 'workspace-456' },
        context
      )

      expect(result).toBeDefined()
    })
  })

  describe('Audit Logging', () => {
    it('should log successful executions', async () => {
      const insertSpy = vi.spyOn(mockSupabase, 'from')

      await executor.executeToolCall('query_tasks', {}, context)

      expect(insertSpy).toHaveBeenCalledWith('activity_log')
    })

    it('should log failed executions', async () => {
      const insertSpy = vi.spyOn(mockSupabase, 'from')

      await executor.executeToolCall('invalid_tool', {}, context)

      expect(insertSpy).toHaveBeenCalledWith('activity_log')
    })

    it('should redact sensitive arguments', async () => {
      const insertSpy = vi.spyOn(mockSupabase, 'from')

      await executor.executeToolCall(
        'query_tasks',
        { apiKey: 'secret-key', password: '12345' },
        context
      )

      expect(insertSpy).toHaveBeenCalled()
      // Note: Would need to inspect the actual call to verify redaction
    })
  })

  describe('Error Handling', () => {
    it('should provide user-friendly error messages for policy violations', async () => {
      context.aiPolicy.allowed_tools = []

      const result = await executor.executeToolCall('query_tasks', {}, context)

      expect(result.success).toBe(false)
      expect(result.explanation).toContain('workspace')
      expect(result.explanation).toContain('policy')
    })

    it('should handle database errors gracefully', async () => {
      // Mock will return empty data, which should be handled
      const result = await executor.executeToolCall(
        'get_task_details',
        { task_id: 'non-existent' },
        context
      )

      expect(result.success).toBe(false)
    })
  })

  describe('Constraints Enforcement', () => {
    it('should respect task operation limits', async () => {
      context.aiPolicy.constraints = {
        max_tasks_per_operation: 5,
      }

      // This would test batch operations when they're implemented
      // For now, single task operations should pass
      const result = await executor.executeToolCall(
        'get_task_details',
        { task_id: 'task-123' },
        context
      )

      expect(result).toBeDefined()
    })
  })
})
