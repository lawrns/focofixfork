import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'
import type { AgentLane } from '@/lib/agent-ops/types'

const ROOT = process.cwd()
const AGENT_OPS_DIR = path.join(ROOT, 'docs', 'agent-ops')

function laneToFile(lane: AgentLane): string {
  if (lane === 'product_ui') return 'product-ui.md'
  if (lane === 'platform_api') return 'platform-api.md'
  return 'requirements.md'
}

async function safeAppend(filePath: string, block: string): Promise<void> {
  try {
    await mkdir(path.dirname(filePath), { recursive: true })
    await appendFile(filePath, block, { encoding: 'utf8' })
  } catch {
    // Markdown mirroring is best-effort; DB remains the runtime source.
  }
}

export async function appendTaskMirror(input: {
  id: string
  lane: AgentLane
  title: string
  objective: string
  acceptanceCriteria: string[]
  status: string
}): Promise<void> {
  const target = path.join(AGENT_OPS_DIR, 'tasks', laneToFile(input.lane))
  const lines = [
    `\n## ${input.id}`,
    `- title: ${input.title}`,
    `- status: ${input.status}`,
    `- objective: ${input.objective}`,
    '- acceptance_criteria:',
    ...(input.acceptanceCriteria.length > 0
      ? input.acceptanceCriteria.map((item) => `  - ${item}`)
      : ['  - (none)']),
    '',
  ]
  await safeAppend(target, lines.join('\n'))
}

export async function appendMessageMirror(input: {
  id: string
  fromLane: AgentLane
  toLane: AgentLane
  subject: string
  body: string
}): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)
  const fileName = `${date}-${input.id}.md`
  const target = path.join(AGENT_OPS_DIR, 'messages', fileName)
  const content = [
    `# Message ${input.id}`,
    `- from: ${input.fromLane}`,
    `- to: ${input.toLane}`,
    `- subject: ${input.subject}`,
    '',
    input.body,
    '',
  ].join('\n')
  await safeAppend(target, content)
}

export async function appendDecisionMirror(input: {
  id: string
  title: string
  decision: string
  rationale: string
  taskId?: string | null
}): Promise<void> {
  const target = path.join(AGENT_OPS_DIR, 'decisions.md')
  const lines = [
    `\n## ${input.id} - ${input.title}`,
    `- decision: ${input.decision}`,
    `- task_id: ${input.taskId ?? 'n/a'}`,
    `- rationale: ${input.rationale}`,
    '',
  ]
  await safeAppend(target, lines.join('\n'))
}
