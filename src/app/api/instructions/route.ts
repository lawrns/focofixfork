import { z } from 'zod'
import { wrapRoute } from '@/server/http/wrapRoute'
import { OpenAIProjectManager } from '@/lib/services/openai-project-manager'

const InstructionSchema = z.object({
  body: z.object({
    text: z.string().min(1),
    context: z.record(z.any()).optional()
  }),
  query: z.record(z.any()).optional()
})

export const POST = wrapRoute(InstructionSchema, async ({ input, user }) => {
  const spec = input.body.text
  try {
    const parsed = await OpenAIProjectManager.parseProjectSpecification(spec, user.id)
    const tasks = parsed.tasks.map((t, i) => ({
      id: `${Date.now()}-${i}`,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      milestoneIndex: t.milestone_index,
      dependencies: i > 0 ? [`${Date.now()}-${i-1}`] : []
    }))
    const milestones = parsed.milestones.map((m, i) => ({
      id: `M${i+1}`,
      title: m.title,
      description: m.description,
      deadline: m.deadline,
      priority: m.priority,
      status: m.status
    }))
    const timeline = tasks.map((t, idx) => ({
      taskId: t.id,
      startOffsetDays: Math.max(0, idx - t.milestoneIndex) * 1,
      durationDays: Math.ceil((t.description?.length || 20) / 80)
    }))
    return { project: parsed.project, milestones, tasks, timeline }
  } catch {
    const sentences = spec.split(/\.|\n/).map(s => s.trim()).filter(Boolean)
    const baseProject = { name: sentences[0]?.slice(0, 80) || 'Project', description: spec, status: 'planning', priority: 'medium' }
    const milestones = Array.from({ length: Math.max(2, Math.min(5, Math.ceil(sentences.length/3))) }).map((_, i) => ({
      id: `M${i+1}`,
      title: `Milestone ${i+1}`,
      description: sentences[i] || '',
      deadline: new Date(Date.now() + (i+1)*7*86400000).toISOString().split('T')[0],
      priority: i===0?'high':'medium',
      status: 'green'
    }))
    const tasks = sentences.map((s, i) => ({
      id: `${Date.now()}-${i}`,
      title: s.slice(0, 100),
      description: s,
      priority: i<2?'high':'medium',
      status: 'todo',
      milestoneIndex: Math.min(milestones.length-1, Math.floor(i/2)),
      dependencies: i>0?[`${Date.now()}-${i-1}`]:[]
    }))
    const timeline = tasks.map((t, idx) => ({ taskId: t.id, startOffsetDays: idx, durationDays: 1 }))
    return { project: baseProject, milestones, tasks, timeline }
  }
})
