import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateNoDependencyOnSelf,
  validateNoCircularDependency,
  validateNoDependencyConflicts,
  buildDependencyGraph,
  detectCircularPath,
  canCreateDependency,
} from '../task-dependency-validation'

describe('Task Dependency Validation', () => {
  describe('validateNoDependencyOnSelf', () => {
    it('should reject when task depends on itself', () => {
      const taskId = 'task-1'
      const dependsOnId = 'task-1'

      const result = validateNoDependencyOnSelf(taskId, dependsOnId)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('A task cannot depend on itself')
    })

    it('should accept when task depends on different task', () => {
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = validateNoDependencyOnSelf(taskId, dependsOnId)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('detectCircularPath', () => {
    it('should detect simple circular dependency A->B->A', () => {
      const graph = new Map<string, Set<string>>([
        ['task-1', new Set(['task-2'])],
        ['task-2', new Set(['task-1'])],
      ])

      const result = detectCircularPath(graph, 'task-1', 'task-2')

      expect(result).toBe(true)
    })

    it('should detect indirect circular dependency A->B->C->A', () => {
      const graph = new Map<string, Set<string>>([
        ['task-1', new Set(['task-2'])],
        ['task-2', new Set(['task-3'])],
        ['task-3', new Set(['task-1'])],
      ])

      const result = detectCircularPath(graph, 'task-1', 'task-2')

      expect(result).toBe(true)
    })

    it('should detect circular dependency with longer chain A->B->C->D->A', () => {
      const graph = new Map<string, Set<string>>([
        ['task-1', new Set(['task-2'])],
        ['task-2', new Set(['task-3'])],
        ['task-3', new Set(['task-4'])],
        ['task-4', new Set(['task-1'])],
      ])

      const result = detectCircularPath(graph, 'task-1', 'task-2')

      expect(result).toBe(true)
    })

    it('should not detect cycle for linear dependency A->B->C', () => {
      const graph = new Map<string, Set<string>>([
        ['task-1', new Set(['task-2'])],
        ['task-2', new Set(['task-3'])],
        ['task-3', new Set()],
      ])

      const result = detectCircularPath(graph, 'task-1', 'task-2')

      expect(result).toBe(false)
    })

    it('should not detect cycle for DAG with multiple paths', () => {
      const graph = new Map<string, Set<string>>([
        ['task-1', new Set(['task-2', 'task-3'])],
        ['task-2', new Set(['task-4'])],
        ['task-3', new Set(['task-4'])],
        ['task-4', new Set()],
      ])

      const result = detectCircularPath(graph, 'task-1', 'task-2')

      expect(result).toBe(false)
    })

    it('should not detect cycle for diamond dependency', () => {
      const graph = new Map<string, Set<string>>([
        ['task-1', new Set(['task-2', 'task-3'])],
        ['task-2', new Set(['task-4'])],
        ['task-3', new Set(['task-4'])],
        ['task-4', new Set()],
      ])

      const result = detectCircularPath(graph, 'task-1', 'task-2')

      expect(result).toBe(false)
    })
  })

  describe('buildDependencyGraph', () => {
    it('should build empty graph for no dependencies', () => {
      const dependencies: Array<{ work_item_id: string; depends_on_id: string }> = []

      const graph = buildDependencyGraph(dependencies)

      expect(graph.size).toBe(0)
    })

    it('should build graph with single dependency', () => {
      const dependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
      ]

      const graph = buildDependencyGraph(dependencies)

      expect(graph.size).toBe(2)
      expect(graph.get('task-1')).toEqual(new Set(['task-2']))
      expect(graph.get('task-2')).toEqual(new Set())
    })

    it('should build graph with multiple dependencies from same task', () => {
      const dependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-1', depends_on_id: 'task-3' },
      ]

      const graph = buildDependencyGraph(dependencies)

      expect(graph.size).toBe(3)
      expect(graph.get('task-1')).toEqual(new Set(['task-2', 'task-3']))
    })

    it('should build graph with complex dependencies', () => {
      const dependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-1', depends_on_id: 'task-3' },
        { work_item_id: 'task-2', depends_on_id: 'task-4' },
        { work_item_id: 'task-3', depends_on_id: 'task-4' },
      ]

      const graph = buildDependencyGraph(dependencies)

      expect(graph.size).toBe(4)
      expect(graph.get('task-1')).toEqual(new Set(['task-2', 'task-3']))
      expect(graph.get('task-2')).toEqual(new Set(['task-4']))
      expect(graph.get('task-3')).toEqual(new Set(['task-4']))
      expect(graph.get('task-4')).toEqual(new Set())
    })
  })

  describe('validateNoCircularDependency', () => {
    it('should reject direct circular dependency A->B->A', () => {
      const existingDependencies = [
        { work_item_id: 'task-2', depends_on_id: 'task-1' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = validateNoCircularDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('circular dependency')
    })

    it('should reject indirect circular dependency A->B->C->A', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-2', depends_on_id: 'task-3' },
        { work_item_id: 'task-3', depends_on_id: 'task-1' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = validateNoCircularDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('circular dependency')
    })

    it('should reject circular dependency where new dependency closes the loop', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-2', depends_on_id: 'task-3' },
      ]
      const taskId = 'task-3'
      const dependsOnId = 'task-1'

      const result = validateNoCircularDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('circular dependency')
    })

    it('should allow valid linear dependency A->B->C', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-2', depends_on_id: 'task-3' },
      ]
      const taskId = 'task-3'
      const dependsOnId = 'task-4'

      const result = validateNoCircularDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should allow diamond dependency pattern', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-1', depends_on_id: 'task-3' },
        { work_item_id: 'task-2', depends_on_id: 'task-4' },
        { work_item_id: 'task-3', depends_on_id: 'task-4' },
      ]
      const taskId = 'task-5'
      const dependsOnId = 'task-1'

      const result = validateNoCircularDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle empty existing dependencies', () => {
      const existingDependencies: Array<{ work_item_id: string; depends_on_id: string }> = []
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = validateNoCircularDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('validateNoDependencyConflicts', () => {
    it('should reject when dependency already exists', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = validateNoDependencyConflicts(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('This dependency already exists')
    })

    it('should allow new dependency when not already existing', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-3'

      const result = validateNoDependencyConflicts(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should allow empty existing dependencies', () => {
      const existingDependencies: Array<{ work_item_id: string; depends_on_id: string }> = []
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = validateNoDependencyConflicts(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('canCreateDependency', () => {
    it('should return false when task depends on itself', () => {
      const existingDependencies: Array<{ work_item_id: string; depends_on_id: string }> = []
      const taskId = 'task-1'
      const dependsOnId = 'task-1'

      const result = canCreateDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot depend on itself')
    })

    it('should return false when dependency would create circular', () => {
      const existingDependencies = [
        { work_item_id: 'task-2', depends_on_id: 'task-1' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = canCreateDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('circular dependency')
    })

    it('should return false when dependency already exists', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-2'

      const result = canCreateDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('should return true when dependency is valid', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-2', depends_on_id: 'task-3' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-3'

      const result = canCreateDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should perform all validations and report first error', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-1' },
      ]
      const taskId = 'task-1'
      const dependsOnId = 'task-1'

      const result = canCreateDependency(taskId, dependsOnId, existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('Complex Dependency Scenarios', () => {
    it('should handle multi-level complex dependency tree', () => {
      const existingDependencies = [
        { work_item_id: 'task-a', depends_on_id: 'task-b' },
        { work_item_id: 'task-b', depends_on_id: 'task-c' },
        { work_item_id: 'task-c', depends_on_id: 'task-d' },
        { work_item_id: 'task-a', depends_on_id: 'task-e' },
        { work_item_id: 'task-e', depends_on_id: 'task-f' },
      ]

      // Valid: adding task-f depends on task-g
      const result1 = canCreateDependency('task-f', 'task-g', existingDependencies)
      expect(result1.valid).toBe(true)

      // Invalid: adding task-d depends on task-a would create cycle
      const result2 = canCreateDependency('task-d', 'task-a', existingDependencies)
      expect(result2.valid).toBe(false)
      expect(result2.error).toContain('circular')
    })

    it('should detect reverse circular dependency', () => {
      const existingDependencies = [
        { work_item_id: 'task-1', depends_on_id: 'task-2' },
        { work_item_id: 'task-2', depends_on_id: 'task-3' },
      ]

      // Invalid: task-3 depending on task-1 would create cycle
      const result = canCreateDependency('task-3', 'task-1', existingDependencies)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('circular')
    })

    it('should allow multiple independent dependency chains', () => {
      const existingDependencies = [
        // Chain 1: A -> B -> C
        { work_item_id: 'task-a', depends_on_id: 'task-b' },
        { work_item_id: 'task-b', depends_on_id: 'task-c' },
        // Chain 2: X -> Y -> Z
        { work_item_id: 'task-x', depends_on_id: 'task-y' },
        { work_item_id: 'task-y', depends_on_id: 'task-z' },
      ]

      // Valid: connecting chains without creating cycle
      const result = canCreateDependency('task-c', 'task-x', existingDependencies)

      expect(result.valid).toBe(true)
    })
  })
})
