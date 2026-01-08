import { bench, describe, vi } from 'vitest'
import { OpenAIProjectManager } from '@/lib/services/openai-project-manager'
import * as openai from '@/lib/services/openai'

describe('AI Planning Bench', () => {
  bench('validateParsedProject throughput', async () => {
    const content = JSON.stringify({
      project: { name: 'Bench App', description: 'Benchmark', status: 'planning', priority: 'medium', start_date: null, due_date: null },
      milestones: Array.from({ length: 5 }).map((_, i) => ({ name: `m${i+1}`, title: `M${i+1}`, description: '', deadline: '2025-12-01', priority: 'high', status: 'green', order: i+1 })),
      tasks: Array.from({ length: 25 }).map((_, i) => ({ milestone_index: i%5, title: `T${i+1}`, description: 'x', status: 'todo', priority: 'medium', estimated_hours: 4, order: i+1 }))
    })
    vi.spyOn(openai.aiService, 'generate').mockResolvedValue({ content })
    await OpenAIProjectManager.parseProjectSpecification('Benchmark app', 'user-1')
  })
})
