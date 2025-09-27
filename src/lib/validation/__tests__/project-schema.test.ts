import { describe, it, expect } from 'vitest'
import {
  validateCreateProject,
  validateUpdateProject,
  validateProject
} from '../schemas/project.schema'

describe('Project Validation Schemas', () => {
  const validProject = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Project',
    description: 'A test project description',
    status: 'active' as const,
    priority: 'medium' as const,
    organization_id: '550e8400-e29b-41d4-a716-446655440001',
    created_by: '550e8400-e29b-41d4-a716-446655440002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  describe('CreateProjectSchema', () => {
    it('should validate valid create project data', () => {
      const createData = {
        name: 'New Project',
        description: 'Project description',
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
      }
      const result = validateCreateProject(createData)
      expect(result.success).toBe(true)
    })

    it('should validate minimal create data', () => {
      const minimalCreate = { name: 'Minimal Project' }
      const result = validateCreateProject(minimalCreate)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = validateCreateProject({ name: '' })
      expect(result.success).toBe(false)
    })

    it('should reject name too short', () => {
      const result = validateCreateProject({ name: 'A' })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateProjectSchema', () => {
    it('should validate valid update data', () => {
      const updateData = {
        name: 'Updated Project Name',
        status: 'completed' as const
      }
      const result = validateUpdateProject(updateData)
      expect(result.success).toBe(true)
    })

    it('should reject empty update', () => {
      const result = validateUpdateProject({})
      expect(result.success).toBe(false)
    })
  })

  describe('ProjectSchema', () => {
    it('should validate complete project object', () => {
      const result = validateProject(validProject)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const invalidProject = { ...validProject, id: 'invalid-uuid' }
      const result = validateProject(invalidProject)
      expect(result.success).toBe(false)
    })
  })
})

