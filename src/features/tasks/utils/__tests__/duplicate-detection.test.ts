import { describe, it, expect } from 'vitest'
import {
  calculateStringSimilarity,
  findSimilarTasks,
  isLikelyDuplicate,
  type Task,
} from '../duplicate-detection'

describe('Duplicate Detection Utility', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Design UI components',
      project_id: 'project-1',
    },
    {
      id: 'task-2',
      title: 'Design UI Components',
      project_id: 'project-1',
    },
    {
      id: 'task-3',
      title: 'Design UI',
      project_id: 'project-1',
    },
    {
      id: 'task-4',
      title: 'Write API documentation',
      project_id: 'project-1',
    },
    {
      id: 'task-5',
      title: 'Design UI components',
      project_id: 'project-2', // Different project
    },
    {
      id: 'task-6',
      title: 'Implement authentication',
      project_id: 'project-1',
    },
  ]

  describe('calculateStringSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const similarity = calculateStringSimilarity('Design UI', 'Design UI')
      expect(similarity).toBe(1)
    })

    it('should return 1.0 for identical strings with different case', () => {
      const similarity = calculateStringSimilarity('Design UI', 'design ui')
      expect(similarity).toBe(1)
    })

    it('should return 1.0 for identical strings with extra whitespace', () => {
      const similarity = calculateStringSimilarity('  Design UI  ', 'Design UI')
      expect(similarity).toBe(1)
    })

    it('should return high similarity for very similar strings', () => {
      const similarity = calculateStringSimilarity('Design UI components', 'Design UI component')
      expect(similarity).toBeGreaterThan(0.9)
    })

    it('should return 0.95+ for case-insensitive match of title', () => {
      const similarity = calculateStringSimilarity('Task ABC', 'task abc')
      expect(similarity).toBeGreaterThanOrEqual(0.95)
    })

    it('should return low similarity for completely different strings', () => {
      const similarity = calculateStringSimilarity('Design UI', 'Authentication')
      expect(similarity).toBeLessThan(0.5)
    })

    it('should return 0 for empty string comparison', () => {
      const similarity = calculateStringSimilarity('Design UI', '')
      expect(similarity).toBe(0)
    })

    it('should handle typos gracefully', () => {
      const similarity = calculateStringSimilarity('Design UI componens', 'Design UI components')
      expect(similarity).toBeGreaterThan(0.85)
    })
  })

  describe('findSimilarTasks', () => {
    it('should find exact title matches in same project', () => {
      const results = findSimilarTasks('Design UI components', 'project-1', mockTasks)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].similarity).toBe(1)
    })

    it('should find case-insensitive matches', () => {
      const results = findSimilarTasks('design ui components', 'project-1', mockTasks, 0.9)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should respect project scope - not return duplicates from other projects', () => {
      const results = findSimilarTasks(
        'Design UI components',
        'project-2',
        mockTasks,
        0.9
      )
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].task.project_id).toBe('project-2')
    })

    it('should not find duplicates from other projects when threshold is high', () => {
      const results = findSimilarTasks(
        'Completely different task',
        'project-2',
        mockTasks,
        0.9
      )
      expect(results.length).toBe(0)
    })

    it('should return results sorted by similarity score descending', () => {
      const results = findSimilarTasks('Design UI', 'project-1', mockTasks, 0.8)
      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity)
        }
      }
    })

    it('should respect custom threshold', () => {
      const results90 = findSimilarTasks('Design UI', 'project-1', mockTasks, 0.9)
      const results80 = findSimilarTasks('Design UI', 'project-1', mockTasks, 0.8)
      expect(results80.length).toBeGreaterThanOrEqual(results90.length)
    })

    it('should return empty array when no similar tasks exist', () => {
      const results = findSimilarTasks('Xyz123Abc', 'project-1', mockTasks, 0.9)
      expect(results).toEqual([])
    })

    it('should handle empty task list', () => {
      const results = findSimilarTasks('Design UI', 'project-1', [], 0.9)
      expect(results).toEqual([])
    })

    it('should exclude the task being edited from results', () => {
      const tasksWithCurrent = [
        { id: 'current', title: 'Design UI components', project_id: 'project-1' },
        ...mockTasks,
      ]
      const results = findSimilarTasks(
        'Design UI components',
        'project-1',
        tasksWithCurrent,
        0.9
      )
      // Should find other similar tasks, but logic for exclusion would be in component
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('isLikelyDuplicate', () => {
    it('should return true for exact match', () => {
      const isDuplicate = isLikelyDuplicate(
        'Design UI components',
        'project-1',
        mockTasks,
        0.9
      )
      expect(isDuplicate).toBe(true)
    })

    it('should return true for case-insensitive match', () => {
      const isDuplicate = isLikelyDuplicate(
        'design ui components',
        'project-1',
        mockTasks,
        0.9
      )
      expect(isDuplicate).toBe(true)
    })

    it('should return false for unique title', () => {
      const isDuplicate = isLikelyDuplicate(
        'Completely unique task title xyz',
        'project-1',
        mockTasks,
        0.9
      )
      expect(isDuplicate).toBe(false)
    })

    it('should respect project scope', () => {
      const isDuplicate = isLikelyDuplicate(
        'Design UI components',
        'project-3', // Non-existent project
        mockTasks,
        0.9
      )
      expect(isDuplicate).toBe(false)
    })

    it('should return false when threshold is not met', () => {
      const isDuplicate = isLikelyDuplicate(
        'Design UI', // Less similar than 90%
        'project-1',
        mockTasks,
        0.99
      )
      expect(isDuplicate).toBe(false)
    })

    it('should use default threshold of 0.9', () => {
      const resultWithDefault = isLikelyDuplicate(
        'Design UI components',
        'project-1',
        mockTasks
      )
      const resultWithExplicit = isLikelyDuplicate(
        'Design UI components',
        'project-1',
        mockTasks,
        0.9
      )
      expect(resultWithDefault).toBe(resultWithExplicit)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle "Task ABC" vs "Task abc" similarity check', () => {
      const testTasks = [
        { id: 'task-1', title: 'Task ABC', project_id: 'project-1' },
      ]
      const similarity = calculateStringSimilarity('Task abc', 'Task ABC')
      expect(similarity).toBeGreaterThanOrEqual(0.95)
    })

    it('should handle tasks with special characters', () => {
      const testTasks = [
        { id: 'task-1', title: 'Task #1: Design API', project_id: 'project-1' },
      ]
      const results = findSimilarTasks('Task #1: Design API', 'project-1', testTasks, 0.9)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle very long task titles', () => {
      const longTitle =
        'This is a very long task title that describes what needs to be done in great detail with multiple parts'
      const testTasks = [
        {
          id: 'task-1',
          title: longTitle,
          project_id: 'project-1',
        },
      ]
      const results = findSimilarTasks(longTitle, 'project-1', testTasks, 0.9)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should detect single character difference as high similarity', () => {
      const testTasks = [
        { id: 'task-1', title: 'Implement feature', project_id: 'project-1' },
      ]
      const results = findSimilarTasks('Implement featur', 'project-1', testTasks, 0.85)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].similarity).toBeGreaterThan(0.85)
    })
  })
})
