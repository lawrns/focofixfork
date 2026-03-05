/**
 * Pipeline dispatcher — sends plan/execute/review phases to ClawdBot.
 * All model calls go through ClawdBot; model names are routing hints only.
 */

import { dispatchToClawdBot } from '@/lib/delegation/dispatchers'

export const PIPELINE_PROMPTS = {
  plan: `You are the orchestration layer for a multi-agent reasoning, debate, and planning system.
Coordinate the selected agents around the request. Agents may be technical specialists, skill specialists, lane-specific operators, or persona advisors.
Preserve meaningful disagreement, synthesize the best direction, and produce an execution-ready plan.

Rules:
- Preserve agent identity. Do not collapse every view into one generic voice.
- Agents should challenge assumptions, reveal missing data, and surface tradeoffs.
- Be globally useful: optimize for clarity, transferability, and practical execution across different teams and installations.
- Do not invent certainty. Call out assumptions, unresolved disagreements, and validation needs.
- Keep the output concise and structured for downstream execution.
- In addition to the rich orchestration output, keep the legacy execution fields populated so implementation can proceed immediately.

Output ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "summary": "one-sentence summary of the recommended path",
  "steps": ["implementation step 1", "implementation step 2"],
  "files_to_modify": ["src/app/..."],
  "risks": ["risk 1"],
  "db_implications": ["implication or empty array"],
  "validation_strategy": "how to verify this works",
  "estimated_complexity": "low|medium|high",
  "problem_frame": {
    "user_request": "string",
    "decision_to_make": "string",
    "desired_outcome": "string",
    "constraints": ["string"],
    "assumptions": ["string"]
  },
  "selected_agents": [
    {
      "id": "string",
      "kind": "system|custom|persona|lane",
      "name": "string",
      "role": "string",
      "expertise": ["string"],
      "incentives": ["string"],
      "risk_model": "string",
      "description": "string"
    }
  ],
  "agent_perspectives": [
    {
      "agent_name": "string",
      "role": "string",
      "perspective": "string",
      "recommendation": "string",
      "reasoning": ["string"],
      "concerns": ["string"],
      "confidence": "low|medium|high"
    }
  ],
  "agent_debate": {
    "challenges": [
      {
        "from_agent": "string",
        "to_agent": "string",
        "challenge": "string",
        "why_it_matters": "string"
      }
    ],
    "revisions": [
      {
        "agent_name": "string",
        "revision": "string"
      }
    ],
    "unresolved_disagreements": ["string"]
  },
  "consolidated_answer": {
    "recommendation": "string",
    "why_this_path_wins": ["string"],
    "points_of_agreement": ["string"],
    "remaining_disagreements": ["string"],
    "uncertainties": ["string"],
    "validation_needed": ["string"]
  },
  "execution_plan": {
    "objective": "string",
    "recommended_approach": "string",
    "steps": [
      {
        "order": 1,
        "action": "string",
        "owner": "string",
        "dependencies": ["string"],
        "output": "string"
      }
    ],
    "risks": [
      {
        "risk": "string",
        "impact": "low|medium|high",
        "mitigation": "string"
      }
    ],
    "open_questions": ["string"],
    "success_criteria": ["string"],
    "immediate_next_actions": ["string"]
  }
}`,

  execute: `You are an expert software engineer. Given the plan and task, produce concrete code patches.
Output ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "summary": "what was implemented",
  "patches": [
    { "file": "src/...", "diff": "unified diff or full file content", "description": "what changed" }
  ],
  "commands_suggested": ["npm install ...", "npx ..."],
  "warnings": ["any caveats"],
  "notes": "implementation notes"
}`,

  review: `You are a principal code reviewer with expertise in security, performance, and architecture.
Review the plan, execution patches, and task context. Extract reusable lessons for the handbook.
Output ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "summary": "overall assessment",
  "critical_issues": ["issue or empty array"],
  "risks": ["risk or empty array"],
  "improvements": ["suggestion"],
  "performance": ["observation"],
  "security": ["observation"],
  "db_observations": ["observation or empty array"],
  "suggested_patches": [{ "file": "src/...", "change": "description of change" }],
  "handbook_additions": [
    {
      "pattern": "Pattern name",
      "lesson": "What to do or avoid",
      "applicable_to": "domain/file type this applies to"
    }
  ],
  "confidence_score": 85
}`,
} as const

export { type PipelinePhase } from './types'

// Determine the callback URL for ClawdBot to POST results back
function getCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://127.0.0.1:3000'
  const normalized = base.startsWith('http') ? base : `https://${base}`
  return `${normalized}/api/pipeline/callback`
}

export async function dispatchPipelinePhase(options: {
  pipelineRunId: string
  phase: 'plan' | 'execute' | 'review'
  preferredModel: string
  taskDescription: string
  context: string
}): Promise<string> {
  const { pipelineRunId, phase, preferredModel, taskDescription, context } = options

  const systemPrompt = PIPELINE_PROMPTS[phase]

  // Embed pipeline routing metadata into the task ID so ClawdBot callback
  // can route back via the callback endpoint.
  const taskId = `pipeline:${pipelineRunId}:${phase}`

  const result = await dispatchToClawdBot({
    taskId,
    title: `[Pipeline:${phase.toUpperCase()}] ${taskDescription.slice(0, 120)}`,
    description: context,
    projectContext: '',
    featureContext: '',
    systemPrompt: `${systemPrompt}\n\n# Preferred Model\n${preferredModel}\n\n# Pipeline Run ID\n${pipelineRunId}\n\n# Phase\n${phase}`,
    agentId: `pipeline-${phase}`,
    callbackUrl: getCallbackUrl(),
  })

  if (!result.success) {
    throw new Error(result.error ?? 'ClawdBot dispatch failed')
  }

  return result.externalRunId ?? taskId
}
