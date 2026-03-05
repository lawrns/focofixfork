import { AIService } from '@/lib/services/ai-service'
import { instantiateTemplateWorkflow } from '@/lib/n8n/templates/render'
import { listWorkflowTemplates } from '@/lib/n8n/templates/registry'
import type { N8nWorkflowTemplate } from '@/lib/n8n/templates/types'
import type {
  WorkflowAugmentation,
  WorkflowAugmentationId,
  WorkflowProposalDraft,
} from './types'

const SUPPORTED_NODE_PREFIXES = [
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.wait',
  'n8n-nodes-base.set',
]

export const ALLOWED_AUGMENTATIONS: WorkflowAugmentation[] = [
  {
    id: 'wait_backoff',
    title: 'Add backoff wait',
    description: 'Insert a short wait after the trigger before external calls to reduce burst risk.',
    category: 'control',
  },
  {
    id: 'payload_snapshot',
    title: 'Capture normalized payload',
    description: 'Add a shaping node to normalize trigger data before downstream calls.',
    category: 'quality',
  },
  {
    id: 'callback_audit',
    title: 'Add callback audit',
    description: 'Append an app callback node so the workflow emits a final audit event back into the platform.',
    category: 'callback',
  },
]

type ProjectPlannerInput = {
  project: {
    id: string
    name: string
    description: string | null
    brief: string | null
    metadata: Record<string, unknown> | null
    delegation_settings: Record<string, unknown> | null
  }
  tasks: Array<{ title?: string | null; description?: string | null; status?: string | null }>
}

type AIPlan = {
  proposals?: Array<{
    template_id?: string
    summary?: string
    rationale?: string
    add_ons?: WorkflowAugmentationId[]
  }>
}

function buildPlannerPrompt(input: ProjectPlannerInput, templates: N8nWorkflowTemplate[]) {
  return [
    'You are proposing project-scoped n8n workflows for internal operators.',
    'Return strict JSON with shape: {"proposals":[{"template_id":"...","summary":"...","rationale":"...","add_ons":["wait_backoff"]}]}',
    'Rules:',
    '- choose between 1 and 3 proposals',
    '- only use template_ids from the provided list',
    '- add_ons may only be wait_backoff, payload_snapshot, callback_audit',
    '- prefer concrete operational value over generic automation',
    '- do not propose arbitrary code, external destinations, or freeform nodes',
    `Project: ${JSON.stringify(input.project)}`,
    `Task summaries: ${JSON.stringify(input.tasks.slice(0, 24))}`,
    `Templates: ${JSON.stringify(templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      owner_agent: template.owner_agent,
      risk_tier: template.risk_tier,
      trigger_type: template.trigger_type,
    })))}`,
  ].join('\n')
}

function keywordScore(template: N8nWorkflowTemplate, haystack: string) {
  const text = `${template.name} ${template.description} ${template.owner_agent} ${template.category}`.toLowerCase()
  return haystack
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .reduce((score, token) => (text.includes(token) ? score + 1 : score), 0)
}

function heuristicPlan(input: ProjectPlannerInput, templates: N8nWorkflowTemplate[]): WorkflowProposalDraft[] {
  const haystack = `${input.project.name} ${input.project.description ?? ''} ${input.project.brief ?? ''} ${input.tasks.map((task) => `${task.title ?? ''} ${task.description ?? ''}`).join(' ')}`.toLowerCase()
  const ranked = [...templates]
    .map((template) => ({ template, score: keywordScore(template, haystack) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)

  return ranked.map(({ template }, index) => {
    const addOns = ALLOWED_AUGMENTATIONS.filter((augmentation) => {
      if (augmentation.id === 'callback_audit') return true
      if (augmentation.id === 'wait_backoff') return template.trigger_type !== 'manual'
      return index === 0
    })
    return buildDraft(template, addOns, input, `Workflow to support ${input.project.name} using ${template.name}.`)
  })
}

function buildDraft(
  template: N8nWorkflowTemplate,
  suggestedAddOns: WorkflowAugmentation[],
  input: ProjectPlannerInput,
  summary: string,
): WorkflowProposalDraft {
  const { workflow } = instantiateTemplateWorkflow(template, {
    workflow_name: `${input.project.name} · ${template.name}`,
  })
  validateWorkflow(template.workflow.nodes)

  return {
    sourceTemplate: template,
    ownerAgent: template.owner_agent,
    riskTier: template.risk_tier,
    summary,
    triggerLabel: template.trigger_type,
    stepLabels: template.workflow.nodes.map((node) => String(node.name ?? node.id ?? 'Step')),
    externalEffects: extractExternalEffects(template),
    suggestedAddOns,
    workflowJson: workflow as Record<string, unknown>,
    metadata: {
      template_description: template.description,
      project_name: input.project.name,
    },
  }
}

function extractExternalEffects(template: N8nWorkflowTemplate): string[] {
  return template.workflow.nodes
    .filter((node) => String(node.type ?? '').includes('httpRequest') || String(node.type ?? '').includes('webhook'))
    .map((node) => String(node.name ?? node.id ?? 'External action'))
}

function validateWorkflow(nodes: Array<Record<string, unknown>>) {
  const unsupported = nodes.filter((node) => {
    const type = String(node.type ?? '')
    return !SUPPORTED_NODE_PREFIXES.includes(type)
  })

  if (unsupported.length > 0) {
    throw new Error(`Unsupported workflow node types: ${unsupported.map((node) => String(node.type ?? 'unknown')).join(', ')}`)
  }
}

function parseAIPlan(raw: string): AIPlan | null {
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1)) as AIPlan
  } catch {
    return null
  }
}

function normalizeAddOns(ids: WorkflowAugmentationId[] | undefined): WorkflowAugmentation[] {
  const safeIds = new Set(ids ?? [])
  return ALLOWED_AUGMENTATIONS.filter((augmentation) => safeIds.has(augmentation.id))
}

export async function generateWorkflowProposals(input: ProjectPlannerInput): Promise<WorkflowProposalDraft[]> {
  const templates = listWorkflowTemplates()
  try {
    const ai = new AIService()
    const response = await ai.generate({
      systemPrompt: 'You are a workflow planner that returns strict JSON only.',
      prompt: buildPlannerPrompt(input, templates),
      temperature: 0.2,
      maxTokens: 1200,
    })

    const parsed = parseAIPlan(response.content)
    const proposals = (parsed?.proposals ?? [])
      .slice(0, 3)
      .map((proposal) => {
        const template = templates.find((item) => item.id === proposal.template_id)
        if (!template) return null
        return buildDraft(
          template,
          normalizeAddOns(proposal.add_ons),
          input,
          proposal.summary?.trim() || `Workflow to support ${input.project.name} using ${template.name}.`,
        )
      })
      .filter((value): value is WorkflowProposalDraft => Boolean(value))

    if (proposals.length > 0) return proposals
  } catch {
    // Fallback to heuristic planning when AI is unavailable or malformed.
  }

  return heuristicPlan(input, templates)
}
