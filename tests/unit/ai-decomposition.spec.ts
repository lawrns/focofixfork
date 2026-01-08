import { describe, it, expect, vi, beforeEach } from 'vitest'
const mockContent = JSON.stringify({
  project: { name: 'Test App', description: 'Build a test app', status: 'planning', priority: 'medium', start_date: null, due_date: null },
  milestones: [ { name: 'm1', title: 'Foundation', description: 'Setup', deadline: '2025-12-01', priority: 'high', status: 'green', order: 1 } ],
  tasks: [ { milestone_index: 0, title: 'Scaffold', description: 'Create project scaffolding', status: 'todo', priority: 'medium', estimated_hours: 8, order: 1 } ]
})
vi.mock('@/lib/services/openai', () => ({ aiService: { generate: async () => ({ content: mockContent }) } }))
import { OpenAIProjectManager } from '@/lib/services/openai-project-manager'

describe('AI Decomposition', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parses specification into structured project', async () => {
    const parsed = await OpenAIProjectManager.parseProjectSpecification('Create a test app', 'user-1')
    expect(parsed.project.name).toBe('Test App')
    expect(parsed.milestones.length).toBeGreaterThan(0)
    expect(parsed.tasks[0].milestone_index).toBe(0)
  })
})
