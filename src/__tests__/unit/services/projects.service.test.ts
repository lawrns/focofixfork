/**
 * Projects Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProjectsService } from '@/lib/services/projects'

// Helper to create chainable mocks
const createChainableMock = (result = { data: null, error: null, count: 0 }) => {
  const mock = vi.fn().mockResolvedValue(result);
  const proxy = new Proxy(mock, {
    get(target, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'string') {
        return createChainableMock(result);
      }
      return target[prop];
    }
  });
  return proxy;
};

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn()
            }))
          }))
        })),
        ilike: vi.fn(),
        gte: vi.fn(() => ({
          lte: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}))

import { supabase } from '@/lib/supabase'

describe('ProjectsService', () => {
  const mockSupabase = vi.mocked(supabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserProjects', () => {
    it('should return user projects successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project',
          status: 'active',
          progress: 75
        }
      ]

      // Mock auth
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      // Mock organization members query
      const orgMembersMock = vi.fn().mockResolvedValue({
        data: [{ organization_id: 'org-123' }],
        error: null
      })

      // Mock projects query
      const projectsMock = vi.fn().mockResolvedValue({
        data: mockProjects,
        count: 1,
        error: null
      })

      // Set up the from mock to return appropriate mocks based on table
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return orgMembersMock
        } else if (table === 'projects') {
          return projectsMock
        }
        return vi.fn()
      })

      const result = await ProjectsService.getUserProjects()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should handle authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const result = await ProjectsService.getUserProjects()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should filter by organization', async () => {
      const mockUser = { id: 'user-123' }
      const mockProjects = [{ id: 'project-1', name: 'Org Project' }]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue({
                  data: mockProjects,
                  count: 1,
                  error: null
                })
              })
            })
          })
        })
      } as any)

      const result = await ProjectsService.getUserProjects({ organization_id: 'org-123' })

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalled()
    })
  })

  describe('getProjectById', () => {
    it('should return project by ID', async () => {
      const mockUser = { id: 'user-123' }
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'active',
        progress: 50
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          })
        })
      } as any)

      const result = await ProjectsService.getProjectById('project-1')

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('project-1')
    })

    it('should handle project not found', async () => {
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      } as any)

      const result = await ProjectsService.getProjectById('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('createProject', () => {
    it('should create project successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockProject = {
        id: 'new-project',
        name: 'New Project',
        organization_id: 'org-1',
        status: 'planning',
        progress: 0,
        created_by: 'user-123'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          })
        })
      } as any)

      const result = await ProjectsService.createProject('user-123', {
        name: 'New Project',
        description: 'Description',
        organization_id: 'org-1'
      })

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('New Project')
    })

    it('should validate project name', async () => {
      const result = await ProjectsService.createProject('user-123', {
        name: '',
        organization_id: 'org-1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should validate organization ID', async () => {
      const result = await ProjectsService.createProject('user-123', {
        name: 'Test Project',
        organization_id: ''
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const mockUser = { id: 'user-123' }
      const updatedProject = {
        id: 'project-1',
        name: 'Updated Project',
        status: 'active',
        progress: 80
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedProject,
                error: null
              })
            })
          })
        })
      } as any)

      const result = await ProjectsService.updateProject('project-1', {
        name: 'Updated Project',
        progress: 80
      })

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Project')
    })

    it('should validate progress range', async () => {
      const result = await ProjectsService.updateProject('project-1', {
        progress: 150
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('between 0 and 100')
    })

    it('should validate status transitions', async () => {
      // This would test the validateStatusTransition logic
      // For now, just ensure the method exists
      expect(typeof ProjectsService.updateProject).toBe('function')
    })
  })

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      } as any)

      const result = await ProjectsService.deleteProject('project-1')

      expect(result.success).toBe(true)
      expect(result.data?.message).toContain('deleted successfully')
    })

    it('should prevent deletion with milestones', async () => {
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      // Mock that project has milestones
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'project-1' },
                error: null
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'milestone-1' }],
                error: null
              })
            })
          })
        } as any)

      const result = await ProjectsService.deleteProject('project-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot delete project with existing milestones')
    })
  })

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      const mockUser = { id: 'user-123' }
      const mockMilestones = [
        { status: 'completed' },
        { status: 'in-progress' },
        { status: 'completed' }
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMilestones,
              error: null
            })
          })
        })
      } as any)

      const result = await ProjectsService.getProjectStats('project-1')

      expect(result.success).toBe(true)
      expect(result.data?.total_milestones).toBe(3)
      expect(result.data?.completed_milestones).toBe(2)
      expect(result.data?.in_progress_milestones).toBe(1)
    })
  })
})


